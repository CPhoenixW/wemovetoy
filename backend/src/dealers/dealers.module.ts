import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { DealersController } from "./dealers.controller";
import { DealersService } from "./dealers.service";

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [DealersController],
  providers: [DealersService],
  exports: [DealersService],
})
export class DealersModule {}
