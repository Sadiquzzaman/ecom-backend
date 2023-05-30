import { Body, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversionService,
  CreateShipmentDto,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  OrderDto,
  OrderEntity,
  OrderStatus,
  ShipmentDto,
  ShipmentEntity,
  ShipmentGroupEntity,
  SystemException,
  CreateShipmetDeliveryAssignmetDto,
  ShipmentDeliveryAssignmentDto,
  ShipmentDeliveryAssignmentEntity,
  RequestService,
  ShopInvoiceEntity,
  ResponseDto,
  ShopSearchDto,
  ShopDto,
  ShopEntity,
  ShipmentAssignmentDeliveryStatusDto,
  ShopInvoiceDto,
  TransporterEntity,
  PermissionService,
  ShippingStatus,
  ShippingStatusUpdateDto,
  MerchantDto,
  MerchantEntity,
} from '@simec/ecom-common';
// import { AssignStatus } from '@simec/ecom-common/dist/enum/assign-status.enum';
import { Repository } from 'typeorm';

@Injectable()
export class MerchantShippingService implements GeneralService<ShipmentDto> {
  constructor(
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepository: Repository<ShipmentEntity>,
    @InjectRepository(ShipmentGroupEntity)
    private readonly shipmentGroupRepository: Repository<ShipmentGroupEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(ShopInvoiceEntity)
    private readonly shopInvoiceRepository: Repository<ShopInvoiceEntity>,
    @InjectRepository(TransporterEntity)
    private readonly transporterRepository: Repository<TransporterEntity>,
    @InjectRepository(ShipmentDeliveryAssignmentEntity)
    private readonly shipmentAssignmentRepository: Repository<ShipmentDeliveryAssignmentEntity>,
    @InjectRepository(ShopEntity)
    private readonly shopRepository: Repository<ShopEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly requestService: RequestService,
    private permissionService: PermissionService,
  ) {}

  // Get the paginated list of confirmed ordres with shop invoice
  async getConfirmedOrderList(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    deliveryManAssignStatus: ShipmentAssignmentDeliveryStatusDto,
  ): Promise<[ShopInvoiceDto[], number]> {
    try {
      const user = this.permissionService.returnRequest();
      if (user.isMerchant === false) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! You are not Merchant.'),
        );
      }

      const userMerchant = await this.getMerchantByUserId(user.userId);

