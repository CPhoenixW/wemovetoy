import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
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
    return this.ordersService.createOrder(
      request.user.sub,
      request.user.role,
      input,
    );
  }

  @Get()
  @ApiOperation({ summary: "List my orders" })
  findMyOrders(
    @Request() request: AuthenticatedRequest,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.findMyOrders(
      request.user.sub,
      query.page,
      query.pageSize,
    );
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
}
