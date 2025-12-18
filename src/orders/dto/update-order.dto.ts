import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from '@/orders/dto/create-order.dto';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  id: number;
}
