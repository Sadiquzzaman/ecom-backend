import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AddressEntity,
  CartDetailsEntity,
  CartEntity,
  ConversionService,
  CouponEntity,
  CouponUsageEntity,
  CustomerEntity,
  ExceptionService,
  InvoiceDetailsEntity,
  InvoiceEntity,
  MarchantInvoiceEntity,
  OrderDetailsEntity,
  OrderEntity,
  PermissionService,
  ProductAttributeEntity,
  ProductEntity,
  RequestService,
  ResponseService,
  ShipmentEntity,
  ShopEntity,
  ShopInvoiceEntity,
  StockItemTransactionEntity,
  StockPurchaseEntity,
  TransMasterEntity,
  UserEntity,
} from '@simec/ecom-common';
import { CartService } from '../cart/services/cart.service';
import { CustomerOrderController } from './controllers/customer-order.controller';
import { OrderController } from './controllers/order.controller';
import { ProductCountListener } from './listeners/product-count.listener';
import { CustomerOrderService } from './services/customer-order.service';
import { OrderService } from './services/order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderDetailsEntity,
      UserEntity,
      CartEntity,
      InvoiceEntity,
      InvoiceDetailsEntity,
      TransMasterEntity,
      AddressEntity,
      ProductEntity,
      ProductAttributeEntity,
      ShopEntity,
      StockItemTransactionEntity,
      StockPurchaseEntity,
      ShopInvoiceEntity,
      MarchantInvoiceEntity,
      CartDetailsEntity,
      CouponEntity,
      CouponUsageEntity,
      ShipmentEntity,
      CustomerEntity,
    ]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [OrderController, CustomerOrderController],
  providers: [
    OrderService,
    ProductCountListener,
    ConversionService,
    ResponseService,
    ExceptionService,
    RequestService,
    PermissionService,
    CustomerOrderService,
    CartService,
  ],
})
export class OrderModule {}
