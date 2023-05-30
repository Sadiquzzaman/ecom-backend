import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CartDetailsEntity,
  CartEntity,
  ConversionService,
  CouponEntity,
  CouponUsageEntity,
  CustomerEntity,
  ExceptionService,
  OrderDetailsEntity,
  OrderEntity,
  PermissionService,
  ProductAttributeEntity,
  ProductEntity,
  RequestService,
  ResponseService,
  ShipmentEntity,
  StockItemTransactionEntity,
  StockPurchaseEntity,
  UserEntity,
} from '@simec/ecom-common';
import { CartController } from './controllers/cart.controller';
import { CartService } from './services/cart.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CartEntity,
      CartDetailsEntity,
      OrderEntity,
      OrderDetailsEntity,
      ProductEntity,
      UserEntity,
      CouponEntity,
      CouponUsageEntity,
      ProductAttributeEntity,
      StockPurchaseEntity,
      StockItemTransactionEntity,
      ShipmentEntity,
      CustomerEntity,
    ]),
  ],
  controllers: [CartController],
  providers: [
    CartService,
    ConversionService,
    ResponseService,
    ExceptionService,
    RequestService,
    PermissionService,
  ],
  exports: [CartService],
})
export class CartModule {}