      if (!userMerchant) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! You are not allowed.'),
        );
      }

      const query =
        this.shopInvoiceRepository.createQueryBuilder('shop_invoices');
      query
        .leftJoinAndSelect('shop_invoices.shop', 'shops')
        .leftJoinAndSelect('shop_invoices.order', 'orders')
        .leftJoinAndSelect('shop_invoices.merchant', 'merchants')
        .leftJoinAndSelect('shop_invoices.shippingAddress', 'shippingAddress')
        .where('orders.status = :orderStatus', {
          orderStatus: OrderStatus.Confirmed,
        })
        .andWhere('shop_invoices.assignStatus = :assignStatus', {
          assignStatus: deliveryManAssignStatus.assignStatus,
        })
        .andWhere('merchants.id = :id', { id: userMerchant.id });

      if (deliveryManAssignStatus.assignStatus == '1') {
        query
          .leftJoinAndSelect(
            'shop_invoices.deliveryAssignment',
            'deliveryAssignment',
          )
          .leftJoinAndSelect('deliveryAssignment.transporter', 'transporters')
          .leftJoinAndSelect('transporters.user', 'user');

        if (deliveryManAssignStatus.shippingStatus) {
          query.andWhere(
            'deliveryAssignment.status = :shippingStatus',
            { shippingStatus: deliveryManAssignStatus.shippingStatus },
          );
        }
      }

      if (deliveryManAssignStatus.shopId) {
        query.andWhere('shops.id = :sId', {
          sId: deliveryManAssignStatus.shopId,
        });
      }

      if (deliveryManAssignStatus.fromDate) {
        query.andWhere('DATE(shop_invoices.updated_at) >=  :startDate', {
          startDate: deliveryManAssignStatus.fromDate,
        });
      }

      if (deliveryManAssignStatus.toDate) {
        query.andWhere('DATE(shop_invoices.updated_at) <=  :endDate', {
          endDate: deliveryManAssignStatus.toDate,
        });
      }

      sort === 'createdAt'
        ? (sort = 'orders.createdAt')
        : (sort = 'orders.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);

      const confirmedOrderList = await query.getManyAndCount();

      return this.conversionService.toPagination<
        ShopInvoiceEntity,
        ShopInvoiceDto
      >(confirmedOrderList);
    } catch (error) {
      throw new SystemException(error);
    }
  }

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
          new ForbiddenException(
            'Sorry !!! You are not allowed to Merchant Panel.',
          ),
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
  // Get the paginated list of shop invoice with shippingstatus
  async getInvoicesForTransporters(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    shipmentAssignmentDeliveryStatusDto: ShipmentAssignmentDeliveryStatusDto,
  ): Promise<[ShipmentDeliveryAssignmentDto[], number]> {
    try {
      const query = this.shipmentAssignmentRepository.createQueryBuilder(
        'shipment-delivery-assignment',
      );
      query
        .leftJoinAndSelect(
          'shipment-delivery-assignment.shopInvoice',
          'shopInvoice',
        )
        .leftJoinAndSelect('shipment-delivery-assignment.order', 'orders')
        .leftJoinAndSelect('shipment-delivery-assignment.shop', 'shops')
        .leftJoinAndSelect(
          'shipment-delivery-assignment.transporter',
          'transporter',
        )
        .leftJoinAndSelect('transporter.user', 'user')
        .leftJoinAndSelect(
          'shipment-delivery-assignment.shippingAddress',
          'shippingAddress',
        )
        .where('shipment-delivery-assignment.status=:status', {
          status: shipmentAssignmentDeliveryStatusDto.shippingStatus,
        });

      sort === 'createdAt'
        ? (sort = 'orders.createdAt')
        : (sort = 'orders.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);

      const confirmedOrderList = await query.getManyAndCount();

      return this.conversionService.toPagination<
        ShipmentDeliveryAssignmentEntity,
        ShipmentDeliveryAssignmentDto
      >(confirmedOrderList);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  shopSearchPagination = async (
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    shopSearch: ShopSearchDto,
  ): Promise<[ShopDto[], number]> => {
    try {
      const query = this.shopRepository.createQueryBuilder('shops');
      query
        .where('shops.isActive = :isActive', { ...isActive })
        .andWhere('shops IS NOT NULL');
      if (shopSearch.isApproved) {
        query.andWhere('shops.isApproved = :isApproved', {
          isApproved: shopSearch.isApproved === '1' ? '1' : '0',
        });
      }
      if (shopSearch.name) {
        query.andWhere('lower(shops.name) like :name', {
          name: `%${shopSearch.name.toLowerCase()}%`,
        });
      }
      query
        .orderBy(`shops.${sort}`, order)
        .skip((page - 1) * limit)
        .take(limit);

      const [shops, count] = await query.getManyAndCount();

      // this.exceptionService.notFound(users, 'No merchant found!!');
      const shop = await this.conversionService.toDtos<ShopEntity, ShopDto>(
        shops,
      );
      return [shop, count];
    } catch (error) {
      throw new SystemException(error);
    }
  };

  // async createShipmentDeliveryAssignment(
  //   dto: CreateShipmetDeliveryAssignmetDto,
  // ): Promise<any> {
  //   const query = this.shopInvoiceRepository.createQueryBuilder('shop_invoice');
  //   query
  //     .select('shop_invoice')
  //     .leftJoinAndSelect('shop_invoice.invoice', 'invoices')
  //     .leftJoinAndSelect('invoices.order', 'orders')
  //     .leftJoinAndSelect('shop_invoice.shippingAddress', 'shipping_address')
  //     .leftJoinAndSelect('shop_invoice.shop', 'shop')
  //     .where('shop_invoice.id = :id', { id: dto.shopInvoiceId });

  //   const shopInvoice: ShopInvoiceEntity = await query.getOne();
  //   console.log(dto);
  //   console.log(shopInvoice);
  //   //return Promise.resolve('');

  //   const transpoeter = await this.transporterRepository.findOne({
  //     where: { ...isActive, id: dto.deliveryManId },
  //   });

  //   const newShipmentAssignmentDelivery =
  //     this.requestService.forCreateEntity<ShipmentDeliveryAssignmentEntity>(
  //       new ShipmentDeliveryAssignmentEntity(),
  //     );

  //   shopInvoice.assignStatus = 1;
  //   await this.shopInvoiceRepository.save(shopInvoice);
  //   newShipmentAssignmentDelivery.shopInvoice = shopInvoice;
  //   newShipmentAssignmentDelivery.transporter = transpoeter;

  //   newShipmentAssignmentDelivery.expectedShipmentDate =
  //     dto.expectedShipmentDate;

  //   newShipmentAssignmentDelivery.expectedDeliveryDate = new Date();
  //   newShipmentAssignmentDelivery.assignedAt = new Date();

  //   newShipmentAssignmentDelivery.status = ShippingStatus.ASSIGNED;
  //   newShipmentAssignmentDelivery.order = shopInvoice.invoice.order;
  //   newShipmentAssignmentDelivery.shop = shopInvoice.shop;
  //   newShipmentAssignmentDelivery.shippingAddress = shopInvoice.shippingAddress;
  //   newShipmentAssignmentDelivery.amount = shopInvoice.invoiceTotal;
  //   newShipmentAssignmentDelivery.remark = 'make it nullable';
  //   const createShipmentAssignmentDelivery =
  //     await this.shipmentAssignmentRepository.create(
  //       newShipmentAssignmentDelivery,
  //     );

  //   const savedData = await this.shipmentAssignmentRepository.save(
  //     createShipmentAssignmentDelivery,
  //   );
  //   return this.conversionService.toDto<
  //     ShipmentDeliveryAssignmentEntity,
  //     ShipmentDeliveryAssignmentDto
  //   >(savedData);
  // }

  async getShopInvoiceShippingStatus(orderId: String) {
    const query = this.orderRepository.createQueryBuilder('order');
    query
      .leftJoinAndSelect('order.invoice', 'invoices')
      .leftJoinAndSelect('invoices.shopInvoice', 'shopInvoices')
      .innerJoinAndSelect(
        'shopInvoices.deliveryAssignment',
        'deliveryAssignment',
      )
      .where('order.id = :id', {
        id: orderId,
      });

    const data = await query.getOne();
    return this.conversionService.toDto<OrderEntity, OrderDto>(data);
  }

  async findAll(): Promise<ShipmentDto[]> {
    try {
      const shipments = await this.shipmentRepository.find({
        where: { ...isActive },
        relations: ['shipmentGroup'],
      });
      return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
        shipments,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(dto: ShipmentDto): Promise<ShipmentDto[]> {
    try {
      const shipments = await this.shipmentRepository.find({
        where: {
          ...dto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
        shipments,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
    id: string,
  ): Promise<[ShipmentDto[], number]> {
    try {
      const shipments = await this.shipmentRepository.findAndCount({
        where: { ...isActive, shipmentGroup: id },

        skip: (page - 1) * limit,
        take: limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
      });

      return this.conversionService.toPagination<ShipmentEntity, ShipmentDto>(
        shipments,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByShipmentGroup(id: string): Promise<ShipmentDto[]> {
    try {
      const shipmentGroup = await this.getShipmentGroup(id);

      const shipmentGroups = await this.shipmentRepository.find({
        where: {
          shipmentGroup,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
        shipmentGroups,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  creates = async (dto: CreateShipmentDto): Promise<ShipmentDto[]> => {
    try {
      const shipments: ShipmentEntity[] = [];
      const shipmentGroup = await this.getShipmentGroup(dto.shipmentGroupID);
      for (const shipmentValue of dto.shipmentValue) {
        const dtoToEntity = await this.conversionService.toEntity<
          ShipmentEntity,
          ShipmentDto
        >(dto);
        dtoToEntity.value = shipmentValue.value;
        dtoToEntity.price = shipmentValue.price;
        dtoToEntity.description = shipmentValue.description;
        console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥', dtoToEntity);
        const shipment = this.shipmentRepository.create(dtoToEntity);
        shipment.shipmentGroup = shipmentGroup;
        shipments.push(await this.shipmentRepository.save(shipment));
      }

      return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
        shipments,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  };

  create = async (dto: CreateShipmentDto): Promise<ShipmentDto> => {
    return;
  };

  async update(id: string, dto: CreateShipmentDto): Promise<ShipmentDto> {
    try {
      const shipment = await this.getShipment(id);

      if (dto.shipmentGroupID)
        shipment.shipmentGroup = await this.getShipmentGroup(
          dto.shipmentGroupID,
        );

      console.log('🔥🔥🔥🔥', shipment.shipmentGroup);

      const dtoToEntity = await this.conversionService.toEntity<
        ShipmentEntity,
        ShipmentDto
      >({ ...shipment, ...dto });

      for (const shipment of dto.shipmentValue) {
        dtoToEntity.value = shipment.value;
        dtoToEntity.price = shipment.price;
        dtoToEntity.description = shipment.description;
        dtoToEntity.shipmentGroup.id = dto.shipmentGroupID;
      }

      console.log('🔥🔥🔥🔥', dtoToEntity);

      const updatedShipment = await this.shipmentRepository.save(dtoToEntity, {
        reload: true,
      });
      return this.conversionService.toDto<ShipmentEntity, ShipmentDto>(
        updatedShipment,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<any> {
    try {
      const saveDto = await this.getShipment(id);

      const deleted = await this.shipmentRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string, relation = true): Promise<ShipmentDto> {
    try {
      const shipment = await this.shipmentRepository.findOne({
        where: {
          id,
          ...isActive,
        },
        relations: relation ? ['shipmentGroup'] : [],
      });
      return this.conversionService.toDto<ShipmentEntity, ShipmentDto>(
        shipment,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** relations *************************/
  async getShipment(id: string): Promise<ShipmentEntity> {
    const shipment = await this.shipmentRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(shipment, 'ShipmentGrp Not Found!!');
    return shipment;
  }

  //  Get All Shipment Data
  async getAllShipment(): Promise<ShipmentEntity[]> {
    const shipment = await this.shipmentRepository.find({
      where: {
        ...isActive,
      },
    });
    return shipment;
  }

  async getShipmentGroup(id: string): Promise<ShipmentGroupEntity> {
    const shipmentGrp = await this.shipmentGroupRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(
      shipmentGrp,
      'ShipmentGrp Group Not Found!!',
    );
    return shipmentGrp;
  }
}
