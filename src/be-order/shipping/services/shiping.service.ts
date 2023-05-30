import { Body, Injectable } from '@nestjs/common';
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
  InvoiceStatus,
} from '@simec/ecom-common';
// import { AssignStatus } from '@simec/ecom-common/dist/enum/assign-status.enum';
import { Repository } from 'typeorm';

@Injectable()
export class ShippingService implements GeneralService<ShipmentDto> {
  constructor(
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
      const query =
        this.shopInvoiceRepository.createQueryBuilder('shop_invoices');
      query
        .leftJoinAndSelect('shop_invoices.shop', 'shops')
        .leftJoinAndSelect('shop_invoices.order', 'orders')
        .leftJoinAndSelect('shop_invoices.shippingAddress', 'shippingAddress')
        .where('orders.status = :orderStatus', {
          orderStatus: OrderStatus.Confirmed,
        })
        .andWhere('shop_invoices.assignStatus = :assignStatus', {
          assignStatus: deliveryManAssignStatus.assignStatus,
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
        ShopInvoiceEntity,
        ShopInvoiceDto
      >(confirmedOrderList);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async updateShippingStatus(
    id: string,
    dto: ShippingStatusUpdateDto,
  ): Promise<ShipmentDeliveryAssignmentDto> {
    try {
      const shipment = await this.getShippingAssignment(id);
      shipment.status = dto.status;
      if (dto.status === ShippingStatus.DELIVERED) {
        shipment.shopInvoice.status = InvoiceStatus.PAID;
        shipment.deliveredAt = new Date();
      }

      const updatedShipment = await this.shipmentAssignmentRepository.save(
        shipment,
        {
          reload: true,
        },
      );
      return this.conversionService.toDto<
        ShipmentDeliveryAssignmentEntity,
        ShipmentDeliveryAssignmentDto
      >(updatedShipment);
    } catch (error) {
      throw new SystemException(error);
    }
  }
  // Get the paginated list of confirmed ordres with shop invoice
  async getAssignedShopInvoicesForTransporter(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    shipmentAssignmentDeliveryStatusDto: ShipmentAssignmentDeliveryStatusDto,
  ): Promise<[ShipmentDeliveryAssignmentDto[], number]> {
    try {
      const currentUser = this.permissionService.returnRequest();
      console.log(currentUser);

      const query = this.shipmentAssignmentRepository.createQueryBuilder(
        'shipment-delivery-assignment',
      );
      query
        .leftJoinAndSelect(
          'shipment-delivery-assignment.shopInvoice',
          'shopInvoice',
        )
        .leftJoinAndSelect('shipment-delivery-assignment.order', 'orders')
        .leftJoinAndSelect('orders.user', 'users')
        .leftJoinAndSelect('users.customer', 'customers')
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
        .where('orders.status = :orderStatus', {
          orderStatus: OrderStatus.Confirmed,
        })
        .andWhere('shipment-delivery-assignment.status=:status', {
          status: shipmentAssignmentDeliveryStatusDto.shippingStatus,
        })
        .andWhere('user.id = :userId', {
          userId: currentUser.userId,
        });

      if (
        shipmentAssignmentDeliveryStatusDto.shopId &&
        shipmentAssignmentDeliveryStatusDto.shopId.length > 0
      ) {
        query.andWhere('shops.id = :shopId', {
          shopId: shipmentAssignmentDeliveryStatusDto.shopId,
        });
      }

      if (
        shipmentAssignmentDeliveryStatusDto.customerId &&
        shipmentAssignmentDeliveryStatusDto.customerId.length > 0
      ) {
        query.andWhere('customers.id = :customerId', {
          customerId: shipmentAssignmentDeliveryStatusDto.customerId,
        });
      }

      if (shipmentAssignmentDeliveryStatusDto.shippingStatus == 1) {
        console.log(
          'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
          shipmentAssignmentDeliveryStatusDto,
        );
        if (
          shipmentAssignmentDeliveryStatusDto.fromDate &&
          shipmentAssignmentDeliveryStatusDto.fromDate.length > 0
        ) {
          query.andWhere(
            'DATE(shipment-delivery-assignment.expectedShipmentDate) >=  :startDate',
            {
              startDate: shipmentAssignmentDeliveryStatusDto.fromDate,
            },
          );
        }

        if (
          shipmentAssignmentDeliveryStatusDto.toDate &&
          shipmentAssignmentDeliveryStatusDto.toDate.length > 0
        ) {
          query.andWhere(
            'DATE(shipment-delivery-assignment.expectedShipmentDate) <=  :endDate',
            {
              endDate: shipmentAssignmentDeliveryStatusDto.toDate,
            },
          );
        }
      } else if (
        shipmentAssignmentDeliveryStatusDto.shippingStatus == 2 ||
        shipmentAssignmentDeliveryStatusDto.shippingStatus == 3
      ) {
        console.log(
          'SSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
          shipmentAssignmentDeliveryStatusDto,
        );
        if (
          shipmentAssignmentDeliveryStatusDto.fromDate &&
          shipmentAssignmentDeliveryStatusDto.fromDate.length > 0
        ) {
          query.andWhere(
            'DATE(shipment-delivery-assignment.updated_at) >=  :startDate',
            {
              startDate: shipmentAssignmentDeliveryStatusDto.fromDate,
            },
          );
        }

        if (
          shipmentAssignmentDeliveryStatusDto.toDate &&
          shipmentAssignmentDeliveryStatusDto.toDate.length > 0
        ) {
          query.andWhere(
            'DATE(shipment-delivery-assignment.updated_at) <=  :endDate',
            {
              endDate: shipmentAssignmentDeliveryStatusDto.toDate,
            },
          );
        }
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

  async createShipmentDeliveryAssignment(
    dto: CreateShipmetDeliveryAssignmetDto,
  ): Promise<any> {
    const query = this.shopInvoiceRepository.createQueryBuilder('shop_invoice');
    query
      .select('shop_invoice')
      .leftJoinAndSelect('shop_invoice.invoice', 'invoices')
      .leftJoinAndSelect('invoices.order', 'orders')
      .leftJoinAndSelect('shop_invoice.shippingAddress', 'shipping_address')
      .leftJoinAndSelect('shop_invoice.shop', 'shop')
      .where('shop_invoice.id = :id', { id: dto.shopInvoiceId });

    const shopInvoice: ShopInvoiceEntity = await query.getOne();
    // console.log(dto);
    // console.log(shopInvoice);
    //return Promise.resolve('');
    const orderDate = shopInvoice.invoice.order.createAt;
    const expectedDeliveryDate = this.getExpectedDeliveryDate(orderDate);
    console.log('🔥🔥🔥 ', expectedDeliveryDate);
    const transpoeter = await this.transporterRepository.findOne({
      where: { ...isActive, id: dto.deliveryManId },
    });

    const newShipmentAssignmentDelivery =
      this.requestService.forCreateEntity<ShipmentDeliveryAssignmentEntity>(
        new ShipmentDeliveryAssignmentEntity(),
      );

    shopInvoice.assignStatus = 1;
    await this.shopInvoiceRepository.save(shopInvoice);
    newShipmentAssignmentDelivery.shopInvoice = shopInvoice;
    newShipmentAssignmentDelivery.transporter = transpoeter;

    newShipmentAssignmentDelivery.expectedShipmentDate =
      dto.expectedShipmentDate;

    newShipmentAssignmentDelivery.expectedDeliveryDate =
      this.getExpectedDeliveryDate(orderDate);
    newShipmentAssignmentDelivery.assignedAt =
      newShipmentAssignmentDelivery.createAt;

    newShipmentAssignmentDelivery.status = ShippingStatus.ASSIGNED;
    newShipmentAssignmentDelivery.order = shopInvoice.invoice.order;
    newShipmentAssignmentDelivery.shop = shopInvoice.shop;
    newShipmentAssignmentDelivery.shippingAddress = shopInvoice.shippingAddress;
    newShipmentAssignmentDelivery.amount = shopInvoice.invoiceTotal;
    newShipmentAssignmentDelivery.remark = 'make it nullable';
    const createShipmentAssignmentDelivery =
      await this.shipmentAssignmentRepository.create(
        newShipmentAssignmentDelivery,
      );

    const savedData = await this.shipmentAssignmentRepository.save(
      createShipmentAssignmentDelivery,
    );
    return this.conversionService.toDto<
      ShipmentDeliveryAssignmentEntity,
      ShipmentDeliveryAssignmentDto
    >(savedData);
  }

  getExpectedDeliveryDate = (orderDate: Date) => {
    const next7thDay = new Date(
      orderDate.getFullYear(),
      orderDate.getMonth(),
      orderDate.getDate() + 7,
    );
    return next7thDay;
  };

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

  // async findByShipmentGroup(id: string): Promise<ShipmentDto[]> {
  //   try {
  //     const shipmentGroup = await this.getShipmentGroup(id);

  //     const shipmentGroups = await this.shipmentRepository.find({
  //       where: {
  //         shipmentGroup,
  //         ...isActive,
  //       },
  //     });
  //     return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
  //       shipmentGroups,
  //     );
  //   } catch (error) {
  //     throw new SystemException(error);
  //   }
  // }

  creates = async (dto: CreateShipmentDto): Promise<ShipmentDto[]> => {
    // try {
    //   const shipments: ShipmentEntity[] = [];
    //   const shipmentGroup = await this.getShipmentGroup(dto.shipmentGroupID);
    //   for (const shipmentValue of dto.shipmentValue) {
    //     const dtoToEntity = await this.conversionService.toEntity<
    //       ShipmentEntity,
    //       ShipmentDto
    //     >(dto);
    //     dtoToEntity.value = shipmentValue.value;
    //     dtoToEntity.price = shipmentValue.price;
    //     dtoToEntity.description = shipmentValue.description;
    //     console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥', dtoToEntity);
    //     const shipment = this.shipmentRepository.create(dtoToEntity);
    //     shipment.shipmentGroup = shipmentGroup;
    //     shipments.push(await this.shipmentRepository.save(shipment));
    //   }

    //   return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
    //     shipments,
    //   );
    // } catch (error) {
    //   throw new SystemException(error);
    // }
    return [];
  };

  create = async (dto: CreateShipmentDto): Promise<ShipmentDto> => {
    return;
  };

  async update(id: string, dto: CreateShipmentDto): Promise<any> {
    return 'Update';
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

  async getShippingAssignment(
    id: string,
  ): Promise<ShipmentDeliveryAssignmentEntity> {
    const shipmentGrp = await this.shipmentAssignmentRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: ['shopInvoice'],
    });
    this.exceptionService.notFound(
      shipmentGrp,
      'ShipmentGrp Group Not Found!!',
    );
    return shipmentGrp;
  }
}
