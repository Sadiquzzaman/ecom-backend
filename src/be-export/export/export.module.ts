import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  ExceptionService,
  MarchantInvoiceEntity,
  NotificationEntity,
  RequestService,
  ResponseService,
} from '@simec/ecom-common';
import { AdminSalesExportController } from './controllers/admin-sales-export.controller';
import { AdminSalesExportService } from './services/admin-sales-export.service';
import { ExcelExportController } from './controllers/excel-export.controller';
import { MerchantSalesExportService } from './services/merchant-sales-export.service';
import { ExcelGeneratorService } from './common/services/excel-generator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, MarchantInvoiceEntity]),
  ],
  controllers: [AdminSalesExportController, ExcelExportController],
  exports: [],
  providers: [
    ConversionService,
    ResponseService,
    ExceptionService,
    RequestService,
    AdminSalesExportService,
    MerchantSalesExportService,
    ExcelGeneratorService,
  ],
})
export class ExportModule {}
