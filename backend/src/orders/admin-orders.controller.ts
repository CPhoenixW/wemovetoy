import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { ListAdminOrdersQueryDto } from "./dto/list-admin-orders-query.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@ApiTags("admin orders")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List all orders (admin)" })
  findAll(@Query() query: ListAdminOrdersQueryDto) {
    return this.ordersService.adminFindAll(
      query.page,
      query.pageSize,
      query.status,
      query.search,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an order with snapshot (admin)" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.ordersService.adminFindById(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update order status (admin)" })
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UpdateOrderStatusDto,
  ) {
    return this.ordersService.adminUpdateStatus(id, input.status);
  }
}
