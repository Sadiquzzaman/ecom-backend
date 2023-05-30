import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  CustomerRefundRequestEntity,
  ExceptionService,
  OrderEntity,
  PermissionService,
  RefundApprovalDetailsEntity,
  RefundApprovalEntity,
  RefundShipmentAssignmentEntity,
  RequestService,
  ResponseService,
  ShopInvoiceEntity,
  TransporterEntity,
} from '@simec/ecom-common';
import { AdminReturnShippingAssignmentController } from './controllers/admin-return-shipping-assignment.controller';
import { ReturnShippingAssignmentController } from './controllers/return-shipping-assignment.controller';
import { TransporterReturnShippingAssignmentController } from './controllers/transporter-return-shipping-assignment.controller';
import { AdminReturnShippingAssignmentService } from './services/admin-return-shipping-assignment.service';
import { ReturnShippingAssignmentService } from './services/return-shipping-assignment.service';
import { TransporterReturnShippingAssignmentService } from './services/transporter-return-shipping-assignment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopInvoiceEntity,
      RefundShipmentAssignmentEntity,
      OrderEntity,
      CustomerRefundRequestEntity,
      TransporterEntity,
      RefundApprovalEntity,
      RefundApprovalDetailsEntity,
    ]),
  ],
  controllers: [
    ReturnShippingAssignmentController,
    TransporterReturnShippingAssignmentController,
    AdminReturnShippingAssignmentController,
  ],
  providers: [
    ResponseService,
    ReturnShippingAssignmentService,
    TransporterReturnShippingAssignmentService,
    ConversionService,
    ExceptionService,
    RequestService,
    PermissionService,
    AdminReturnShippingAssignmentService,
  ],
})
export class ReturnShippingAssignmentModule {}
