import { IsEnum, IsOptional } from "class-validator";
import { OrderStatusList } from "../enum/order.enum";
import { OrderStatus } from "@prisma/client";
import { PaginationDto } from "@/common";

export class OrderPaginationDto extends PaginationDto {
    @IsOptional()
    @IsEnum(OrderStatusList, {
        message: `Status must be one of the following values: PENDING, DELIVERED, CANCELLED`,
    })
    readonly status?: OrderStatus;
}