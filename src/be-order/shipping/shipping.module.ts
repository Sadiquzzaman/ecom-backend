import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  ExceptionService,
  OrderEntity,
  RequestService,
  ResponseService,
  ShipmentEntity,
  ShipmentGroupEntity,
  ShopInvoiceEntity,
  ShipmentDeliveryAssignmentEntity,
  ShopEntity,
  TransporterEntity,
  PermissionService,
  MerchantEntity,
  CustomerEntity,
} from '@simec/ecom-common';
import { AdminShippingController } from './controllers/admin-shipping.controller';
import { MerchantShippingController } from './controllers/merchant-shipping.controller';
import { TransporterShippingController } from './controllers/transporter-shipping.controller';
import { AdminShippingService } from './services/admin-shiping.service';
import { MerchantShippingService } from './services/merchant-shiping.service';
import { ShippingService } from './services/shiping.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShipmentEntity,
      ShipmentGroupEntity,
      OrderEntity,
      ShopInvoiceEntity,
      ShipmentDeliveryAssignmentEntity,
      ShopEntity,
      TransporterEntity,
      MerchantEntity,
      CustomerEntity,
    ]),
  ],
  controllers: [
    AdminShippingController,
    MerchantShippingController,
    TransporterShippingController,
  ],
  providers: [
    ShippingService,
    ExceptionService,
    ConversionService,
    RequestService,
    ResponseService,
    PermissionService,
    AdminShippingService,
    MerchantShippingService,
  ],
})
export class ShippingModule {}
