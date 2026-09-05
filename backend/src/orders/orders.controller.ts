import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

interface AuthenticatedRequest {
  user: JwtPayload;
}

@ApiTags("orders")
@ApiBearerAuth()
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: "Create an order from my cart" })
  createOrder(
    @Request() request: AuthenticatedRequest,
    @Body() input: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(request.user.sub, input);
  }

  @Get()
  @ApiOperation({ summary: "List my orders" })
  findMyOrders(@Request() request: AuthenticatedRequest) {
    return this.ordersService.findMyOrders(request.user.sub);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an order by id" })
  findOrder(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.ordersService.findOrderById(
      id,
      request.user.sub,
      request.user.role,
    );
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel my pending order" })
  cancelOrder(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelOrder(id, request.user.sub);
  }

  @Patch(":id/status")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update order status (admin)" })
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, input.status);
  }
}
