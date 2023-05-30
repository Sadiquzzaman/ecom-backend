import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  ExceptionService,
  InvoiceDetailsEntity,
  InvoiceEntity,
  MarchantInvoiceEntity,
  MerchantEntity,
  MerchantInvoiceDetailsEntity,
  OrderEntity,
  PermissionService,
  ProductAttributeEntity,
  ProductEntity,
  RequestService,
  ResponseService,
  ShopInvoiceEntity,
  TransMasterEntity,
  UserEntity,
} from '@simec/ecom-common';
import { InvoiceController } from './controllers/invoice.controller';
import { MerchantInvoiceController } from './controllers/merchant-invoice.controller';
import { CustomerInvoiceController } from './controllers/customer-invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { MerchantInvoiceService } from './services/merchant-invoice.service';
import { ShopInvoiceService } from './services/shop-invoice.service';
import { AdminInvoiceController } from './controllers/admin-invoice.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvoiceEntity,
      InvoiceDetailsEntity,
      ProductEntity,
      ProductAttributeEntity,
      TransMasterEntity,
      OrderEntity,
      UserEntity,
      MarchantInvoiceEntity,
      MerchantInvoiceDetailsEntity,
      ShopInvoiceEntity,
      MerchantEntity,
    ]),
  ],
  controllers: [
    InvoiceController,
    MerchantInvoiceController,
    CustomerInvoiceController,
    AdminInvoiceController,
  ],
  providers: [
    InvoiceService,
    MerchantInvoiceService,
    ShopInvoiceService,
    RequestService,
    ExceptionService,
    ConversionService,
    ResponseService,
    PermissionService,
  ],
})
export class InvoiceModule {}
