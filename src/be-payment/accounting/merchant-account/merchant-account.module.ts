import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantAccountService } from './service/merchant-account.service';
import { MerchantAccountController } from './controller/merchant-account.controller';
import {
  MarchantInvoiceEntity,
  MerchantInvoiceDetailsEntity,
  RequestService,
  ResponseService,
  ExceptionService,
  ConversionService,
} from '@simec/ecom-common';
import { OrderEntity } from '@simec/ecom-common';
import { UserEntity } from '@simec/ecom-common';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarchantInvoiceEntity,
      MerchantInvoiceDetailsEntity,
      OrderEntity,
      UserEntity
    ]),
  ],
  providers: [
    MerchantAccountService,
    RequestService,
    ExceptionService,
    ConversionService,
    ResponseService,
    ExceptionService
  ],
  controllers: [MerchantAccountController],
})
export class MerchantAccountModule {}
