import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversionService,
  DeleteDto,
  ExceptionService,
  ExportExcelDto,
  isActive,
  isInActive,
  OrderEntity,
  ShopInvoiceDto,
  ShopInvoiceEntity,
  ShopInvoiceSearchDto,
  SystemException,
  UserEntity,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class ShopInvoiceService {
  public exportClient: ClientProxy;
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ShopInvoiceEntity)
    private readonly shopInvoiceRepository: Repository<ShopInvoiceEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly configService: ConfigService,
  ) {
    this.exportClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: { url: configService.get('EXPORT_SERVICE_URL') },
    });
  }

  // Get all the shop invoice list
  async findAll(): Promise<ShopInvoiceDto[]> {
    try {
      const invoices = await this.shopInvoiceRepository.find({
        where: { ...isActive },
        relations: ['shopInvoiceDetails'],
      });
      return this.conversionService.toDtos<ShopInvoiceEntity, ShopInvoiceDto>(
        invoices,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Get a single shop invoice by shop invoice object
  async findByObject(
    ShopInvoiceDto: ShopInvoiceDto,
  ): Promise<ShopInvoiceDto[]> {
    try {
      const shopInvoices = await this.shopInvoiceRepository.find({
        where: {
          ...ShopInvoiceDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<ShopInvoiceEntity, ShopInvoiceDto>(
        shopInvoices,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Get Data to Export
  async getShopSalesData(queryParam: ShopInvoiceSearchDto): Promise<any> {
    const id = queryParam.shopId;
    const startDate = queryParam.fromDate;
    const endDate = queryParam.toDate;

    const query = this.shopInvoiceRepository.createQueryBuilder('shop_invoce');
    if (id) {
      query.innerJoinAndSelect('shop_invoce.shop', 'shop', 'shop.id = :id', {
        id,
      });
    }

    query
      .leftJoinAndSelect('shop_invoce.shop', 'shop')
      .leftJoinAndSelect('shop_invoce.order', 'order')
      .leftJoinAndSelect('shop_invoce.billingAddress', 'billingAddress')
      .leftJoinAndSelect('shop_invoce.shippingAddress', 'shippingAddress')
      .andWhere('shop_invoce.shop IS NOT NULL');

    if (startDate) {
      query.andWhere('DATE(shop_invoce.updated_at) >=  :startDate', {
        startDate,
      });
    }

    if (endDate) {
      query.andWhere('DATE(shop_invoce.updated_at) <=  :endDate', {
        endDate,
      });
    }

    query.orderBy('shop_invoce.updatedAt', 'DESC');

    const [merchant, count] = await query.getManyAndCount();
    // console.log(JSON.stringify([merchants, count]));
    const merchants = await this.conversionService.toDtos<
      ShopInvoiceEntity,
      ShopInvoiceDto
    >(merchant);
    return [merchants, count];
  }

  // Send Data To Export Service
  exportData = async (excelDto: ExportExcelDto): Promise<any> => {
    return new Promise((resolve, reject) => {
      this.exportClient
        .send<ExportExcelDto, any>(
          { service: 'export', cmd: 'post', method: 'exportExcel' },
          excelDto,
        )
        // .pipe(timeout(5000))
        .subscribe((exportBuffer) => {
          const buff = Buffer.from(exportBuffer[0].data);
          console.log({ e: buff });
          resolve(buff);
        });
    });
  };

  // Get the paginated list of shop invoice
  async pagination(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    shopInvoiceSearchDto: ShopInvoiceSearchDto,
  ): Promise<[ShopInvoiceDto[], number]> {
    try {
      const query =
        this.shopInvoiceRepository.createQueryBuilder('shop_invoce');
      query
        .leftJoinAndSelect('shop_invoce.shop', 'shop')
        .leftJoinAndSelect('shop.merchant', 'merchant')
        .leftJoinAndSelect('merchant.user', 'user');

      query
        .leftJoinAndSelect('shop_invoce.order', 'order')
        .leftJoinAndSelect('shop_invoce.billingAddress', 'billingAddress')
        .leftJoinAndSelect('shop_invoce.shippingAddress', 'shippingAddress');

      if (
        shopInvoiceSearchDto.shopId &&
        shopInvoiceSearchDto.shopId.length > 0
      ) {
        query.andWhere('shop.id = :shopId', {
          shopId: shopInvoiceSearchDto.shopId,
        });
      }
      if (
        shopInvoiceSearchDto.fromDate &&
        shopInvoiceSearchDto.fromDate.length > 0
      ) {
        query.andWhere('DATE(shop_invoce.updated_at) >=  :startDate', {
          startDate: shopInvoiceSearchDto.fromDate,
        });
      }

      if (
        shopInvoiceSearchDto.toDate &&
        shopInvoiceSearchDto.toDate.length > 0
      ) {
        query.andWhere('DATE(shop_invoce.updated_at) <=  :endDate', {
          endDate: shopInvoiceSearchDto.toDate,
        });
      }
      if (sort === 'name') sort = `shop.name`;
      else sort = `shop_invoce.${sort}`;
      query
        .orderBy(`${sort}`, `${order}`)
        .skip((page - 1) * limit)
        .take(limit);

      const shopInvoices = await query.getManyAndCount();

      return this.conversionService.toPagination<
        ShopInvoiceEntity,
        ShopInvoiceDto
      >(shopInvoices);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Get shop invoice by order id
  async findByOrder(id: string): Promise<ShopInvoiceDto[]> {
    try {
      const order = await this.getOrder(id);
      const shopInvoices = await this.shopInvoiceRepository.find({
        where: {
          order,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<ShopInvoiceEntity, ShopInvoiceDto>(
        shopInvoices,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // // Get shop invoice by user id
  // async findByUser(id: string): Promise<ShopInvoiceDto[]> {
  //   try {
  //     const user = await this.getUser(id);
  //     const shopInvoices = await this.shopInvoiceRepository.find({
  //       where: {
  //         user,
  //         ...isActive,
  //       },
  //     });
  //     return this.conversionService.toDtos<
  //       ShopInvoiceEntity,
  //       ShopInvoiceDto
  //     >(shopInvoices);
  //   } catch (error) {
  //     throw new SystemException(error);
  //   }
  // }

  // Change status of single shop invoice
  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getshopInvoice(id);
      const deleted = await this.shopInvoiceRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Get a single shop invoice by id
  async findById(id: string): Promise<ShopInvoiceDto> {
    try {
      const invoice = await this.getshopInvoice(id);
      return this.conversionService.toDto<ShopInvoiceEntity, ShopInvoiceDto>(
        invoice,
      );
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

  async getshopInvoice(id: string): Promise<ShopInvoiceEntity> {
    const invoice = await this.shopInvoiceRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: [
        'shopInvoiceDetails',
        'shopInvoiceDetails.product',
        'shopInvoiceDetails.productAttribute',
        'billingAddress',
        'shippingAddress',
        'order',
        'shop',
      ],
    });
    this.exceptionService.notFound(invoice, 'Invoice Not Found!!');
    return invoice;
  }
}
