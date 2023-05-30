import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversionService,
  DeleteDto,
  ExceptionService,
  isActive,
  isInActive,
  MarchantInvoiceEntity,
  MerchantInvoiceDetailsEntity,
  MerchantInvoiceDto,
  OrderEntity,
  ProductAttributeEntity,
  ProductEntity,
  SystemException,
  UserEntity,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class MerchantAccountService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(MarchantInvoiceEntity)
    private readonly merchantInvoiceRepository: Repository<MarchantInvoiceEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
  ) {}

  // Get all the merchant invoice list
  async findAll(): Promise<MerchantInvoiceDto[]> {
    try {
      const invoices = await this.merchantInvoiceRepository.find({
        where: { ...isActive },
        relations: ['marchantInvoiceDetails'],
      });
      return this.conversionService.toDtos<
        MarchantInvoiceEntity,
        MerchantInvoiceDto
      >(invoices);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Get a single merchant invoice by merchant invoice object
  async findByObject(
    merchantInvoiceDto: MerchantInvoiceDto,
  ): Promise<MerchantInvoiceDto[]> {
    try {
      const merchantInvoices = await this.merchantInvoiceRepository.find({
        where: {
          ...merchantInvoiceDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<
        MarchantInvoiceEntity,
        MerchantInvoiceDto
      >(merchantInvoices);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Get the paginated list of merchant invoice
  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
  ): Promise<[MerchantInvoiceDto[], number]> {
    try {
      const merchantInvoices =
        await this.merchantInvoiceRepository.findAndCount({
          where: { ...isActive },
          relations: [
            'order',
            'invoice',
            'marchantInvoiceDetails',
            'merchant',
            'merchant.user',
          ],
          skip: page > 0 ? (page - 1) * limit : 0,
          take: limit,
          order: {
            [sort !== 'undefined' ? sort : 'updatedAt']:
              order !== 'undefined' ? order : 'DESC',
          },
        });

      return this.conversionService.toPagination<
        MarchantInvoiceEntity,
        MerchantInvoiceDto
      >(merchantInvoices);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Get merchant invoice by order id
  async findByOrder(id: string): Promise<MerchantInvoiceDto[]> {
    try {
      const order = await this.getOrder(id);
      const merchantInvoices = await this.merchantInvoiceRepository.find({
        where: {
          order,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<
        MarchantInvoiceEntity,
        MerchantInvoiceDto
      >(merchantInvoices);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // // Get merchant invoice by user id
  // async findByUser(id: string): Promise<MerchantInvoiceDto[]> {
  //   try {
  //     const user = await this.getUser(id);
  //     const merchantInvoices = await this.merchantInvoiceRepository.find({
  //       where: {
  //         user,
  //         ...isActive,
  //       },
  //     });
  //     return this.conversionService.toDtos<
  //       MarchantInvoiceEntity,
  //       MerchantInvoiceDto
  //     >(merchantInvoices);
  //   } catch (error) {
  //     throw new SystemException(error);
  //   }
  // }

  // Change status of single merchant invoice
  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getMerchantInvoice(id);
      const deleted = await this.merchantInvoiceRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Get a single merchant invoice by id
  async findById(id: string): Promise<MerchantInvoiceDto> {
    try {
      const invoice = await this.getMerchantInvoice(id);
      return this.conversionService.toDto<
        MarchantInvoiceEntity,
        MerchantInvoiceDto
      >(invoice);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  //-------------------------supportive functions---------------------------//
  async getOrder(id: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(order, 'Order Not Found!!');
    return order;
  }

  async getUser(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(user, 'User Not Found!!');
    return user;
  }

  async getMerchantInvoice(id: string): Promise<MarchantInvoiceEntity> {
    const invoice = await this.merchantInvoiceRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(invoice, 'Invoice Not Found!!');
    return invoice;
  }
}
