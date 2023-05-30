import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BankDetailsEntity,
  ConversionService,
  CustomerRefundRequestEntity,
  ExceptionService,
  MerchantEntity,
  MerchantWithdrawalEntity,
  PermissionService,
  RequestService,
  ResponseService,
  ShopInvoiceEntity,
  UserEntity,
} from '@simec/ecom-common';
import { AdminMerchantWithdrawalController } from './controller/admin-merchant-withdrawal.controller';
import { MerchantWithdrawalController } from './controller/merchant-withdrawal.controller';
import { AdminMerchantWithdrawalService } from './service/admin-merchant-withdrawal.service';
import { MerchantWithdrawalService } from './service/merchant-withdrawal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MerchantWithdrawalEntity,
      MerchantEntity,
      UserEntity,
      ShopInvoiceEntity,
      CustomerRefundRequestEntity,
      BankDetailsEntity
    ]),
  ],
  controllers: [
    MerchantWithdrawalController,
    AdminMerchantWithdrawalController,
  ],
  providers: [
    MerchantWithdrawalService,
    AdminMerchantWithdrawalService,
    ConversionService,
    ExceptionService,
    PermissionService,
    RequestService,
    ResponseService,
  ],
})
export class MerchantWithdrawalModule {}
