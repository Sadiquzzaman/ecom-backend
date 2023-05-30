import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  ExceptionService,
  RequestService,
  ResponseService,
  RefundReasonEntity,
} from '@simec/ecom-common';
import { RefundReasonController } from './config/controllers/refund-reason.controller';
import { RefundReasonService } from './config/services/refund-reason.service';

@Module({
  imports: [TypeOrmModule.forFeature([RefundReasonEntity])],
  controllers: [RefundReasonController],
  providers: [
    RefundReasonService,
    ExceptionService,
    ConversionService,
    RequestService,
    ResponseService,
  ],
})
export class RefundModule {}
