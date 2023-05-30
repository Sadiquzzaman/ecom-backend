import * as util from 'util';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CartDetailsEntity,
  CartDto,
  CartEntity,
  ConversionService,
  CouponEntity,
  CouponUsageEntity,
  CreateCartDto,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  OrderEntity,
  PermissionService,
  ProductAttributeEntity,
  ProductEntity,
  RequestService,
  SystemException,
  UserEntity,
  CouponDto,
  CouponUsageDto,
  StockPurchaseEntity,
  StockItemTransactionEntity,
  Bool,
  ProductAvaiablityException,
  ProductCostCalc,
  ShipmentEntity,
  CustomerEntity,
  UserResponseDto,
  CustomerDto,
} from '@simec/ecom-common';
import { StockStatus } from '@simec/ecom-common/dist/enum/stock-status.enum';
import { Repository } from 'typeorm';

@Injectable()
export class CartService implements GeneralService<CartDto> {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepository: Repository<ShipmentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(CartDetailsEntity)
    private readonly cartDetailRepository: Repository<CartDetailsEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ProductAttributeEntity)
    private readonly productAttributeRepository: Repository<ProductAttributeEntity>,
    @InjectRepository(CouponEntity)
    private readonly couponRepository: Repository<CouponEntity>,
    @InjectRepository(CouponUsageEntity)
    private readonly couponUsageRepository: Repository<CouponUsageEntity>,
    @InjectRepository(StockPurchaseEntity)
    private readonly stockPurchaseRepository: Repository<StockPurchaseEntity>,
    @InjectRepository(StockItemTransactionEntity)
    private readonly stockItemTransactionEntityRepository: Repository<StockItemTransactionEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly requestService: RequestService,
    private readonly permissionService: PermissionService,
  ) {}

  async findAll(): Promise<CartDto[]> {
    try {
      const carts = await this.cartRepository.find({ ...isActive });
      return this.conversionService.toDtos<CartEntity, CartDto>(carts);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(cartDto: CartDto): Promise<CartDto[]> {
    try {
      const carts = await this.cartRepository.find({
        where: {
          ...cartDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<CartEntity, CartDto>(carts);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
  ): Promise<[CartDto[], number]> {
    try {
      const carts = await this.cartRepository.findAndCount({
        where: { ...isActive },
        skip: (page - 1) * limit,
        take: limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
      });

      return this.conversionService.toPagination<CartEntity, CartDto>(carts);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByOrder(id: string): Promise<CartDto[]> {
    try {
      const order = await this.getOrder(id);
      const carts = await this.cartRepository.find({
        where: {
          order,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<CartEntity, CartDto>(carts);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByProduct(id: string): Promise<CartDto[]> {
    try {
      const product = await this.getProduct(id);
      const carts = await this.cartRepository.find({
        where: {
          product,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<CartEntity, CartDto>(carts);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findCustomerCart(): Promise<CartDto> {
    try {
      const cart = await this.getCustomerLastCart();
      // let calculatedMerchantData = await this.getMerchantWiseCalculatedData(
      //   cart,
      // );
      // console.log(calculatedMerchantData);

      // return this.conversionService.toDto<CartEntity, CartDto>(cart);
      const cartObj = await this.conversionService.toDto<CartEntity, CartDto>(
        cart,
      );

      return cartObj;
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async getCustomer(id: string): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(customer, 'Customer Not Found!!');
    return customer;
  }

  async create(dto: CreateCartDto): Promise<CartDto> {
    try {
      const latestCart = await this.getCustomerLastCart();
      const cart = await this.generateCart(latestCart, dto);
      return this.conversionService.toDto<CartEntity, CartDto>(cart);
    } catch (error) {
      if (error.status == 400) throw new ProductAvaiablityException(error);
      throw new SystemException(error);
    }
  }

  // async generateCart(
  //   latestCart: CartEntity,
  //   dto: CreateCartDto,
  // ): Promise<CartEntity> {
  //   try {
  //     let newCart = null;
  //     const cartDetails: CartDetailsEntity[] = [];
  //     for (const cartDetailDto of dto.cartDetails) {
  //       const cartDetailEntity =
  //         this.requestService.forCreateEntity<CartDetailsEntity>(
  //           new CartDetailsEntity(),
  //         );
  //       cartDetailEntity.product = await this.getProduct(
  //         cartDetailDto.productID,
  //       );
  //       if (cartDetailDto.productAttributeID) {
  //         cartDetailEntity.productAttribute = await this.getProductAttribute(
  //           cartDetailDto.productAttributeID,
  //         );
  //       }
  //       cartDetailEntity.quantity = cartDetailDto.quantity;
  //       const cartDetail = await this.cartDetailRepository.create(
  //         cartDetailEntity,
  //       );
  //       const cartDetailEntityNew = await this.cartDetailRepository.save(
  //         cartDetail,
  //       );
  //       // await this.processStockCart(cartDetailEntityNew);
  //       cartDetails.push(cartDetail);
  //     }
  //     if (latestCart) {
  //       newCart = latestCart;
  //       await this.cartDetailRepository.remove(latestCart.cartDetails);
  //     } else {
  //       newCart = this.requestService.forCreateEntity<CartEntity>(
  //         new CartEntity(),
  //       );
  //     }
  //     newCart.cartDetails = cartDetails;
  //     newCart.user = await this.getUser(dto.userID);
  //     await this.cartRepository.save(newCart);
  //     return newCart;
  //   } catch (error) {
  //     console.log(error);

  //     throw new SystemException(error);
  //   }
  // }

  async generateCart(
    latestCart: CartEntity,
    dto: CreateCartDto,
  ): Promise<CartEntity> {
    try {
      const cartDetail = [];
      const cartDetails: CartDetailsEntity[] = [];
      for (const cartDetailDto of dto.cartDetails) {
        const cartDetailEntity =
          this.requestService.forCreateEntity<CartDetailsEntity>(
            new CartDetailsEntity(),
          );
        cartDetailEntity.product = await this.getProduct(
          cartDetailDto.productID,
        );
        if (cartDetailDto.productAttributeID) {
          cartDetailEntity.productAttribute = await this.getProductAttribute(
            cartDetailDto.productAttributeID,
          );
        }
        cartDetailEntity.quantity = cartDetailDto.quantity;
        cartDetail.push(cartDetailEntity);
      }
      const result: any = this.productAvailablityValidator(cartDetail);
      if (result.productLimitMessage) throw new BadRequestException(result);
      return await this.addCart(dto.userID, latestCart, result);
    } catch (error) {
      throw error;
    }
  }

  async addCart(
    userID,
    latestCart: CartEntity,
    cDetatils: CartDetailsEntity[],
  ) {
    try {
      let newCart: CartEntity = null;
      const cartDetails: CartDetailsEntity[] = [];
      for (const cartDetailDto of cDetatils) {
        const cartDetail = await this.cartDetailRepository.create(
          cartDetailDto,
        );
        await this.cartDetailRepository.save(cartDetail);
        // console.log(cartDetailEntityNew);

        cartDetails.push(cartDetail);
      }

      // console.log(cartDetails);

      if (latestCart) {
        newCart = latestCart;
        // await this.processRemovePreviousCart(latestCart.cartDetails);
        await this.cartDetailRepository.remove(latestCart.cartDetails);
      } else {
        newCart = this.requestService.forCreateEntity<CartEntity>(
          new CartEntity(),
        );
      }
      newCart.cartDetails = cartDetails;
      newCart.user = await this.getUser(userID);
      const userSession: UserResponseDto =
        await this.requestService.userSession();
      newCart.customer = await this.getCustomer(userSession.CustomerId);
      const calculatedData = await this.getShopWiseCalculatedData(newCart);

      // console.log(calculatedData);
      newCart = calculatedData.cart;
      await this.cartRepository.save(newCart);
      for (let i = 0; i < newCart.cartDetails.length; i++) {
        // console.log({ newCartDat: newCart.cartDetails[i] });
        await this.processStockCart(newCart.cartDetails[i]);
      }
      // return newCart;
      const cart = await this.getCustomerLastCart();
      return cart;
    } catch (error) {
      console.log(error);
      throw new SystemException(error);
    }
  }

  // Prepare Shop Wise Invoice Data
  async getShopWiseCalculatedData(newCart) {
    const shippindConfigs = await this.getAllShipment();
    const shopWiseCartdata = [];
    const cartDetails = newCart.cartDetails;
    for (const cartDetail of cartDetails) {
      const cartDetailData = await this.cartDetailRepository.findOne({
        where: {
          id: cartDetail.id,
        },
        relations: ['product', 'product.shop', 'product.shop.merchant'],
      });
      // console.log(cartDetailData);

      const existingShopdata = shopWiseCartdata.find(
        (shopCart) => shopCart.shopId === cartDetailData.product.shop.id,
      );
      if (existingShopdata) {
        existingShopdata.carts.push(cartDetailData);
      } else {
        const existingShopdata = {
          shopId: cartDetailData.product.shop.id,
          shop: cartDetailData.product.shop,
          carts: [cartDetailData],
        };
        shopWiseCartdata.push(existingShopdata);
      }
    }
    let totalAdditionalShippingCost = 0;

    for (const shopCart of shopWiseCartdata) {
      let shopTotalWeight = 0;
      const allCartOfShop = shopCart.carts;
      allCartOfShop.forEach((cart) => {
        shopTotalWeight +=
          (cart.productAttribute
            ? cart.productAttribute.weight
            : cart.product.weight) * cart.quantity;
      });
      shopCart.weight = shopTotalWeight;
      shopCart.additionalCost = ProductCostCalc(shippindConfigs, shopCart);
      totalAdditionalShippingCost += shopCart.additionalCost;
    }
    // console.log(shopWiseCartdata);
    newCart.additionalShippingCost = totalAdditionalShippingCost;

    const data = {
      cart: newCart,
      shopWiseData: shopWiseCartdata,
    };

    return data;
  }

  // Prepare Merchant Wise Data
  async getMerchantWiseCalculatedData(cart) {
    const shopwiseData = await this.getShopWiseCalculatedData(cart);
    const shopDataSet = shopwiseData.shopWiseData;
    console.log(shopDataSet);

    const merchantWiseCartdata = [];
    shopDataSet.forEach((shopData) => {
      const existingMerchantdata = merchantWiseCartdata.find(
        (merchantData) => merchantData.merchantId === shopData.shop.merchant.id,
      );
      if (existingMerchantdata) {
        existingMerchantdata.cartDetailsData.push(shopData.carts);
        existingMerchantdata.additionalShippingCost += shopData.additionalCost;
      } else {
        const existingMerchantdata = {
          merchantId: shopData.shop.merchant.id,
          merchant: shopData.shop.merchant,
          cartDetailsData: [shopData.carts],
          additionalShippingCost: shopData.additionalCost,
        };
        merchantWiseCartdata.push(existingMerchantdata);
      }
    });
    return merchantWiseCartdata;
  }

  productAvailablityValidator(cartDetails: CartDetailsEntity[]) {
    // console.log(cartDetails);
    const filteredData = cartDetails
      .filter((item) => item.productAttribute.quantity < item.quantity)
      .map(
        (item) =>
          `Product is ${item.product.name} available quantity is ${item.productAttribute.quantity} pcs.`,
      );

    if (filteredData.length)
      return {
        productLimitMessage: 'Requested limit of product not available in shop',
        limitExistItem: filteredData,
      };
    return cartDetails;
  }

  async processStockCart(cartDetailsEntity: CartDetailsEntity): Promise<void> {
    try {
      let purchasedPrice = 0.0;
      let sellingPrice = 0.0;
      // let qty = 0;
      let inHand = 0;
      let inCart = 0;
      let reserved = 0;
      // console.log({
      //   product: cartDetailsEntity.product,
      //   productAttribute: cartDetailsEntity.productAttribute ?? null,
      //   ...isActive,
      // });
      // const stockPurchaseOld = await this.stockPurchaseRepository.findOne({
      //   where: {
      //     product: cartDetailsEntity.product,
      //     productAttribute: cartDetailsEntity.productAttribute ?? null,
      //   },
      // });
      // console.log({ stockPurchaseOld });
      // qty = cartDetailsEntity.quantity;
      inCart = cartDetailsEntity.quantity;
      reserved = cartDetailsEntity.quantity;
      if (cartDetailsEntity.productAttribute) {
        inHand = cartDetailsEntity.productAttribute.quantity;
        purchasedPrice = cartDetailsEntity.productAttribute.purchasedPrice;
        sellingPrice = cartDetailsEntity.productAttribute.price;
      } else {
        inHand = cartDetailsEntity.product.quantity;
        purchasedPrice = cartDetailsEntity.product.purchasedPrice;
        sellingPrice = cartDetailsEntity.product.price;
      }

      // const stockPurchase = new StockPurchaseEntity();
      // stockPurchase.createAt = new Date();
      // stockPurchase.updatedAt = new Date();
      // stockPurchase.createdBy = cartDetailsEntity.createdBy;
      // stockPurchase.updatedBy = cartDetailsEntity.updatedBy;
      // stockPurchase.product = cartDetailsEntity.product;
      // stockPurchase.productAttribute = cartDetailsEntity.productAttribute;
      // // stockPurchase.quantity = qty;
      // stockPurchase.inHand = inHand;
      // stockPurchase.inCart = inCart;

      // stockPurchase.purchasedPrice = purchasedPrice;
      // console.log({ stockPurchase });

      // const stockPurchaseE = await this.stockPurchaseRepository.save(
      //   stockPurchase,
      // );
      // console.log(stockPurchaseE);

      // const stockItemTransaction = new StockItemTransactionEntity();
      // stockItemTransaction.createAt = new Date();
      // stockItemTransaction.updatedAt = new Date();
      // stockItemTransaction.createdBy = cartDetailsEntity.createdBy;
      // stockItemTransaction.updatedBy = cartDetailsEntity.updatedBy;
      // stockItemTransaction.purchasingPrice = purchasedPrice;
      // stockItemTransaction.sellingPrice = sellingPrice;
      // stockItemTransaction.sellingAt = new Date();
      // stockItemTransaction.discount = 0.0;
      // stockItemTransaction.couponDiscount = 0.0;
      // stockItemTransaction.isFreeGift = Bool.No;
      // stockItemTransaction.cartDetails = cartDetailsEntity;
      // stockItemTransaction.product = cartDetailsEntity.product;
      // stockItemTransaction.productAttribute =
      //   cartDetailsEntity.productAttribute;
      // // stockItemTransaction.stockPurchase = stockPurchaseE;
      // stockItemTransaction.status = StockStatus.IN_CART;
      // console.log({ stockItemTransaction });

      // const stockItemE = await this.stockItemTransactionEntityRepository.save(
      //   stockItemTransaction,
      // );
      const productQtyUpdate = cartDetailsEntity.product;
      productQtyUpdate.reserved = productQtyUpdate.reserved + reserved;
      const updatedProduct = await this.productRepository.save(
        productQtyUpdate,
        {
          reload: true,
        },
      );
      const productAttributeQtyUpdate = cartDetailsEntity.productAttribute;
      productAttributeQtyUpdate.reserved =
        productAttributeQtyUpdate.reserved + reserved;
      const productAttributeQtyUpdateUpdate =
        await this.productAttributeRepository.save(productAttributeQtyUpdate, {
          reload: true,
        });
    } catch (error) {
      console.log({ error });

      // throw new SystemException(error);
    }
  }
  async processRemovePreviousCart(
    lastCartDetailsEntity: CartDetailsEntity[],
  ): Promise<void> {
    try {
      console.log({
        removeLastCartDetailsEntity: lastCartDetailsEntity,
      });
      const query =
        await this.stockItemTransactionEntityRepository.createQueryBuilder(
          'StockItemTransactionEntity',
        );
      query
        .where('StockItemTransactionEntity.cart_details_id in (:...ids)', {
          ids: [
            ...lastCartDetailsEntity.map((cartDetail) => {
              return cartDetail.id;
            }),
          ],
        })
        .leftJoinAndSelect(
          'StockItemTransactionEntity.stockPurchase',
          'stockPurchase',
        );
      console.log(query.getQueryAndParameters());
      const stocks = await query.getMany();
      console.log(
        util.inspect(stocks, {
          showHidden: false,
          depth: null,
          colors: true,
        }),
      );
      for (let i = 0; i < stocks.length; i++) {
        // const status = await stocks[i].remove();
        const statusSub = await this.stockPurchaseRepository.remove(
          stocks[i].stockPurchase,
        );
        const status = await this.stockItemTransactionEntityRepository.remove(
          stocks[i],
        );
        console.log({ statusSub, status });
      }
      // const stockItemE = await this.so;
      //to do remove all previous stock data
      return;
    } catch (error) {
      console.log({ error });

      // throw new SystemException(error);
    }
  }

  async update(id: string, dto: CreateCartDto): Promise<CartDto> {
    try {
      const saveDto = await this.getCart(id);
      console.log({ ...saveDto, ...dto });

      const dtoToEntity = await this.conversionService.toEntity<
        CartEntity,
        CartDto
      >({ ...saveDto, ...dto });

      const updatedCart = await this.cartRepository.save(dtoToEntity, {
        reload: true,
      });
      return this.conversionService.toDto<CartEntity, CartDto>(updatedCart);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getCart(id);
      const deleted = await this.cartRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string): Promise<CartDto> {
    try {
      const cart = await this.getCart(id);
      return this.conversionService.toDto<CartEntity, CartDto>(cart);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/
  async getCart(id: string): Promise<CartEntity> {
    const cart = await this.cartRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: [
        'order',
        'user',
        'cartDetails',
        'cartDetails.product',
        'cartDetails.productAttribute',
        'coupon',
      ],
    });
    this.exceptionService.notFound(cart, 'Cart Not Found!!');
    return cart;
  }

  async getCustomerLastCart(): Promise<CartEntity> {
    const query = this.cartRepository.createQueryBuilder('cart');
    const cart = await query
      .innerJoinAndSelect('cart.user', 'user')
      .leftJoinAndSelect('cart.cartDetails', 'cartDetails')
      .leftJoinAndSelect('cartDetails.product', 'product')
      .leftJoinAndSelect('product.productAttributes', 'productAttributes')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('cartDetails.productAttribute', 'productAttribute')
      .leftJoinAndSelect('productAttribute.attributes', 'productAttributeAttr')
      .leftJoinAndSelect(
        'productAttributeAttr.attributeGroup',
        'productAttributeAttrGroup',
      )
      .leftJoinAndSelect('cart.order', 'order')
      .leftJoinAndSelect('cart.coupon', 'coupon')
      .where('user.id=:id', {
        id: this.permissionService.returnRequest().userId,
      })
      .andWhere('order.id IS NULL')
      .orderBy('productAttribute.id');
    // console.log(cart.getQueryAndParameters());
    return await cart.getOne();
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

  async getProduct(id: string): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(product, 'Product Not Found!!');
    return product;
  }

  async getProductAttribute(id: string): Promise<ProductAttributeEntity> {
    const productAttribute = await this.productAttributeRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(
      productAttribute,
      'Product Attribute is Not Found!!',
    );
    return productAttribute;
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

  /*********************** End checking relations of post *********************/

  async findByCouponCode(
    code: string,
    withRelation = true,
  ): Promise<CouponDto> {
    try {
      const coupon = await this.couponRepository.findOne({
        where: { couponCode: code, ...isActive },
        relations: withRelation
          ? [
              'users',
              'shops',
              'categories',
              'products',
              'thanas',
              'freeProduct',
              'freeProductAttribute',
            ]
          : [],
      });
      return this.conversionService.toDto<CouponEntity, CouponDto>(coupon);
    } catch (error) {
      throw new SystemException(error);
    }
  }
  async findByCouponId(
    couponID: string,
    withRelation = true,
  ): Promise<CouponEntity> {
    try {
      const coupon = await this.couponRepository.findOne({
        where: { id: couponID, ...isActive },
        relations: withRelation
          ? [
              'users',
              'shops',
              'categories',
              'products',
              'thanas',
              'freeProduct',
              'freeProductAttribute',
            ]
          : [],
      });
      // return await this.conversionService.toDto<CouponEntity, CouponDto>(
      //   coupon,
      // );
      return coupon;
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async checkCoupon(cartId: string, couponCode: string): Promise<CouponDto> {
    const coupon = await this.findByCouponCode(couponCode);
    if (coupon === undefined) {
      return null;
    }
    const cartE = await this.getCart(cartId);
    const cart = await this.conversionService.toDto<CartEntity, CartDto>(cartE);
    const couponUserQ = await this.couponUsageRepository
      .createQueryBuilder()
      .select(['1'])
      .where('"user_id" = :userID and "coupon_id" = :couponID', {
        userID: cart.user.id,
        couponID: coupon.id,
      });
    const couponUsageByUser = await couponUserQ.getCount();
    // console.log(couponUserQ.getQueryAndParameters());
    if (couponUsageByUser > coupon.quantityPerUser) {
      return null;
    }
    let canCouponApply = false;
    // console.log(coupon);
    if (
      coupon.users.length === 0 &&
      coupon.products.length === 0 &&
      coupon.categories.length === 0 &&
      coupon.shops.length === 0 &&
      coupon.thanas.length === 0
    ) {
      canCouponApply = true;
    } else {
      if (
        coupon.users.findIndex((user) => {
          return user.id === cart.id;
        }) > -1
      ) {
        canCouponApply = true;
      }
      for (let i = 0; i < cart.cartDetails.length; i++) {
        if (
          coupon.products.findIndex((product) => {
            return cart.cartDetails[i].id === product.id;
          }) > -1
        ) {
          canCouponApply = true;
          break;
        }
        if (
          coupon.categories.findIndex((category) => {
            return cart.cartDetails[i].product.category.id === category.id;
          }) > -1
        ) {
          canCouponApply = true;
          break;
        }
        if (
          coupon.shops.findIndex((shop) => {
            return cart.cartDetails[i].product.shop.id === shop.id;
          }) > -1
        ) {
          canCouponApply = true;
          break;
        }
        if (
          coupon.thanas.findIndex((thana) => {
            return cart.cartDetails[i].product.shop.location === thana.name;
          }) > -1
        ) {
          canCouponApply = true;
          break;
        }
      }
    }

    // console.log({ canCouponApply });

    if (canCouponApply === true) {
      return coupon;
    }
    return null;
  }

  async couponUsage(userId: string, couponId: string): Promise<CouponUsageDto> {
    const userE = await this.userRepository.findOne({ id: userId });
    const couponE = await this.findByCouponId(couponId);
    const couponUsage = this.requestService.forCreateEntity<CouponUsageEntity>(
      new CouponUsageEntity(),
    );
    couponUsage.coupon = couponE;
    couponUsage.user = userE;
    const couponUsageE = await couponUsage.save();
    return this.conversionService.toDto<CouponUsageEntity, CouponUsageDto>(
      couponUsageE,
    );
  }
  /*********************** End checking of coupon *********************/

  //  Get All Shipment Data
  async getAllShipment(): Promise<any> {
    const query = this.shipmentRepository.createQueryBuilder('shipments');
    const shipments = await query
      .innerJoinAndSelect('shipments.shipmentGroup', 'shipmentGroup')
      .where("shipments.is_active = '1'")
      .getRawMany();
    // return shipments;
    // console.log(shipments);

    const configGroup = {
      weight: [],
      // distance: [],
    };
    shipments.forEach((shippingConfig) => {
      const data = {
        upperLimit: shippingConfig.shipments_upper_value,
        price: parseFloat(shippingConfig.shipments_price),
      };
      if (shippingConfig.shipmentGroup_name === 'Weight') {
        configGroup.weight.push(data);
      }
      // else {
      //   configGroup.distance.push(data);
      // }
    });

    return configGroup;
  }
}
