import { Type } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class PaginationDto {
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    readonly page?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    readonly limit?: number;
}