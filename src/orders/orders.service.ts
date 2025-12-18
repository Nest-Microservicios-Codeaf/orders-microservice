import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from '@/orders/dto/create-order.dto';
import { PrismaService } from '@/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from '@/config';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, @Inject(NATS_SERVICE) private readonly productClient: ClientProxy) { }
  async create(createOrderDto: CreateOrderDto) {
    try {
      const ids = [...new Set(createOrderDto.items.map(item => item.productId))];

      const products = await firstValueFrom(this.productClient.send({ cmd: 'validate_products' }, ids));

      const totalAmount = createOrderDto.items.reduce((acc, item) => {
        const product = products.find(p => p.id === item.productId);
        return acc + (product.price * item.quantity);
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, item) => acc + item.quantity, 0);

      const orderItemsData = createOrderDto.items.map(item => ({
        price: products.find(p => p.id === item.productId).price,
        productId: item.productId,
        quantity: item.quantity,
      }));

      const order = await this.prisma.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: orderItemsData
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            }
          },
        }
      })

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find(p => p.id === orderItem.productId)?.name,
        })),
      };

    } catch (error) {
      console.error('Error creating order:', error);
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  async findAll(paginationDto: OrderPaginationDto) {
    const totalPage = await this.prisma.order.count({
      where: {
        status: paginationDto.status,
      },
    });

    const currentPage = paginationDto.page ?? 1;
    const perPage = paginationDto.limit ?? 10;

    return {
      data: await this.prisma.order.findMany({
        where: {
          status: paginationDto.status,
        },
        skip: (currentPage - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      meta: {
        total: totalPage,
        page: currentPage,
        lastPage: Math.ceil(totalPage / perPage),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          }
        },
      }
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with ID ${id} not found`,
      })
    }

    const productIds = order.OrderItem.map(item => item.productId);

    const products: any[] = await firstValueFrom(this.productClient.send({ cmd: 'validate_products' }, productIds));

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: products.find(p => p.id === orderItem.productId)?.name,
      })),
    };
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with ID ${id} not found`,
      });
    }

    if (order.status === status) {
      return order;
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: status },
    });
  }
}
