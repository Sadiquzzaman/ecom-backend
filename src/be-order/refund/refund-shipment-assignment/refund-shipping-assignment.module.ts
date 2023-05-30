import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  CustomerRefundRequestEntity,
  ExceptionService,
  OrderEntity,
  RefundReasonEntity,
  RequestService,
  ResponseService,
  ShopInvoiceEntity,
  RefundShipmentAssignmentEntity,
  TransporterEntity,
  PermissionService,
  RefundApprovalEntity,
} from '@simec/ecom-common';
import { RefundShippingAssignmentController } from '../refund-shipment-assignment/controllers/refund-shipping-assignment.controller';
import { AdminRefundShippingAssignmentController } from './controllers/admin-refund-shipping-assignment.controller';
import { TransporterRefundShippingAssignmentController } from './controllers/transporter-refund-shipping-assignment.controller';
import { AdminRefundShippingAssignmentService } from './services/admin-refund-shipping-assignment.service';
import { RefundShippingAssignmentService } from './services/refund-shipping-assignment.service.deprecated.';
import { TransporterRefundShippingAssignmentService } from './services/transporter-refund-shipping-assignment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopInvoiceEntity,
      RefundShipmentAssignmentEntity,
      OrderEntity,
      CustomerRefundRequestEntity,
      TransporterEntity,
      RefundApprovalEntity,
    ]),
  ],
  controllers: [
    RefundShippingAssignmentController,
    TransporterRefundShippingAssignmentController,
    AdminRefundShippingAssignmentController,
  ],
  providers: [
    ResponseService,
    RefundShippingAssignmentService,
    TransporterRefundShippingAssignmentService,
    ConversionService,
    ExceptionService,
    RequestService,
    PermissionService,
    AdminRefundShippingAssignmentService,
  ],
})
export class RefundShippingAssignmentModule {}
