import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminInvoiceSearchDto,
  ConversionService,
  DeleteDto,
  ExceptionService,
  ExportExcelDto,
  InvoiceDetailsEntity,
  InvoiceDto,
  InvoiceEntity,
  isActive,
  isInActive,
  MarchantInvoiceEntity,
  MerchantInvoiceDto,
  MerchantInvoiceSearchDto,
  OrderEntity,
  PermissionService,
  ProductAttributeEntity,
  ProductEntity,
  ShopInvoiceDto,
  ShopInvoiceEntity,
  ShopInvoiceSearchDto,
  SystemException,
  UserEntity,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly exportClient: ClientProxy;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,
    @InjectRepository(InvoiceDetailsEntity)
    private readonly invoiceDetailRepository: Repository<InvoiceDetailsEntity>,
    @InjectRepository(MarchantInvoiceEntity)
    private readonly merchantInvoiceRepository: Repository<MarchantInvoiceEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(ShopInvoiceEntity)
    private readonly shopInvoiceRepository: Repository<ShopInvoiceEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ProductAttributeEntity)
    private readonly productAttributeRepository: Repository<ProductAttributeEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly permissionService: PermissionService,
    private readonly configService: ConfigService,
  ) {
    this.exportClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: { url: configService.get('EXPORT_SERVICE_URL') },
    });
  }

  async findAll(): Promise<InvoiceDto[]> {
    try {
      const invoices = await this.invoiceRepository.find({ ...isActive });
      return this.conversionService.toDtos<InvoiceEntity, InvoiceDto>(invoices);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(invoiceDto: InvoiceDto): Promise<InvoiceDto[]> {
    try {
      const invoices = await this.invoiceRepository.find({
        where: {
          ...invoiceDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<InvoiceEntity, InvoiceDto>(invoices);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Export Excel Data
  async getAdminSalesData(queryParam: AdminInvoiceSearchDto): Promise<any> {
    const customerId = queryParam.customerId;
    const startDate = queryParam.fromDate;
    const endDate = queryParam.toDate;

    const query = this.invoiceRepository.createQueryBuilder('admin_invoce');
    if (customerId) {
      query
        .innerJoinAndSelect('admin_invoce.user', 'user')
        .leftJoinAndSelect(
          'user.customer',
          'customer',
          'customer.id = :customerId',
          {
            customerId,
          },
        );
    }

    query
      .leftJoinAndSelect('admin_invoce.order', 'order')
      .leftJoinAndSelect('admin_invoce.billingAddress', 'billingAddress')
      .leftJoinAndSelect('admin_invoce.shippingAddress', 'shippingAddress')
      .andWhere('admin_invoce.user IS NOT NULL');

    if (startDate) {
      query.andWhere('DATE(admin_invoce.updated_at) >=  :startDate', {
        startDate,
      });
    }

    if (endDate) {
      query.andWhere('DATE(admin_invoce.updated_at) <=  :endDate', {
        endDate,
      });
    }

    query.orderBy('admin_invoce.updatedAt', 'DESC');

    const [merchant, count] = await query.getManyAndCount();
    // console.log(JSON.stringify([merchants, count]));
    const merchants = await this.conversionService.toDtos<
      InvoiceEntity,
      InvoiceDto
    >(merchant);
    return [merchants, count];
  }

  async pagination(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    adminInvoiceSearchDto: AdminInvoiceSearchDto,
  ): Promise<[InvoiceDto[], number]> {
    try {
      const query = this.invoiceRepository.createQueryBuilder('admin_invoce');
      query
        .leftJoinAndSelect('admin_invoce.user', 'user')
        .leftJoinAndSelect('user.customer', 'customer')
        .leftJoinAndSelect('admin_invoce.order', 'order')
        .leftJoinAndSelect('admin_invoce.billingAddress', 'billingAddress')
        .leftJoinAndSelect('admin_invoce.shippingAddress', 'shippingAddress');

      if (
        adminInvoiceSearchDto.customerId &&
        adminInvoiceSearchDto.customerId.length > 0
      ) {
        query.andWhere('customer.id = :customerId', {
          customerId: adminInvoiceSearchDto.customerId,
        });
      }
      if (
        adminInvoiceSearchDto.fromDate &&
        adminInvoiceSearchDto.fromDate.length > 0
      ) {
        query.andWhere('DATE(admin_invoce.updated_at) >=  :startDate', {
          startDate: adminInvoiceSearchDto.fromDate,
        });
      }

      if (
        adminInvoiceSearchDto.toDate &&
        adminInvoiceSearchDto.toDate.length > 0
      ) {
        query.andWhere('DATE(admin_invoce.updated_at) <=  :endDate', {
          endDate: adminInvoiceSearchDto.toDate,
        });
      }
      if (sort === 'customer') sort = `user.firstName`;
      else sort = `admin_invoce.${sort}`;
      query.orderBy(`${sort}`, `${order}`);
      if (limit >= 0) {
        query.skip((page - 1) * limit).take(limit);
      }

      const adminInvoices = await query.getManyAndCount();

      return this.conversionService.toPagination<InvoiceEntity, InvoiceDto>(
        adminInvoices,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }
  // Get the paginated list of shop invoice
  async paginationShopInvoice(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    shopInvoiceSearchDto: ShopInvoiceSearchDto,
  ): Promise<[ShopInvoiceDto[], number]> {
    try {
      const userInfo = await this.permissionService.returnRequest();
      const query =
        this.shopInvoiceRepository.createQueryBuilder('shop_invoce');
      query
        .leftJoinAndSelect('shop_invoce.shop', 'shop')
        .leftJoinAndSelect('shop.shopManagers', 'shopManager')
        .leftJoinAndSelect('shop.merchant', 'merchant')
        .leftJoinAndSelect('merchant.user', 'user');

      query
        .leftJoinAndSelect('shop_invoce.order', 'order')
        .leftJoinAndSelect('shop_invoce.billingAddress', 'billingAddress')
        .leftJoinAndSelect('shop_invoce.shippingAddress', 'shippingAddress');

      if (userInfo.isShopManager === true) {
        query.andWhere('shopManager.id = :shopManagerId', {
          shopManagerId: userInfo.ShopManagerId,
        });
      }
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
      if (sort === 'customer') sort = `user.firstName`;
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

  // Get the paginated list of merchant invoice
  async paginationMerchantInvoice(
    page: number,
    limit: number,
    sort: string,
    order: string,
    merchantInvoiceSearch: MerchantInvoiceSearchDto,
  ): Promise<[MerchantInvoiceDto[], number]> {
    try {
      const id = merchantInvoiceSearch.merchantId;
      const startDate = merchantInvoiceSearch.fromDate;
      const endDate = merchantInvoiceSearch.toDate;

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

      query
        .orderBy('merchant_invoce.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [merchant, count] = await query.getManyAndCount();
      // console.log(JSON.stringify([merchants, count]));
      const merchants = await this.conversionService.toDtos<
        MarchantInvoiceEntity,
        MerchantInvoiceDto
      >(merchant);
      return [merchants, count];
    } catch (error) {
      throw new SystemException(error);
    }
  }

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

  async findByOrder(id: string): Promise<InvoiceDto[]> {
    try {
      const order = await this.getOrder(id);
      const invoices = await this.invoiceRepository.find({
        where: {
          order,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<InvoiceEntity, InvoiceDto>(invoices);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByUser(id: string): Promise<InvoiceDto[]> {
    try {
      const user = await this.getUser(id);
      const invoices = await this.invoiceRepository.find({
        where: {
          user,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<InvoiceEntity, InvoiceDto>(invoices);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getInvoice(id);
      const deleted = await this.invoiceRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string): Promise<InvoiceDto> {
    try {
      const invoice = await this.getInvoice(id);
      return this.conversionService.toDto<InvoiceEntity, InvoiceDto>(invoice);
    } catch (error) {
      throw new SystemException(error);
    }
  }

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

  async getInvoice(id: string): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: [
        'order',
        'user',
        'invoiceDetails',
        'billingAddress',
        'shippingAddress',
        'invoiceDetails.product',
        'invoiceDetails.productAttribute',
      ],
    });
    this.exceptionService.notFound(invoice, 'Invoice Not Found!!');
    return invoice;
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
}
