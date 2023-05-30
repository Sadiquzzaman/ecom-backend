import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport
} from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ActiveStatus,
  AddressEntity,
  Bool,
  CartDetailsEntity,
  CartEntity,
  ChangeOrderStatusDto,
  ConversionService,
  CreateOrderDto,
  DeleteDto,
  ExceptionService,
  GeneralService,
  InvoiceDetailsEntity,
  InvoiceEntity,
  InvoiceStatus,
  isActive,
  isInActive,
  MailFromDto,
  MailParserDto,
  MarchantInvoiceEntity,
  MerchantInvoiceDetailsEntity,
  OrderDetailsEntity,
  OrderDto,
  OrderEntity,
  OrderSearchFilterDto,
  PaymentMethodEnum,
  PermissionService,
  ProductAttributeEntity,
  ProductDto,
  ProductEntity,
  RequestService,
  ShopInvoiceDetailsEntity,
  ShopInvoiceEntity,
  StockItemTransactionEntity,
  StockPurchaseEntity,
  SystemException,
  TransMasterEntity,
  UserDto,
  UserEntity
} from '@simec/ecom-common';
import ejs from 'ejs';
import { EventEmitter2 } from 'eventemitter2';
import path from 'path';
import { timeout } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CartService } from '../../cart/services/cart.service';
import { ProductCountEvent } from '../events/product-count.event';

@Injectable()
export class OrderService implements GeneralService<OrderDto> {
  private readonly searchClient: ClientProxy;
  private readonly notificationClient: ClientProxy;

