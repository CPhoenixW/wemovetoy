import { IsEnum, IsOptional, IsString } from "class-validator";
import { OrderStatus } from "@prisma/client";
import { ListOrdersQueryDto } from "./list-orders-query.dto";

export class ListAdminOrdersQueryDto extends ListOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
