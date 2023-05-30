import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import {
  ConversionService,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  SystemException,
  NotificationDto,
  NotificationEntity,
  MerchantInvoiceSearchDto,
  MarchantInvoiceEntity,
  MerchantInvoiceDto,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class MerchantSalesExportService {
  constructor(
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    @InjectRepository(MarchantInvoiceEntity)
    private readonly merchantInvoiceRepository: Repository<MarchantInvoiceEntity>,
  ) {}

  async getMerchantSalesData(
    queryParam: MerchantInvoiceSearchDto,
  ): Promise<any> {
    const id = queryParam.merchantId;
    const startDate = queryParam.fromDate;
    const endDate = queryParam.toDate;

    const query =
      this.merchantInvoiceRepository.createQueryBuilder('merchant_invoce');
    if (id) {
      query
        .innerJoinAndSelect(
          'merchant_invoce.merchant',
          'merchant',
          'merchant.id = :id',
          { id },
        )
        .leftJoinAndSelect('merchant.user', 'user');
    } else {
      query
        .innerJoinAndSelect('merchant_invoce.merchant', 'merchant')
        .leftJoinAndSelect('merchant.user', 'user');
    }

    query
      .leftJoinAndSelect('merchant_invoce.order', 'order')
      .leftJoinAndSelect('merchant_invoce.billingAddress', 'billingAddress')
      .leftJoinAndSelect('merchant_invoce.shippingAddress', 'shippingAddress')
      .andWhere('merchant_invoce.merchant IS NOT NULL');

    if (startDate) {
      query.andWhere('DATE(merchant_invoce.updated_at) >=  :startDate', {
        startDate,
      });
    }

    if (endDate) {
      query.andWhere('DATE(merchant_invoce.updated_at) <=  :endDate', {
        endDate,
      });
    }

    query.orderBy('merchant_invoce.updatedAt', 'DESC');

    const [merchant, count] = await query.getManyAndCount();
    // console.log(JSON.stringify([merchants, count]));
    const merchants = await this.conversionService.toDtos<
      MarchantInvoiceEntity,
      MerchantInvoiceDto
    >(merchant);
    return [merchants, count];
  }
}
