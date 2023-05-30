import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ejs from 'ejs';
import path from 'path';
import { timeout } from 'rxjs/operators';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
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
  UserEntity,
} from '@simec/ecom-common';
import { EventEmitter2 } from 'eventemitter2';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ProductCountEvent } from '../events/product-count.event';

@Injectable()
export class CustomerOrderService implements GeneralService<OrderDto> {
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
    order: string,
    status = 0,
  ): Promise<[OrderDto[], number]> {
    try {
      const user = this.permissionService.returnRequest();

      const where = { ...isActive };
      if (user && user.isCustomer) {
        where['user'] = await this.userRepository.findOne({
          where: { ...isActive, id: user.userId },
        });
      }
      if (status != 0) {
        where['status'] = status;
      }

      const orders = await this.orderRepository.findAndCount({
        where: { ...where },
        skip: (page - 1) * limit,
        take: limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
        relations: [
          'invoice',
          'orderDetails',
          'orderDetails.product',
          'orderDetails.productAttribute',
        ],
      });

      return this.conversionService.toPagination<OrderEntity, OrderDto>(orders);
    } catch (error) {
      throw new SystemException(error);
    }
  }

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
      this.generateShopInvoice(transMasterData);
      this.generateMerchantInvoice(transMasterData);

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
      let newInvoice = null;
      let invoiceTotal = 0;
      const shippingCharge = 40;
      const invoiceDetails: InvoiceDetailsEntity[] = [];
      for (const cartDetailDto of cart.cartDetails) {
        let grandTotal = 0;
        const invoiceDetailEntity =
          this.requestService.forCreateEntity<InvoiceDetailsEntity>(
            new InvoiceDetailsEntity(),
          );
        invoiceDetailEntity.product = cartDetailDto.product;
        invoiceDetailEntity.productAttribute = cartDetailDto.productAttribute;
        invoiceDetailEntity.vat = 0;
        //ToDo
        // Add Vat on Products And need More Clarifications

        invoiceDetailEntity.quantity = cartDetailDto.quantity;
        if (cartDetailDto.productAttribute) {
          invoiceDetailEntity.price = cartDetailDto.productAttribute.price;
          invoiceDetailEntity.discount =
            cartDetailDto.productAttribute.discount ?? 0;
          invoiceDetailEntity.additionalShippingCost =
            cartDetailDto.productAttribute.additionalShippingCost ?? 0;
        } else {
          invoiceDetailEntity.price = cartDetailDto.product.price;
          invoiceDetailEntity.discount = cartDetailDto.product.discount ?? 0;
          invoiceDetailEntity.additionalShippingCost =
            cartDetailDto.product.additionalShippingCost ?? 0;
        }
        const invoiceDetail = await this.invoiceDetailsRepository.create(
          invoiceDetailEntity,
        );
        // Calculate GrandTotal
        grandTotal =
          invoiceDetailEntity.price * invoiceDetailEntity.quantity +
          invoiceDetailEntity.additionalShippingCost *
            invoiceDetailEntity.quantity +
          invoiceDetailEntity.vat -
          invoiceDetailEntity.discount * invoiceDetailEntity.quantity;

        invoiceTotal += grandTotal;

        invoiceDetail.grandTotal = grandTotal;
        // invoiceDetail.additionalShippingCost = cartDetailDto.product.additionalShippingCost ?? 0;

        await this.invoiceDetailsRepository.save(invoiceDetail);
        invoiceDetails.push(invoiceDetail);
      }

      invoiceTotal += shippingCharge;

      // console.log(invoiceTotal);

      newInvoice = this.requestService.forCreateEntity<InvoiceEntity>(
        new InvoiceEntity(),
      );

      newInvoice.invoiceDetails = invoiceDetails;
      newInvoice.user = await this.getUser(dto.userID);
      newInvoice.invoiceTotal = invoiceTotal;
      newInvoice.status = InvoiceStatus.UNPAID;
      newInvoice.paymentMethod = PaymentMethodEnum.NotSelected;
      await this.invoiceRepository.save(newInvoice);
      return newInvoice;
    } catch (error) {
      throw new SystemException(error);
    }
  }
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

  generateShopInvoice = async (transMasterDataEntity: TransMasterEntity) => {
    const invoice = transMasterDataEntity.invoice;
    const order = transMasterDataEntity.invoice.order;
    const userID = transMasterDataEntity.createdBy;
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
        const shopInvoice = new ShopInvoiceEntity();
        shopInvoice.createdBy = userID;
        shopInvoice.updatedBy = userID;
        shopInvoice.createAt = new Date();
        shopInvoice.updatedAt = new Date();
        shopInvoice.status = invoice.status;
        shopInvoice.paymentMethod = invoice.paymentMethod;
        shopInvoice.invoiceTotal = Number(0.0);
        shopInvoice.shop = invoiceDetail.product.shop;
        shopInvoice.order = order;
        shopInvoice.invoice = invoice;
        shopInvoice.commission = Number(0);
        shopInvoice.shopInvoiceDetails = new Array<ShopInvoiceDetailsEntity>();
        shopInvoice.billingAddress = invoice.billingAddress;
        shopInvoice.shippingAddress = invoice.shippingAddress;
        shopProductMap.set(shopID, shopInvoice);
        shopIDs.push(shopID);
      }

      // Prepare shop-invoice-detail data
      const shopInvoice: ShopInvoiceEntity = shopProductMap.get(shopID);
      shopInvoice.invoiceTotal += Number(invoiceDetail.grandTotal);
      const shopInvoiceDetail = new ShopInvoiceDetailsEntity();
      shopInvoiceDetail.createdBy = userID;
      shopInvoiceDetail.updatedBy = userID;
      shopInvoiceDetail.createAt = new Date();
      shopInvoiceDetail.updatedAt = new Date();
      shopInvoiceDetail.additional = invoiceDetail.additional;
      shopInvoiceDetail.note = invoiceDetail.note;
      shopInvoiceDetail.quantity = invoiceDetail.quantity;
      shopInvoiceDetail.price = invoiceDetail.price;
      shopInvoiceDetail.vat = invoiceDetail.vat;
      shopInvoiceDetail.additionalShippingCost =
        invoiceDetail.additionalShippingCost;
      shopInvoiceDetail.grandTotal = invoiceDetail.grandTotal;
      // calculate product sales commission
      shopInvoiceDetail.commission =
        invoiceDetail.grandTotal * (shopCommissionValue / 100);
      // sum the product sales commission with it's parent shop commission
      shopInvoice.commission += shopInvoiceDetail.commission;
      shopInvoiceDetail.discount = invoiceDetail.discount;
      shopInvoiceDetail.product = invoiceDetail.product;
      shopInvoiceDetail.productAttribute = invoiceDetail.productAttribute;
      shopInvoice.shopInvoiceDetails.push(shopInvoiceDetail);
    }

    // Save data to DB
    await Promise.all(
      shopIDs.map(async (data) => {
        const shopProductInvoice = shopProductMap.get(data);
        const shopInvoiceWithDetails = await this.shopInvoiceRepository.create(
          shopProductInvoice,
        );
        await this.shopInvoiceRepository.save(shopInvoiceWithDetails);
      }),
    );
  };

  generateMerchantInvoice = async (
    transMasterDataEntity: TransMasterEntity,
  ) => {
    console.log(transMasterDataEntity);
    const invoice = transMasterDataEntity.invoice;
    const order = transMasterDataEntity.invoice.order;
    const userID = transMasterDataEntity.createdBy;
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
        const merchantInvoice = new MarchantInvoiceEntity();
        merchantInvoice.createdBy = userID;
        merchantInvoice.updatedBy = userID;
        merchantInvoice.createAt = new Date();
        merchantInvoice.updatedAt = new Date();
        merchantInvoice.status = invoice.status;
        merchantInvoice.paymentMethod = invoice.paymentMethod;
        merchantInvoice.invoiceTotal = Number(0.0);
        merchantInvoice.commission = Number(0);
        merchantInvoice.merchant = invoiceDetail.product.shop.merchant;
        merchantInvoice.order = order;
        merchantInvoice.invoice = invoice;
        merchantInvoice.marchantInvoiceDetails =
          new Array<MerchantInvoiceDetailsEntity>();
        merchantInvoice.billingAddress = invoice.billingAddress;
        merchantInvoice.shippingAddress = invoice.shippingAddress;
        merchantProductMap.set(merchantID, merchantInvoice);
        merchatIDs.push(merchantID);
      }

      // Prepare merchant-invoice-detail data
      const merchantInvoice: MarchantInvoiceEntity =
        merchantProductMap.get(merchantID);
      merchantInvoice.invoiceTotal += Number(invoiceDetail.grandTotal);
      const merchantInvoiceDetail = new MerchantInvoiceDetailsEntity();
      merchantInvoiceDetail.createdBy = userID;
      merchantInvoiceDetail.updatedBy = userID;
      merchantInvoiceDetail.createAt = new Date();
      merchantInvoiceDetail.updatedAt = new Date();
      merchantInvoiceDetail.additional = invoiceDetail.additional;
      merchantInvoiceDetail.note = invoiceDetail.note;
      merchantInvoiceDetail.quantity = invoiceDetail.quantity;
      merchantInvoiceDetail.price = invoiceDetail.price;
      merchantInvoiceDetail.vat = invoiceDetail.vat;
      merchantInvoiceDetail.additionalShippingCost =
        invoiceDetail.additionalShippingCost;
      merchantInvoiceDetail.grandTotal = invoiceDetail.grandTotal;
      // calculate product sales commission
      merchantInvoiceDetail.commission =
        invoiceDetail.grandTotal * (shopCommissionPercentage / 100);
      // sum the product sales commission with it's parent merchant commission
      merchantInvoice.commission += merchantInvoiceDetail.commission;
      merchantInvoiceDetail.discount = invoiceDetail.discount;
      // merchantInvoiceDetail.shop = invoiceDetail.product.shop.id;
      merchantInvoiceDetail.product = invoiceDetail.product;
      merchantInvoiceDetail.productAttribute = invoiceDetail.productAttribute;
      merchantInvoice.marchantInvoiceDetails.push(merchantInvoiceDetail);
    }

    // Save data to DB
    await Promise.all(
      merchatIDs.map(async (data) => {
        const merchantProductInvoice: MarchantInvoiceEntity =
          merchantProductMap.get(data);
        const merchantInvoiceWithDetails =
          await this.merchantInvoiceRepository.create(merchantProductInvoice);
        await this.merchantInvoiceRepository.save(merchantInvoiceWithDetails);
      }),
    );
  };

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
      ],
    });
    this.exceptionService.notFound(tmData, 'Transmaster Not Found!!');
    return tmData;
  }

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
      const invoice = await this.invoiceRepository.findOne({
        where: {
          order: id,
          ...isActive,
        },
      });

      await this.changeInvoiceStatus(invoice);

      return this.conversionService.toDto<OrderEntity, OrderDto>(
        updatedOrderStatus,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  changeInvoiceStatus = async (invoice: InvoiceEntity) => {
    invoice.paymentMethod = PaymentMethodEnum.CashOnDelivery;
    await this.invoiceRepository.save(invoice);
    const merchantInvoices = await this.merchantInvoiceRepository.find({
      where: {
        invoice: invoice.id,
        ...isActive,
      },
    });
    for (const merchantInvoice of merchantInvoices) {
      merchantInvoice.paymentMethod = PaymentMethodEnum.CashOnDelivery;
      await this.merchantInvoiceRepository.save(merchantInvoice);
    }
    const shopInvoices = await this.shopInvoiceRepository.find({
      where: {
        invoice: invoice.id,
        ...isActive,
      },
    });
    for (const shopInvoice of shopInvoices) {
      shopInvoice.paymentMethod = PaymentMethodEnum.CashOnDelivery;
      await this.shopInvoiceRepository.save(shopInvoice);
    }
  };

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
