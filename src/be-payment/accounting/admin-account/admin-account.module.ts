import { Module } from '@nestjs/common';
import { AdminAccountController } from './controller/admin-account.controller';
import { AdminAccountService } from './service/admin-account.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  InvoiceDetailsEntity,
  InvoiceEntity,
  ResponseService,
} from '@simec/ecom-common';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceEntity, InvoiceDetailsEntity])],
  controllers: [AdminAccountController],
  providers: [AdminAccountService, ConversionService, ResponseService],
})
export class AdminAccountModule {}
