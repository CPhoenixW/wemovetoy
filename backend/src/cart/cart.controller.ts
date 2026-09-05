import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { CartService } from "./cart.service";

interface AuthenticatedRequest {
  user: JwtPayload;
}

@ApiTags("cart")
@ApiBearerAuth()
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get my cart" })
  getCart(@Request() request: AuthenticatedRequest) {
    return this.cartService.getCart(request.user.sub);
  }

  @Post("items")
  @ApiOperation({ summary: "Add an item to my cart" })
  addItem(
    @Request() request: AuthenticatedRequest,
    @Body() input: AddToCartDto,
  ) {
    return this.cartService.addItem(
      request.user.sub,
      input.variantId,
      input.quantity,
    );
  }

  @Patch("items/:id")
  @ApiOperation({ summary: "Update a cart item quantity" })
  updateItem(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(request.user.sub, id, input.quantity);
  }

  @Delete("items/:id")
  @ApiOperation({ summary: "Remove an item from my cart" })
  removeItem(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.cartService.removeItem(request.user.sub, id);
  }

  @Delete()
  @ApiOperation({ summary: "Clear my cart" })
  clearCart(@Request() request: AuthenticatedRequest) {
    return this.cartService.clearCart(request.user.sub);
  }
}
