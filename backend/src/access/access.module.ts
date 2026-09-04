import { Module } from "@nestjs/common";
import { AccessController } from "./access.controller";

@Module({
  controllers: [AccessController],
})
export class AccessModule {}
