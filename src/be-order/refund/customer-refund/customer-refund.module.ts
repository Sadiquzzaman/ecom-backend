import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  CustomerRefundRequestDetailEntity,
  CustomerRefundRequestEntity,
  ExceptionService,
  OrderEntity,
  ProductAttributeEntity,
  ProductEntity,
  RefundApprovalDetailsEntity,
  RefundApprovalEntity,
  RefundReasonEntity,
  RequestService,
  ResponseService,
  ShopInvoiceDetailsEntity,
  ShopInvoiceEntity,
} from '@simec/ecom-common';
import { CustomerRefundController } from '../customer-refund/controllers/customer-refund.controller';
import { AdminRefundController } from './controllers/admin-refund.controller';
import { MerchantRefundController } from './controllers/merchant-refund.controller';
import { AdminRefundService } from './services/admin-refund.service';
import { CustomerRefundService } from './services/customer-refund.service';
import { MerchantRefundService } from './services/merchant-refund.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopInvoiceEntity,
      RefundReasonEntity,
      OrderEntity,
      CustomerRefundRequestEntity,
      CustomerRefundRequestDetailEntity,
      ProductAttributeEntity,
      ProductEntity,
      ShopInvoiceDetailsEntity,
      RefundApprovalEntity,
      RefundApprovalDetailsEntity,
    ]),
  ],
  controllers: [
    CustomerRefundController,
    AdminRefundController,
    MerchantRefundController,
  ],
  providers: [
    ResponseService,
    CustomerRefundService,
    AdminRefundService,
    MerchantRefundService,
    ConversionService,
    ExceptionService,
    RequestService,
  ],
})
export class CustomerRefundModule {}
