import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversionService,
  InvoiceDto,
  InvoiceEntity,
  isActive,
  SystemException,
} from '@simec/ecom-common';

@Injectable()
export class AdminAccountService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,
    private readonly conversionService: ConversionService,
  ) {}

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
  ): Promise<[InvoiceDto[], number]> {
    try {
      const invoices = await this.invoiceRepository.findAndCount({
        where: { ...isActive },
        relations:['invoiceDetails'],
        skip: page > 0 ? (page - 1) * limit : 0,
        take: limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            order !== 'undefined' ? order : 'DESC',
        },
      });

      return this.conversionService.toPagination<InvoiceEntity, InvoiceDto>(
        invoices,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }
}