  private readonly SHIPPING_COST: number = 40.0;
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderDetailsEntity)
    private readonly orderDetailsRepository: Repository<OrderDetailsEntity>,
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ProductAttributeEntity)
    private readonly productAttributeEntityRepository: Repository<ProductAttributeEntity>,
    @InjectRepository(AddressEntity)
    private readonly addressRepository: Repository<AddressEntity>,
    @InjectRepository(InvoiceDetailsEntity)
    private readonly invoiceDetailsRepository: Repository<InvoiceDetailsEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,
    @InjectRepository(TransMasterEntity)
    private readonly transMasterRepository: Repository<TransMasterEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(StockPurchaseEntity)
    private readonly stockPurchaseRepository: Repository<StockPurchaseEntity>,
    @InjectRepository(StockItemTransactionEntity)
    private readonly stockItemTransactionEntityRepository: Repository<StockItemTransactionEntity>,
    @InjectRepository(ShopInvoiceEntity)
    private readonly shopInvoiceRepository: Repository<ShopInvoiceEntity>,
    @InjectRepository(MarchantInvoiceEntity)
    private readonly merchantInvoiceRepository: Repository<MarchantInvoiceEntity>,
    private readonly cartService: CartService,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly requestService: RequestService,
    private readonly permissionService: PermissionService,
    private readonly configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.searchClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        url: this.configService.get('SEARCH_SERVICE_URL'),
      },
    });

    this.notificationClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: { url: configService.get('NOTIFICATION_SERVICE_URL') },
    });
  }

  async findAll(): Promise<OrderDto[]> {
    try {
      const orders = await this.orderRepository.find({ ...isActive });
      return this.conversionService.toDtos<OrderEntity, OrderDto>(orders);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(orderDto: OrderDto): Promise<OrderDto[]> {
    try {
      const orders = await this.orderRepository.find({
        where: {
          ...orderDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<OrderEntity, OrderDto>(orders);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: 'ASC' | 'DESC',
    orderSerarchFilter: OrderSearchFilterDto,
  ): Promise<[OrderDto[], number]> {
    try {
      
      // const where = { ...isActive };
      // if (user && user.isCustomer) {
      //   where['user'] = await this.userRepository.findOne({
      //     where: { ...isActive, id: user.userId },
      //   });
      // }
      // if (orderSerarchFilter.orderStatus != 0) {
      //   where['status'] = orderSerarchFilter.orderStatus;
      // }

      // const orders = await this.orderRepository.findAndCount({
        //   where: { ...where },
        //   skip: (page - 1) * limit,
        //   take: limit,
        //   order: {
          //     [sort !== 'undefined' ? sort : 'updatedAt']:
          //       sort !== 'undefined' ? order : 'DESC',
          //   },
          //   relations: [
      //     'invoice',
      //     'customer',
      //     'customer.user',
      //     'orderDetails',
      //     'orderDetails.product',
      //     'orderDetails.productAttribute',
      //   ],
      // });
      const user = this.permissionService.returnRequest();

      const query = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'user')
        .leftJoinAndSelect('order.invoice', 'invoice')
        .leftJoinAndSelect('order.orderDetails', 'orderDetails')
        .leftJoinAndSelect('orderDetails.product', 'product')
        .leftJoinAndSelect('orderDetails.productAttribute', 'productAttribute');
        // .where('user.id = :userId',{userId:user.CustomerId});

      if (orderSerarchFilter.fromDate) {
        query.andWhere('DATE(order.createAt) >=  :startDate', {
          startDate: orderSerarchFilter.fromDate,
        });
      }
      if (orderSerarchFilter.toDate) {
        query.andWhere('DATE(order.createAt) <= :endDate', {
          endDate: orderSerarchFilter.toDate,
        });
      }

      if (
        orderSerarchFilter?.orderStatus &&
        orderSerarchFilter?.orderStatus > 0
      ) {
        query.andWhere('order.status = :status', {
          status: orderSerarchFilter.orderStatus,
        });
      }

      sort === 'createAt'
        ? (sort = 'order.createAt')
        : (sort = 'order.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);

      const orders = await query.getManyAndCount();

      return this.conversionService.toPagination<OrderEntity, OrderDto>(orders);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // Get the paginated list of confirmed ordres with shop invoice
  // async getConfirmedOrderList(
  //   page: number,
  //   limit: number,
  //   sort = 'updatedAt',
  //   order: 'ASC' | 'DESC' = 'DESC',
  // ): Promise<[OrderDto[], number]> {
  //   try {
  //     const query = this.orderRepository.createQueryBuilder('orders');
  //     query
  //       .leftJoinAndSelect('orders.invoice', 'invoices')
  //       .leftJoinAndSelect('invoices.shopInvoice', 'shop_invoices')
  //       .where('orders.status = :orderStatus', {
  //         orderStatus: OrderStatus.Confirmed,
  //       });

  //     sort === 'createdAt'
  //       ? (sort = 'orders.createdAt')
  //       : (sort = 'orders.updatedAt');

  //     query
  //       .orderBy(sort, order)
  //       .skip((page - 1) * limit)
  //       .take(limit);

  //     const confirmedOrderList = await query.getManyAndCount();

  //     return this.conversionService.toPagination<OrderEntity, OrderDto>(
  //       confirmedOrderList,
  //     );
  //   } catch (error) {
  //     throw new SystemException(error);
  //   }
  // }

  async findByUser(id: string): Promise<OrderDto[]> {
    try {
      const user = await this.getUser(id);
      const orders = await this.orderRepository.find({
        where: {
          user,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<OrderEntity, OrderDto>(orders);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async create(dto: CreateOrderDto): Promise<OrderDto> {
    try {
      const cart = await this.getCart(dto.cartID);
      // Check for Product Quantity Validation
      const productQuantityStatus =
        this.checkCartQuantityWithProductQuantity(cart);
      if (!productQuantityStatus.status) {
        const message =
          'Product Quantity Exceeds for ' + productQuantityStatus.product.name;
        throw new BadRequestException(message);
      }
      const invoice = await this.generateInvoice(dto, cart);
      const order = await this.generateOrder(
        dto,
        cart,
        invoice,
        dto.shippingAddressId,
      );
      invoice.order = order;
      invoice.billingAddress = order.billingAddress;
      invoice.shippingAddress = order.shippingAddress;
      const newInvoiceCreated = await this.invoiceRepository.save(invoice);
      const { id } = await this.generateTransMaster(order, invoice);
      const transMasterData = await this.getTransMasterById(id);
      const shopWiseAdditionalCostData =
        await this.cartService.getShopWiseCalculatedData(cart);
      const merchantWiseAdditionalCostData =
        await this.cartService.getMerchantWiseCalculatedData(cart);
      console.log('🔥🔥🔥', shopWiseAdditionalCostData.shopWiseData);
      console.log('🔥🔥🔥', merchantWiseAdditionalCostData);
      this.generateShopInvoice(
        shopWiseAdditionalCostData.shopWiseData,
        transMasterData,
      );
      this.generateMerchantInvoice(
        merchantWiseAdditionalCostData,
        transMasterData,
      );

      return this.conversionService.toDto<OrderEntity, OrderDto>(
        await this.getOrder(order.id),
      );
    } catch (error) {
      console.log(error);

      throw new SystemException(error);
    }
  }

  async generateInvoice(
    dto: CreateOrderDto,
    cart: CartEntity,
  ): Promise<InvoiceEntity> {
    try {
      const customerInvoice =
        this.requestService.forCreateEntity<InvoiceEntity>(new InvoiceEntity());
      customerInvoice.status = InvoiceStatus.UNPAID;
      customerInvoice.paymentMethod = PaymentMethodEnum.NotSelected;
      customerInvoice.totalDiscount = Number(0);
      customerInvoice.totalShippingCost = Number(0);
      customerInvoice.totalAdditionalShippingCost = cart.additionalShippingCost;
      customerInvoice.invoiceTotal = Number(0);
      customerInvoice.commission = Number(0);
      customerInvoice.invoiceDetails = new Array<InvoiceDetailsEntity>();
      customerInvoice.user = await this.getUser(dto.userID);
      customerInvoice.customer = cart.customer;

      for (const cartDetail of cart.cartDetails) {
        const customerInvoiceDetail =
          this.requestService.forCreateEntity<InvoiceDetailsEntity>(
            new InvoiceDetailsEntity(),
          );
        if (cartDetail.productAttribute) {
          customerInvoiceDetail.price = cartDetail.productAttribute.price;
          customerInvoiceDetail.discount = cartDetail.productAttribute.discount;
          customerInvoiceDetail.totalDiscount =
            cartDetail.productAttribute.discount * cartDetail.quantity;
          customerInvoiceDetail.additionalShippingCost = Number(0);
          customerInvoiceDetail.totalAdditionalShippingCost = Number(0);
        } else {
          customerInvoiceDetail.price = cartDetail.product.price;
          customerInvoiceDetail.discount = cartDetail.product.discount;
          customerInvoiceDetail.totalDiscount =
            cartDetail.product.discount * cartDetail.quantity;
          customerInvoiceDetail.additionalShippingCost = Number(0);
          customerInvoiceDetail.totalAdditionalShippingCost = Number(0);
        }
        customerInvoiceDetail.vat = 0;
        customerInvoiceDetail.quantity = cartDetail.quantity;
        customerInvoiceDetail.product = cartDetail.product;
        customerInvoiceDetail.productAttribute = cartDetail.productAttribute;

        customerInvoiceDetail.grandTotal =
          (customerInvoiceDetail.price +
            customerInvoiceDetail.additionalShippingCost -
            customerInvoiceDetail.discount) *
            customerInvoiceDetail.quantity +
          customerInvoiceDetail.vat;

        customerInvoice.invoiceTotal += Number(
          customerInvoiceDetail.grandTotal,
        );
        customerInvoice.totalDiscount += Number(
          customerInvoiceDetail.totalDiscount,
        );
        // customerInvoice.totalAdditionalShippingCost +=
        //   customerInvoiceDetail.totalAdditionalShippingCost;
        customerInvoice.invoiceDetails.push(customerInvoiceDetail);
      }
      customerInvoice.invoiceTotal += Number(cart.additionalShippingCost);
      const newCustomerInvoice = await this.invoiceRepository.create(
        customerInvoice,
      );
      return this.invoiceRepository.save(newCustomerInvoice);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  generateShopInvoice = async (
    shopWiseAdditonalCost: any[],
    transMasterDataEntity: TransMasterEntity,
  ) => {
    const invoice = transMasterDataEntity.invoice;
    const order = transMasterDataEntity.invoice.order;
    const shopIDs = [];
    const shopProductMap: Map<string, ShopInvoiceEntity> = new Map<
      string,
      ShopInvoiceEntity
    >();
    const invoiceDetails = transMasterDataEntity.invoice.invoiceDetails;

    for (const invoiceDetail of invoiceDetails) {
      const shopID = invoiceDetail.product.shop.id;
      const shopCommissionValue = invoiceDetail.product.shop.commission;

      // Filter unique shop
      if (!shopProductMap.has(shopID)) {
        // Preapaare shop-invoice data
        const shopInvoice =
          this.requestService.forCreateEntity<ShopInvoiceEntity>(
            new ShopInvoiceEntity(),
          );
        shopInvoice.status = invoice.status;
        shopInvoice.paymentMethod = invoice.paymentMethod;
        shopInvoice.totalDiscount = Number(0);
        shopInvoice.totalShippingCost = Number(0);
        shopInvoice.totalAdditionalShippingCost = Number(0);
        shopInvoice.invoiceTotal = Number(0);
        shopInvoice.commission = Number(0);
        shopInvoice.shop = invoiceDetail.product.shop;
        shopInvoice.merchant = invoiceDetail.product.shop.merchant;
        shopInvoice.order = order;
        shopInvoice.invoice = invoice;
        shopInvoice.billingAddress = invoice.billingAddress;
        shopInvoice.shippingAddress = invoice.shippingAddress;
        shopInvoice.customer = invoice.customer;
        shopInvoice.shopInvoiceDetails = new Array<ShopInvoiceDetailsEntity>();
        shopProductMap.set(shopID, shopInvoice);
        shopIDs.push(shopID);
      }

      // Prepare shop-invoice-detail data
      const shopInvoice: ShopInvoiceEntity = shopProductMap.get(shopID);
      const shopInvoiceDetail =
        this.requestService.forCreateEntity<ShopInvoiceDetailsEntity>(
          new ShopInvoiceDetailsEntity(),
        );
      shopInvoiceDetail.price = invoiceDetail.price;
      shopInvoiceDetail.vat = invoiceDetail.vat;
      shopInvoiceDetail.discount = invoiceDetail.discount;
      shopInvoiceDetail.additionalShippingCost =
        invoiceDetail.additionalShippingCost;
      shopInvoiceDetail.quantity = invoiceDetail.quantity;
      shopInvoiceDetail.totalDiscount = invoiceDetail.totalDiscount;
      shopInvoiceDetail.totalAdditionalShippingCost =
        invoiceDetail.totalAdditionalShippingCost;
      shopInvoiceDetail.grandTotal = invoiceDetail.grandTotal;
      // calculate product sales commission
      shopInvoiceDetail.commission =
        invoiceDetail.grandTotal * (shopCommissionValue / 100);
      shopInvoiceDetail.additional = invoiceDetail.additional;
      shopInvoiceDetail.note = invoiceDetail.note;
      shopInvoiceDetail.product = invoiceDetail.product;
      shopInvoiceDetail.productAttribute = invoiceDetail.productAttribute;

      // sum the product sales commission with it's parent shop commission
      shopInvoice.invoiceTotal += Number(invoiceDetail.grandTotal);
      shopInvoice.commission += Number(shopInvoiceDetail.commission);
      // shopInvoice.totalAdditionalShippingCost +=
      //   shopInvoiceDetail.totalAdditionalShippingCost;
      shopInvoice.totalDiscount += Number(shopInvoiceDetail.totalDiscount);
      shopInvoice.shopInvoiceDetails.push(shopInvoiceDetail);
    }

    // Save data to DB
    await Promise.all(
      shopWiseAdditonalCost.map(async (data) => {
        const shopProductInvoice = shopProductMap.get(data.shopId);
        shopProductInvoice.totalAdditionalShippingCost = data.additionalCost;
        shopProductInvoice.invoiceTotal += Number(data.additionalCost);
        const shopInvoiceWithDetails =
          this.shopInvoiceRepository.create(shopProductInvoice);
        await this.shopInvoiceRepository.save(shopInvoiceWithDetails);
      }),
    );
  };

  generateMerchantInvoice = async (
    merchantWiseAdditonalCost: any[],
    transMasterDataEntity: TransMasterEntity,
  ) => {
    // console.log(transMasterDataEntity);
    const invoice = transMasterDataEntity.invoice;
    const order = transMasterDataEntity.invoice.order;
    const merchantProductMap: Map<string, MarchantInvoiceEntity> = new Map<
      string,
      MarchantInvoiceEntity
    >();
    const merchatIDs = [];
    const invoiceDetails = transMasterDataEntity.invoice.invoiceDetails;

    // Filter unique merchant
    for (const invoiceDetail of invoiceDetails) {
      const merchantID = invoiceDetail.product.shop.merchant.id;
      const shopCommissionPercentage = invoiceDetail.product.shop.commission;

      // Prepare merchant-invoice data
      if (!merchantProductMap.has(merchantID)) {
        const merchantInvoice =
          this.requestService.forCreateEntity<MarchantInvoiceEntity>(
            new MarchantInvoiceEntity(),
          );
        merchantInvoice.status = invoice.status;
        merchantInvoice.paymentMethod = invoice.paymentMethod;
        merchantInvoice.totalDiscount = Number(0);
        merchantInvoice.totalShippingCost = Number(0);
        merchantInvoice.totalAdditionalShippingCost = Number(0);
        merchantInvoice.invoiceTotal = Number(0.0);
        merchantInvoice.commission = Number(0);
        merchantInvoice.merchant = invoiceDetail.product.shop.merchant;
        merchantInvoice.order = order;
        merchantInvoice.invoice = invoice;
        merchantInvoice.marchantInvoiceDetails =
          new Array<MerchantInvoiceDetailsEntity>();
        merchantInvoice.billingAddress = invoice.billingAddress;
        merchantInvoice.shippingAddress = invoice.shippingAddress;
        merchantInvoice.customer = invoice.customer;
        merchantProductMap.set(merchantID, merchantInvoice);
        merchatIDs.push(merchantID);
      }

      // Prepare merchant-invoice-detail data
      const merchantInvoice: MarchantInvoiceEntity =
        merchantProductMap.get(merchantID);
      merchantInvoice.invoiceTotal += Number(invoiceDetail.grandTotal);
      const merchantInvoiceDetail =
        this.requestService.forCreateEntity<MerchantInvoiceDetailsEntity>(
          new MerchantInvoiceDetailsEntity(),
        );
      merchantInvoiceDetail.price = invoiceDetail.price;
      merchantInvoiceDetail.vat = invoiceDetail.vat;
      merchantInvoiceDetail.discount = invoiceDetail.discount;
      merchantInvoiceDetail.additionalShippingCost =
        invoiceDetail.additionalShippingCost;
      merchantInvoiceDetail.quantity = invoiceDetail.quantity;
      merchantInvoiceDetail.totalDiscount = Number(invoiceDetail.totalDiscount);
      merchantInvoiceDetail.totalAdditionalShippingCost =
        invoiceDetail.totalAdditionalShippingCost;
      merchantInvoiceDetail.grandTotal = invoiceDetail.grandTotal;
      // calculate product sales commission
      merchantInvoiceDetail.commission =
        invoiceDetail.grandTotal * (shopCommissionPercentage / 100);
      merchantInvoiceDetail.additional = invoiceDetail.additional;
      merchantInvoiceDetail.note = invoiceDetail.note;
      merchantInvoiceDetail.product = invoiceDetail.product;
      merchantInvoiceDetail.productAttribute = invoiceDetail.productAttribute;

      merchantInvoice.totalDiscount += Number(
        merchantInvoiceDetail.totalDiscount,
      );
      // merchantInvoice.totalAdditionalShippingCost += Number(
      //   merchantInvoiceDetail.totalAdditionalShippingCost,
      // );
      // sum the product sales commission with it's parent merchant commission
      merchantInvoice.commission += Number(merchantInvoiceDetail.commission);
      // merchantInvoiceDetail.shop = invoiceDetail.product.shop.id;
      merchantInvoice.marchantInvoiceDetails.push(merchantInvoiceDetail);
    }

    // Save data to DB
    await Promise.all(
      merchantWiseAdditonalCost.map(async (data) => {
        const merchantProductInvoice: MarchantInvoiceEntity =
          merchantProductMap.get(data.merchantId);
        merchantProductInvoice.totalAdditionalShippingCost =
          data.additionalShippingCost;
        merchantProductInvoice.invoiceTotal += Number(
          data.additionalShippingCost,
        );
        const merchantInvoiceWithDetails =
          await this.merchantInvoiceRepository.create(merchantProductInvoice);
        await this.merchantInvoiceRepository.save(merchantInvoiceWithDetails);
      }),
    );
  };

  // async generateOrder(
  //   dto: CreateOrderDto,
  //   cart: CartEntity,
  //   invoice: InvoiceEntity,
  //   shgippingAddressId: string,
  // ): Promise<OrderEntity> {
  //   try {
  //     // const productQuantityStatus =
  //     //   this.checkCartQuantityWithProductQuantity(cart);
  //     // if (!productQuantityStatus.status) {
  //     //   const message =
  //     //     'Product Quantity Exceeds for ' + productQuantityStatus.product.name;
  //     //   throw new BadRequestException(message);
  //     // }
  //     const orderDetails: OrderDetailsEntity[] = [];
  //     for (const cartDetailDto of cart.cartDetails) {
  //       const orderDetailEntity =
  //         this.requestService.forCreateEntity<OrderDetailsEntity>(
  //           new OrderDetailsEntity(),
  //         );
  //       orderDetailEntity.product = cartDetailDto.product;
  //       orderDetailEntity.productAttribute = cartDetailDto.productAttribute;
  //       orderDetailEntity.quantity = cartDetailDto.quantity;

  //       if (cartDetailDto.productAttribute) {
  //         orderDetailEntity.price = cartDetailDto.productAttribute.price;
  //       } else {
  //         orderDetailEntity.price = cartDetailDto.product.price;
  //       }

  //       const orderDetail = await this.orderDetailsRepository.create(
  //         orderDetailEntity,
  //       );
  //       await this.orderDetailsRepository.save(orderDetail);
  //       await this.processStockOrder(cartDetailDto, orderDetail);
  //       orderDetails.push(orderDetail);

  //       // try {
  //       //   this.indexProductSearch(orderDetail.product);
  //       // } catch (error) {
  //       //   // console.log(error);
  //       // }
  //     }

  //     const orderEntity = this.requestService.forCreateEntity<OrderEntity>(
  //       new OrderEntity(),
  //     );

  //     const shippingAddress = await this.addressRepository.findOne({
  //       where: {
  //         id: shgippingAddressId,
  //       },
  //     });

  //     const user = await this.userRepository.findOne({
  //       where: {
  //         id: this.permissionService.returnRequest().userId,
  //       },
  //       relations: ['address'],
  //     });
  //     orderEntity.cart = cart;
  //     orderEntity.invoice = invoice;
  //     orderEntity.orderDetails = orderDetails;
  //     orderEntity.user = await this.getUser(dto.userID);
  //     orderEntity.coupon = cart.coupon;
  //     orderEntity.reference = uuidv4().substring(0, 9);
  //     orderEntity.billingAddress = user.address;
  //     orderEntity.shippingAddress = shippingAddress;
  //     orderEntity.isActive = ActiveStatus.enabled;
  //     orderEntity.customer = cart.customer;
  //     const order = this.orderRepository.create(orderEntity);
  //     await this.orderRepository.save(order);
  //     cart.order = order;
  //     await this.cartRepository.save(cart);
  //     try {
  //       const productCountEvent = new ProductCountEvent();
  //       productCountEvent.orderDetails = orderDetails;
  //       this.eventEmitter.emit('count.popular', productCountEvent);
  //     } catch (error) {
  //       console.log({ error, msg: ' count population ' });
  //     }
  //     return order;
  //   } catch (error) {
  //     console.log({ err: error, msg: '281' });

  //     throw new SystemException(error);
  //   }
  // }

  async generateOrder(
    dto: CreateOrderDto,
    cart: CartEntity,
    invoice: InvoiceEntity,
    shgippingAddressId: string,
  ): Promise<OrderEntity> {
    try {
      // const productQuantityStatus =
      //   this.checkCartQuantityWithProductQuantity(cart);
      // if (!productQuantityStatus.status) {
      //   const message =
      //     'Product Quantity Exceeds for ' + productQuantityStatus.product.name;
      //   throw new BadRequestException(message);
      // }
      const orderDetails: OrderDetailsEntity[] = [];
      for (const cartDetailDto of cart.cartDetails) {
        const orderDetailEntity =
          this.requestService.forCreateEntity<OrderDetailsEntity>(
            new OrderDetailsEntity(),
          );
        orderDetailEntity.product = cartDetailDto.product;
        orderDetailEntity.productAttribute = cartDetailDto.productAttribute;
        orderDetailEntity.quantity = cartDetailDto.quantity;

        if (cartDetailDto.productAttribute) {
          orderDetailEntity.price = cartDetailDto.productAttribute.price;
        } else {
          orderDetailEntity.price = cartDetailDto.product.price;
        }

        const orderDetail = await this.orderDetailsRepository.create(
          orderDetailEntity,
        );
        await this.orderDetailsRepository.save(orderDetail);
        await this.processStockOrder(cartDetailDto, orderDetail);
        orderDetails.push(orderDetail);

        // try {
        //   this.indexProductSearch(orderDetail.product);
        // } catch (error) {
        //   // console.log(error);
        // }
      }

      const orderEntity = this.requestService.forCreateEntity<OrderEntity>(
        new OrderEntity(),
      );

      const shippingAddress = await this.addressRepository.findOne({
        where: {
          id: shgippingAddressId,
        },
      });

      const user = await this.userRepository.findOne({
        where: {
          id: this.permissionService.returnRequest().userId,
        },
        relations: ['address'],
      });
      orderEntity.cart = cart;
      orderEntity.invoice = invoice;
      orderEntity.orderDetails = orderDetails;
      orderEntity.user = await this.getUser(dto.userID);
      orderEntity.coupon = cart.coupon;
      orderEntity.reference = uuidv4().substring(0, 9);
      orderEntity.billingAddress = user.address;
      orderEntity.shippingAddress = shippingAddress;
      orderEntity.isActive = ActiveStatus.enabled;
      orderEntity.customer = cart.customer;
      const order = this.orderRepository.create(orderEntity);
      await this.orderRepository.save(order);
      cart.order = order;
      await this.cartRepository.save(cart);
      try {
        const productCountEvent = new ProductCountEvent();
        productCountEvent.orderDetails = orderDetails;
        this.eventEmitter.emit('count.popular', productCountEvent);
      } catch (error) {
        console.log({ error, msg: ' count population ' });
      }
      return order;
    } catch (error) {
      console.log({ err: error, msg: '281' });

      throw new SystemException(error);
    }
  }

  async getTransMasterById(id: string): Promise<TransMasterEntity> {
    const tmData = await this.transMasterRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: [
        'invoice',
        'invoice.order',
        'invoice.invoiceDetails',
        'invoice.invoiceDetails.product',
        'invoice.invoiceDetails.productAttribute',
        'invoice.invoiceDetails.product.shop',
        'invoice.invoiceDetails.product.shop.merchant',
        'invoice.billingAddress',
        'invoice.shippingAddress',
        'invoice.customer',
      ],
    });
    this.exceptionService.notFound(tmData, 'Transmaster Not Found!!');
    return tmData;
  }

  // async processStockOrder(
  //   cartDetailEntity: CartDetailsEntity,
  //   orderDetailsEntity: OrderDetailsEntity,
  // ): Promise<void> {
  //   try {
  //     // let purchasedPrice = 0.0;
  //     // let sellingPrice = 0.0;
  //     // let inHand = 0;
  //     const qty = orderDetailsEntity.quantity;

  //     // const stockItemTransactionOld =
  //     //   await this.stockItemTransactionEntityRepository.findOne(
  //     //     { cartDetails: cartDetailEntity },
  //     //     { relations: ['stockPurchase'] },
  //     //   );
  //     // const stockPurchaseOld = await this.stockPurchaseRepository.findOne({
  //     //   id: stockItemTransactionOld.stockPurchase.id,
  //     // });
  //     // if (orderDetailsEntity.productAttribute) {
  //     //   purchasedPrice = orderDetailsEntity.productAttribute.purchasedPrice;
  //     //   sellingPrice = orderDetailsEntity.productAttribute.price;
  //     //   inHand = stockPurchaseOld.inHand - orderDetailsEntity.quantity;
  //     // } else {
  //     //   purchasedPrice = orderDetailsEntity.product.purchasedPrice;
  //     //   sellingPrice = orderDetailsEntity.product.price;

  //     //   inHand = stockPurchaseOld.inHand - orderDetailsEntity.quantity;
  //     // }

  //     // console.log({ qty });
  //     // const stockItemTransaction = stockItemTransactionOld;
  //     // stockItemTransaction.updatedAt = new Date();
  //     // stockItemTransaction.updatedBy = orderDetailsEntity.updatedBy;
  //     // stockItemTransaction.purchasingPrice = purchasedPrice;
  //     // stockItemTransaction.sellingPrice = sellingPrice;
  //     // stockItemTransaction.sellingAt = new Date();
  //     // stockItemTransaction.discount = 0.0;
  //     // stockItemTransaction.couponDiscount = 0.0;
  //     // stockItemTransaction.isFreeGift = Bool.No;
  //     // stockItemTransaction.orderDetails = orderDetailsEntity;
  //     // stockItemTransaction.status = StockStatus.SOLD;
  //     // // console.log({ stockItemTransaction });
  //     // const stockItemSave = {
  //     //   ...stockItemTransactionOld,
  //     //   ...stockItemTransaction,
  //     // };
  //     // const stockItemE = await this.stockItemTransactionEntityRepository.save(
  //     //   stockItemSave,
  //     //   {
  //     //     reload: true,
  //     //   },
  //     // );
  //     // const stockPurchase = stockPurchaseOld;
  //     // stockPurchase.updatedAt = new Date();
  //     // stockPurchase.updatedBy = orderDetailsEntity.updatedBy;
  //     // stockPurchase.inHand = inHand;
  //     // stockPurchase.inOrder = qty;
  //     // stockPurchase.inCart = 0;
  //     // stockPurchase.purchasedPrice = purchasedPrice;
  //     // const stockPurchaseE = await this.stockPurchaseRepository.save(
  //     //   stockPurchase,
  //     //   { reload: true },
  //     // );
  //     // // console.log({ stockPurchaseE });

  //     const product = await this.productRepository.findOne({
  //       id: orderDetailsEntity.product.id,
  //     });
  //     const productQtyUpdate = {
  //       quantity: product.quantity - qty,
  //       reserved: product.reserved - qty,
  //       sold: product.sold + qty,
  //     };
  //     // console.log({
  //     //   productQtyUpdateN: { ...product, ...productQtyUpdate },
  //     //   productQtyUpdate,
  //     // });

  //     const updatedProduct = await this.productRepository.update(
  //       { id: product.id },
  //       productQtyUpdate,
  //     );
  //     // console.log({ updatedProduct });
  //     // if (updatedProduct.quantity <= 0) {
  //     //   this.indexProductSearchRemove(updatedProduct.id);
  //     // }

  //     if (orderDetailsEntity.productAttribute) {
  //       const productAttribute =
  //         await this.productAttributeEntityRepository.findOne({
  //           id: orderDetailsEntity.productAttribute.id,
  //         });
  //       const productAttributeQtyUpdate = {
  //         quantity: productAttribute.quantity - orderDetailsEntity.quantity,
  //         sold: productAttribute.sold + qty,
  //         reserved: productAttribute.reserved - qty,
  //       };
  //       // const productAttributeQtyUpdateUpdate =
  //       await this.productAttributeEntityRepository.update(
  //         { id: productAttribute.id },
  //         productAttributeQtyUpdate,
  //       );
  //     }
  //   } catch (error) {
  //     console.log({ error });
  //     throw new SystemException(error);
  //   }
  // }

  async processStockOrder(
    cartDetailEntity: CartDetailsEntity,
    orderDetailsEntity: OrderDetailsEntity,
  ): Promise<void> {
    try {
      // let purchasedPrice = 0.0;
      // let sellingPrice = 0.0;
      // let inHand = 0;
      const qty = orderDetailsEntity.quantity;

      // const stockItemTransactionOld =
      //   await this.stockItemTransactionEntityRepository.findOne(
      //     { cartDetails: cartDetailEntity },
      //     { relations: ['stockPurchase'] },
      //   );
      // const stockPurchaseOld = await this.stockPurchaseRepository.findOne({
      //   id: stockItemTransactionOld.stockPurchase.id,
      // });
      // if (orderDetailsEntity.productAttribute) {
      //   purchasedPrice = orderDetailsEntity.productAttribute.purchasedPrice;
      //   sellingPrice = orderDetailsEntity.productAttribute.price;
      //   inHand = stockPurchaseOld.inHand - orderDetailsEntity.quantity;
      // } else {
      //   purchasedPrice = orderDetailsEntity.product.purchasedPrice;
      //   sellingPrice = orderDetailsEntity.product.price;

      //   inHand = stockPurchaseOld.inHand - orderDetailsEntity.quantity;
      // }

      // console.log({ qty });
      // const stockItemTransaction = stockItemTransactionOld;
      // stockItemTransaction.updatedAt = new Date();
      // stockItemTransaction.updatedBy = orderDetailsEntity.updatedBy;
      // stockItemTransaction.purchasingPrice = purchasedPrice;
      // stockItemTransaction.sellingPrice = sellingPrice;
      // stockItemTransaction.sellingAt = new Date();
      // stockItemTransaction.discount = 0.0;
      // stockItemTransaction.couponDiscount = 0.0;
      // stockItemTransaction.isFreeGift = Bool.No;
      // stockItemTransaction.orderDetails = orderDetailsEntity;
      // stockItemTransaction.status = StockStatus.SOLD;
      // // console.log({ stockItemTransaction });
      // const stockItemSave = {
      //   ...stockItemTransactionOld,
      //   ...stockItemTransaction,
      // };
      // const stockItemE = await this.stockItemTransactionEntityRepository.save(
      //   stockItemSave,
      //   {
      //     reload: true,
      //   },
      // );
      // const stockPurchase = stockPurchaseOld;
      // stockPurchase.updatedAt = new Date();
      // stockPurchase.updatedBy = orderDetailsEntity.updatedBy;
      // stockPurchase.inHand = inHand;
      // stockPurchase.inOrder = qty;
      // stockPurchase.inCart = 0;
      // stockPurchase.purchasedPrice = purchasedPrice;
      // const stockPurchaseE = await this.stockPurchaseRepository.save(
      //   stockPurchase,
      //   { reload: true },
      // );
      // // console.log({ stockPurchaseE });

      const product = await this.productRepository.findOne({
        where: { id: orderDetailsEntity.product.id },
        relations: ['merchant'],
      });
      const productQtyUpdate = {
        quantity: product.quantity - qty,
        reserved: product.reserved - qty,
        sold: product.sold + qty,
      };

      // ToDo: Trigger Mail For Low Stock Quantity
      // console.log({
      //   productQtyUpdateN: { ...product, ...productQtyUpdate },
      //   productQtyUpdate,
      // });

      const updatedProduct = await this.productRepository.update(
        { id: product.id },
        productQtyUpdate,
      );
      // console.log({ updatedProduct });
      // if (updatedProduct.quantity <= 0) {
      //   this.indexProductSearchRemove(updatedProduct.id);
      // }

      if (orderDetailsEntity.productAttribute) {
        const productAttribute =
          await this.productAttributeEntityRepository.findOne({
            id: orderDetailsEntity.productAttribute.id,
          });
        const productAttributeQtyUpdate = {
          quantity: productAttribute.quantity - orderDetailsEntity.quantity,
          sold: productAttribute.sold + qty,
          reserved: productAttribute.reserved - qty,
        };

        if (productAttributeQtyUpdate.quantity <= product.lowStockThreshold) {
          console.log(product.lowStockThreshold);

          const user = await this.userRepository.findOne({
            where: {
              merchant: product.merchant,
            },
            relations: ['merchant'],
          });

          const userDto = await this.conversionService.toDto<
            UserEntity,
            UserDto
          >(user);
          const productDto = await this.conversionService.toDto<
            ProductEntity,
            ProductDto
          >(product);
          const mailParserDto = await this.getLowStockTrashHoldMailContent(
            userDto,
            productDto,
          );

          console.log(mailParserDto);

          this.notificationClient
            .emit(
              {
                service: 'mail',
                cmd: 'post',
                method: 'sendNoReplyMailMessage',
              },
              mailParserDto,
            )
            .pipe(timeout(5000))
            .subscribe();
        }
        // const productAttributeQtyUpdateUpdate =
        await this.productAttributeEntityRepository.update(
          { id: productAttribute.id },
          productAttributeQtyUpdate,
        );
      } else {
        if (productQtyUpdate.quantity <= product.lowStockThreshold) {
          console.log(product.lowStockThreshold);

          const user = await this.userRepository.findOne({
            where: {
              merchant: product.merchant,
            },
            relations: ['merchant'],
          });

          const userDto = await this.conversionService.toDto<
            UserEntity,
            UserDto
          >(user);
          const productDto = await this.conversionService.toDto<
            ProductEntity,
            ProductDto
          >(product);
          const mailParserDto = await this.getLowStockTrashHoldMailContent(
            userDto,
            productDto,
          );

          console.log(mailParserDto);

          this.notificationClient
            .emit(
              {
                service: 'mail',
                cmd: 'post',
                method: 'sendNoReplyMailMessage',
              },
              mailParserDto,
            )
            .pipe(timeout(5000))
            .subscribe();
        }
      }
    } catch (error) {
      console.log({ error });
      throw new SystemException(error);
    }
  }

  async generateTransMaster(
    order: OrderEntity,
    invoice: InvoiceEntity,
  ): Promise<TransMasterEntity> {
    try {
      // console.log('Invoice Starts');
      // console.log(invoice);
      // console.log('Invoice Ends');
      let transMaster = new TransMasterEntity();
      transMaster.user = order.user;
      transMaster.invoice = invoice;
      transMaster.isPaid = Bool.No;

      let total = invoice.invoiceTotal ?? 0;
      // for (const each of order.orderDetails) {
      //   if (each?.productAttribute) {
      //     total += Number(each?.productAttribute?.price || 0) * each.quantity;
      //     total +=
      //       Number(each?.productAttribute?.additionalShippingCost || 0) *
      //       each.quantity;
      //     total -=
      //       Number(each?.productAttribute?.discount || 0) * each.quantity;
      //   } else {
      //     total += Number(each?.product?.price || 0) * each.quantity;
      //     total +=
      //       Number(each?.product?.additionalShippingCost || 0) * each.quantity;
      //     total -=
      //       Number(each?.product?.discount || 0) * each.quantity;
      //   }
      // }
      total =
        total -
        (order.coupon !== null
          ? order.coupon.reductionPercent > 0.0
            ? (total * order.coupon.reductionPercent) / 100.0
            : order.coupon.reductionAmount
          : 0.0);
      // transMaster.totalAmount = total + this.SHIPPING_COST;
      transMaster.totalAmount = total;

      transMaster =
        this.requestService.forCreateEntity<TransMasterEntity>(transMaster);

      const created = await this.transMasterRepository.create(transMaster);

      await this.transMasterRepository.save(created);
      return created;
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: CreateOrderDto): Promise<OrderDto> {
    try {
      const saveDto = await this.getOrder(id);

      if (dto.userID) saveDto.user = await this.getUser(dto.userID);

      const dtoToEntity = await this.conversionService.toEntity<
        OrderEntity,
        OrderDto
      >({ ...saveDto, ...dto });

      const updatedOrder = await this.orderRepository.save(dtoToEntity, {
        reload: true,
      });
      return this.conversionService.toDto<OrderEntity, OrderDto>(updatedOrder);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async updateOrderStatus(
    id: string,
    dto: ChangeOrderStatusDto,
  ): Promise<OrderDto> {
    try {
      const saveDto = await this.getOrder(id);

      const updatedOrderStatus = await this.orderRepository.save(
        { ...saveDto, ...dto },
        {
          reload: true,
        },
      );
      return this.conversionService.toDto<OrderEntity, OrderDto>(
        updatedOrderStatus,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getOrder(id);

      const deleted = await this.orderRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string): Promise<OrderDto> {
    try {
      const order = await this.getOrder(id);
      order['transMaster'] = await this.getTransMaster(order.invoice);
      // console.log(order);

      return this.conversionService.toDto<OrderEntity, OrderDto>(order);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/
  async getOrder(id: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: [
        'invoice',
        'cart',
        'cart.cartDetails',
        'cart.cartDetails.product',
        'cart.cartDetails.productAttribute',
        'user',
        'orderDetails',
        'orderDetails.product',
        'orderDetails.productAttribute',
        'shippingAddress',
        'billingAddress',
        'coupon',
      ],
    });
    this.exceptionService.notFound(order, 'Order Not Found!!');
    return order;
  }

  async getTransMaster(invoice: InvoiceEntity): Promise<TransMasterEntity> {
    const tm = await this.transMasterRepository.findOne({
      where: {
        invoice,
        ...isActive,
      },
    });
    this.exceptionService.notFound(tm, 'Trans Master Not Found!!');
    return tm;
  }

  async getCart(id: string): Promise<CartEntity> {
    const cart = await this.cartRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: [
        'cartDetails',
        'cartDetails.product',
        'cartDetails.productAttribute',
        'coupon',
        'customer',
      ],
    });
    this.exceptionService.notFound(cart, 'Cart Not Found!!');
    return cart;
  }
  async getCustomerLastInvoice(): Promise<InvoiceEntity> {
    const query = this.invoiceRepository.createQueryBuilder('invoice');
    const invoice = await query
      .innerJoinAndSelect('invoice.user', 'user')
      .leftJoinAndSelect('invoice.invoiceDetails', 'invoiceDetails')
      .leftJoinAndSelect('invoiceDetails.product', 'product')
      .leftJoinAndSelect('invoiceDetails.productAttribute', 'productAttribute')
      .leftJoinAndSelect('invoice.billingAddress', 'billingAddress')
      .leftJoinAndSelect('invoice.shippingAddress', 'shippingAddress')
      .where('user.id=:id', {
        id: this.permissionService.returnRequest().userId,
      })
      .andWhere('invoice.status =:status', { status: InvoiceStatus.UNPAID })
      .getOne();
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

  async setShippingAddress(
    cartId: string,
    shippingAddressId: string,
  ): Promise<OrderEntity> {
    try {
      const order = await this.orderRepository.findOne({
        where: {
          cart: cartId,
        },
      });
      const shippingAddress = await this.addressRepository.findOne({
        where: {
          id: shippingAddressId,
        },
      });

      const user = await this.userRepository.findOne({
        where: {
          id: this.permissionService.returnRequest().userId,
        },
        relations: ['address'],
      });
      order.billingAddress = user.address;
      order.shippingAddress = shippingAddress;
      // console.log(user);
      await this.orderRepository.save(order);
      this.exceptionService.notFound(order, 'Order Not Found!!');
      return order;
    } catch (error) {
      throw new SystemException(error);
    }
  }

  indexProductSearch = (productDto: ProductDto) => {
    this.searchClient
      .send({ service: 'products', cmd: 'post', method: 'index' }, productDto)
      .subscribe();
  };
  indexProductSearchRemove = (productId: string) => {
    this.searchClient
      .send({ service: 'products', cmd: 'post', method: 'remove' }, productId)
      .subscribe();
  };

  checkCartQuantityWithProductQuantity = (cart: CartEntity) => {
    const cartDetails = cart.cartDetails ?? null;
    let result = {
      status: true,
      product: null,
    };
    for (let index = 0; index < cartDetails.length; index++) {
      const cartQuantity = cartDetails[index].quantity;
      const productQuantity = cartDetails[index].product.quantity ?? 0;

      if (cartQuantity > productQuantity) {
        result = {
          status: false,
          product: cartDetails[index].product,
        };
      }
    }
    return result;
  };
  /*********************** End checking relations of post *********************/

  getLowStockTrashHoldMailContent(
    user: UserDto,
    product: ProductDto,
  ): MailParserDto {
    const parseMailFrom = new MailFromDto();
    parseMailFrom.address = this.configService.get('MAIL_NO_REPLY_USER');
    parseMailFrom.name = 'EBONEAR';

    const mailParserDto = new MailParserDto();
    mailParserDto.from = parseMailFrom;
    mailParserDto.to = user.email;
    mailParserDto.subject = 'Product Low Stock Alert';

    ejs
      .renderFile(path.join(__dirname, '../views/mail/low-stock.ejs'), {
        user: user,
        product: product,
      })
      .then((result) => {
        mailParserDto.html = result;
      });

    return mailParserDto;
  }
}
