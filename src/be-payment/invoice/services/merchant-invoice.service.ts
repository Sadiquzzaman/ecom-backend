import { ForbiddenException, Injectable } from '@nestjs/common';
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
  isActive,
  isInActive,
  MarchantInvoiceEntity,
  MerchantInvoiceDto,
  OrderEntity,
  SystemException,
  UserEntity,
  MerchantInvoiceSearchDto,
  PermissionService,
  MerchantSearchDto,
  UserDto,
  MerchantDto,
  MerchantEntity,
  ShopInvoiceSearchDto,
  ShopInvoiceEntity,
  ShopInvoiceDto,
  ExportExcelDto,
} from '@simec/ecom-common';
import { timeout } from 'rxjs/operators';
import { Repository } from 'typeorm';

@Injectable()
export class MerchantInvoiceService {
  private readonly exportClient: ClientProxy;
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(MarchantInvoiceEntity)
    private readonly merchantInvoiceRepository: Repository<MarchantInvoiceEntity>,
    @InjectRepository(ShopInvoiceEntity)
    private readonly shopInvoiceRepository: Repository<ShopInvoiceEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly permissionService: PermissionService,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly configService: ConfigService,
  ) {
    this.exportClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: { url: configService.get('EXPORT_SERVICE_URL') },
    });
  }

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
  async paginationMerchantInv(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    merchantInvoiceSearch: MerchantInvoiceSearchDto,
  ): Promise<[MerchantInvoiceDto[], number]> {
    try {
      const user = this.permissionService.returnRequest();
      if (user.isMerchant === false) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! You are not approved yet. Wait for Approval or contact Admin.'),
        );
      }
      console.log(user);

      const userMerchant = await this.getMerchantByUserId(user.userId);
      if (!userMerchant) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! You are not approved yet. Wait for Approval or contact Admin.'),
        );
      }
      console.log({ userMerchant });

      const startDate = merchantInvoiceSearch.fromDate;
      const endDate = merchantInvoiceSearch.toDate;
      const query =
        this.merchantInvoiceRepository.createQueryBuilder('merchant_invoce');
      query
        .innerJoinAndSelect(
          'merchant_invoce.merchant',
          'merchant',
          'merchant.id = :id ',
          { id: userMerchant.id },
        )
        .leftJoinAndSelect('merchant.user', 'user')
        .leftJoinAndSelect('merchant_invoce.order', 'order')
        .leftJoinAndSelect('merchant_invoce.billingAddress', 'billingAddress')
        .leftJoinAndSelect(
          'merchant_invoce.shippingAddress',
          'shippingAddress',
        );
      // .andWhere('merchant_invoce.merchant IS NOT NULL');

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
        .orderBy(`merchant_invoce.${sort}`, `${order}`)
        // .orderBy('merchant_invoce.updatedAt', 'DESC')
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

  // Get the paginated list of merchant invoice
  async paginationMerchantShopInv(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    shopInvoiceSearchDto: ShopInvoiceSearchDto,
  ): Promise<[ShopInvoiceDto[], number]> {
    try {
      const user = this.permissionService.returnRequest();
      if (user.isMerchant === false) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! You are not Merchant.'),
        );
      }
      console.log(user);

      const userMerchant = await this.getMerchantByUserId(user.userId);
      if (!userMerchant) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! You are allow Merchant Panel.'),
        );
      }
      console.log({ userMerchant });

      const query =
        this.shopInvoiceRepository.createQueryBuilder('shop_invoce');
      query
        .innerJoinAndSelect(
          'shop_invoce.merchant',
          'merchant',
          'merchant.id = :id ',
          { id: userMerchant.id },
        )
        .leftJoinAndSelect('shop_invoce.shop', 'shop')
        .leftJoinAndSelect('merchant.user', 'user')
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

  // Get Data to Export
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

  getMerchantByUserId = async (userId: string): Promise<MerchantDto> => {
    try {
      const query = this.merchantRepository.createQueryBuilder('merchant');
      query
        .innerJoinAndSelect('merchant.user', 'user')
        .where('user.id = :id', { id: userId })
        .andWhere("merchant.isApproved = '1'")
        .andWhere('user.isActive = :isActive', { ...isActive })
        .andWhere('user.merchant IS NOT NULL');

      const userRow = await query.getOne();
      if (!userRow) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! You are not approved yet. Wait for Approval or contact Admin.'),
        );
      }
      // this.exceptionService.notFound(users, 'No merchant found!!');
      const user = await this.conversionService.toDto<
        MerchantEntity,
        MerchantDto
      >(userRow);
      return user;
    } catch (error) {
      throw new SystemException(error);
    }
  };
  merchantUserPagination = async (
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    merchantSearch: MerchantSearchDto,
  ): Promise<[UserDto[], number]> => {
    try {
      const query = this.userRepository.createQueryBuilder('users');
      query
        .innerJoinAndSelect('users.merchant', 'merchant')
        .where('users.isActive = :isActive', { ...isActive })
        .andWhere('users.merchant IS NOT NULL');
      if (merchantSearch.isApproved) {
        query.andWhere('merchant.isApproved = :isApproved', {
          isApproved: merchantSearch.isApproved === '1' ? '1' : '0',
        });
      }
      if (merchantSearch.firstName) {
        query.andWhere('lower(users.firstName) like :fullName', {
          fullName: `%${merchantSearch.firstName.toLowerCase()}%`,
        });
      }
      if (merchantSearch.email) {
        query.andWhere('lower(users.email) like :email', {
          email: `%${merchantSearch.email.toLowerCase()}%`,
        });
      }
      query
        .orderBy(`users.${sort}`, order)
        .skip((page - 1) * limit)
        .take(limit);

      const [users, count] = await query.getManyAndCount();

      // this.exceptionService.notFound(users, 'No merchant found!!');
      const user = await this.conversionService.toDtos<UserEntity, UserDto>(
        users,
      );
      return [user, count];
    } catch (error) {
      throw new SystemException(error);
    }
  };

  isPaginationWithSearchEnable = (
    merchantInvoiceSearch: MerchantInvoiceSearchDto,
  ) => {
    if (
      (merchantInvoiceSearch.merchantId &&
        merchantInvoiceSearch.merchantId.length) ||
      (merchantInvoiceSearch.fromDate &&
        merchantInvoiceSearch.fromDate.length) ||
      (merchantInvoiceSearch.toDate && merchantInvoiceSearch.toDate.length)
    )
      return true;
    else false;
  };

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
      relations: [
        'order',
        'billingAddress',
        'shippingAddress',
        'marchantInvoiceDetails',
        'marchantInvoiceDetails.product',
        'marchantInvoiceDetails.product.shop',
        'marchantInvoiceDetails.productAttribute',
      ],
    });
    this.exceptionService.notFound(invoice, 'Invoice Not Found!!');
    return invoice;
  }
}
