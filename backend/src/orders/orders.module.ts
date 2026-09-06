import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ProductsModule } from "../products/products.module";
import { AdminOrdersController } from "./admin-orders.controller";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [PrismaModule, CartModule, ProductsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
