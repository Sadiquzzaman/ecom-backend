import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ActiveStatus,
  ApprovalDto,
  AttributeEntity,
  CategoryEntity,
  ConversionService,
  CreateProductDto,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  MerchantDto,
  MerchantEntity,
  PermissionService,
  ProductDto,
  ProductEntity,
  ProductSearchDto,
  PromotionDto,
  PromotionEntity,
  RequestService,
  ShopEntity,
  StockPurchaseEntity,
  SystemException,
  UserDto,
  UserEntity,
  UserResponseDto,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';
import { ProductAttributeService } from '../../product-attribute/services/product-attribute.service';

@Injectable()
export class MerchantProductService implements GeneralService<ProductDto> {
  private readonly logger = new Logger(MerchantProductService.name);
  private readonly searchClient: ClientProxy;

  constructor(
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ShopEntity)
    private readonly shopRepository: Repository<ShopEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PromotionEntity)
    private readonly promotionRepository: Repository<PromotionEntity>,
    @InjectRepository(StockPurchaseEntity)
    private readonly stockPurchaseRepository: Repository<StockPurchaseEntity>,
    @InjectRepository(AttributeEntity)
    private readonly attributeRepository: Repository<AttributeEntity>,
    private productAttributeService: ProductAttributeService,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly permissionService: PermissionService,
    private readonly requestService: RequestService,
    private readonly configService: ConfigService,
  ) {
    this.searchClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        url: configService.get('SEARCH_SERVICE_URL'),
      },
    });
  }

  updateApprovalStatus = async (dto: ApprovalDto): Promise<[ProductDto[]]> => {
    try {
      const modifiedDto = this.requestService.forUpdate(dto);
      const query = await this.productRepository
        .createQueryBuilder('products')
        .update()
        .set({
          isApproved:
            dto.status === true ? ActiveStatus.enabled : ActiveStatus.disabled,
          approvedBy: dto.updatedBy,
          approvedAt: dto.updatedAt,
          updatedBy: dto.updatedBy,
          updatedAt: dto.updatedAt,
        })
        .whereInIds(dto.ids);
      // console.log(query.getQueryAndParameters());
      const productRs = await query.execute();
      console.log(productRs);

      const products = await this.productRepository
        .createQueryBuilder('products')
        .whereInIds(dto.ids)
        .leftJoinAndSelect('products.category', 'category')
        .leftJoinAndSelect('products.category', 'productAttributes')
        .getMany();
      // console.log('tttttttttttttttttttttttttttttttttttt', products);

      const productsssssssss = await this.conversionService.toDtos<
        ProductEntity,
        ProductDto
      >(products);

      for (const product of productsssssssss) {
        const sendProductInfo = { ...product };
        delete sendProductInfo.isApproved;
        delete sendProductInfo.isDeleted;
        delete sendProductInfo.isRefundable;
        this.indexProductSearch(sendProductInfo);
      }
      return [productsssssssss];
    } catch (error) {
      // console.log('erroe',error);

      throw new SystemException(error);
    }
  };

  async findAll(): Promise<ProductDto[]> {
    try {
      const products = await this.productRepository.find({
        where: { ...isActive, isApproved: 1, isDeleted: ActiveStatus.disabled },
      });
      return this.conversionService.toDtos<ProductEntity, ProductDto>(products);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findPopularProducts(): Promise<ProductDto[]> {
    try {
      const products = await this.productRepository.find({
        where: { ...isActive, isApproved: 1, isDeleted: ActiveStatus.disabled },
        take: 4,
        order: { popular: 'DESC' },
      });
      return this.conversionService.toDtos<ProductEntity, ProductDto>(products);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findTrendingProducts(): Promise<ProductDto[]> {
    try {
      const products = await this.productRepository.find({
        where: { ...isActive, isApproved: 1, isDeleted: ActiveStatus.disabled },
        take: 4,
        order: { trending: 'DESC' },
      });
      return this.conversionService.toDtos<ProductEntity, ProductDto>(products);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async approvalPagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
    approvalLabel: number,
  ): Promise<[ProductDto[], number]> {
    try {
      const user = this.permissionService.returnRequest();
      const where = { ...isActive };
      if (user && user.isMerchant) {
        where['user'] = await this.userRepository.findOne({
          where: { ...isActive, id: user.userId },
        });
      }
      const products = await this.productRepository.findAndCount({
        where: {
          ...where,
          isApproved: approvalLabel,
          isDeleted: ActiveStatus.disabled,
        },
        relations: [
          'shop',
          // 'shop.merchant',
          //  'shop.merchant.user'
        ],
        take: limit,
        skip: (page - 1) * limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
      });

      return this.conversionService.toPagination<ProductEntity, ProductDto>(
        products,
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
    productSearchDto: ProductSearchDto,
  ): Promise<[ProductDto[], number]> {
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

      let where: any = { ...isActive };
      if (user.isMerchant) {
        where = { ...where, merchant: userMerchant };
      }
      let shop = undefined,
        category = undefined;
      if (productSearchDto.shopId) {
        shop = await this.getShop(productSearchDto.shopId);
        if (!shop) {
          return [[], 0];
        }
      }
      if (productSearchDto.categoryId) {
        category = await this.getCategory(productSearchDto.categoryId);
        if (!category) {
          return [[], 0];
        }
      }
      const query = this.productRepository.createQueryBuilder('products');
      query
        .where({ ...where })
        .andWhere('products.isDeleted = :isDeleted', {
          isDeleted: ActiveStatus.disabled,
        })
        .leftJoinAndSelect('products.shop', 'shop')
        .leftJoinAndSelect('products.category', 'category')
        .leftJoinAndSelect('shop.merchant', 'merchant');

      if (productSearchDto.name) {
        query.andWhere('lower(products.name) like :productName', {
          productName: `%${productSearchDto.name.toLowerCase()}%`,
        });
      }

      if (productSearchDto.shopId) {
        query.andWhere('shop.id = :shopId', {
          shopId: shop.id,
        });
      }
      if (productSearchDto.categoryId) {
        query.andWhere('category.id = :categoryId', {
          categoryId: category.id,
        });
      }

      if (
        productSearchDto.isApproved &&
        (productSearchDto.isApproved === '0' ||
          productSearchDto.isApproved === '1')
      ) {
        query.andWhere('products.isApproved = :productApproval', {
          productApproval: productSearchDto.isApproved,
        });
      }

      query
        .orderBy('products.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [product, count] = await query.getManyAndCount();

      const products = await this.conversionService.toDtos<
        ProductEntity,
        ProductDto
      >(product);

      console.log(count);

      return [products, count];
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

  async stock(
    page: number,
    limit: number,
    sort: string,
    order: string,
    productSearchDto: ProductSearchDto,
  ): Promise<[ProductDto[], number]> {
    try {
      const userSession: UserResponseDto =
        await this.requestService.userSession();

      const merchant = await this.getMerchantById(userSession.MerchantId);

      const query = await this.productRepository.createQueryBuilder('products');

      query
        .andWhere({ ...isActive })
        .andWhere('products.isDeleted = :isDeleted', {
          isDeleted: ActiveStatus.disabled,
        })
        .leftJoinAndSelect('products.productAttributes', 'productAttributes')
        .leftJoinAndSelect('products.category', 'category')
        .leftJoinAndSelect('products.shop', 'shop')
        .leftJoinAndSelect(
          'products.stockItemTransactions',
          'stockItemTransactions',
        )
        .leftJoinAndSelect('products.stockPurchases', 'stockPurchases')
        .leftJoinAndSelect('products.merchant', 'merchants')
        .andWhere('merchants.id = :merchantId', { merchantId: merchant.id });

      if (productSearchDto.name && productSearchDto.name.length > 0) {
        query.andWhere('lower(products.name) like :productName', {
          productName: `%${productSearchDto.name.toLowerCase()}%`,
        });
      }

      if (
        productSearchDto.categoryId &&
        productSearchDto.categoryId.length > 0
      ) {
        query.andWhere('category.id = :categoryId', {
          categoryId: productSearchDto.categoryId,
        });
      }

      if (productSearchDto.shopId && productSearchDto.shopId.length > 0) {
        query.andWhere('shop.id = :shopId', {
          shopId: productSearchDto.shopId,
        });
      }

      query
        .orderBy('products.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [product, count] = await query.getManyAndCount();

      const products = await this.conversionService.toDtos<
        ProductEntity,
        ProductDto
      >(product);

      return [products, count];
    } catch (error) {
      throw new SystemException(error);
    }
  }
  getMerchantById = async (merchantId: string): Promise<MerchantEntity> => {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: {
          ...isActive,
          id: merchantId,
          isApproved: 1,
          isDeleted: ActiveStatus.disabled,
        },
      });
      if (!merchant) {
        throw new SystemException(
          new ForbiddenException(
            'Sorry !!! Your Merchant Account is not approved yet',
          ),
        );
      }
      return merchant;
    } catch (error) {
      throw new SystemException(error);
    }
  };

  /*********************** for frontend start ***********************/
  async findByCategoryPagination(
    id: string,
    page: number,
    limit: number,
    price: string,
    rating: string,
    algorithm: string,
  ): Promise<[ProductDto[], number]> {
    try {
      const category = await this.getCategory(id);
      let order: any = {};
      if (price && price === 'asc') {
        order = { ...order, price: 'ASC' };
      }
      if (price && price === 'dsc') {
        order = { ...order, price: 'DESC' };
      }
      if (rating && rating === 'asc') {
        order = { ...order, rating: 'ASC' };
      }
      if (rating && rating === 'dsc') {
        order = { ...order, rating: 'DESC' };
      }
      if (algorithm && algorithm === 'latest') {
        order = { ...order, updatedAt: 'DESC' };
      }
      if (algorithm && algorithm === 'popular') {
        order = { ...order, popular: 'DESC' };
      }
      if (algorithm && algorithm === 'trending') {
        order = { ...order, trending: 'DESC' };
      }
      const products = await this.productRepository.findAndCount({
        where: {
          category,
          ...isActive,
          isApproved: 1,
          isDeleted: ActiveStatus.disabled,
        },
        take: limit,
        skip: (page - 1) * limit,
        order: order,
      });
      return this.conversionService.toPagination<ProductEntity, ProductDto>(
        products,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findLatestPromotionsByCategory(id: string): Promise<PromotionDto[]> {
    const category = await this.getCategory(id);

    const promotions = await this.promotionRepository.find({
      where: {
        category,
        ...isActive,
      },
      relations: ['product'],
      take: 2,
      order: { updatedAt: 'DESC' },
    });
    return this.conversionService.toDtos<PromotionEntity, PromotionDto>(
      promotions,
    );
  }

  productWishlist = async (
    productId: string,
    userId: string,
  ): Promise<UserDto> => {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, ...isActive },
        relations: ['wishlist'],
      });

      const product = await this.productRepository.findOne({
        id: productId,
        ...isActive,
        isApproved: 1,
        isDeleted: ActiveStatus.disabled,
      });
      if (user.wishlist) {
        console.log('user:yes');
        user.wishlist.push(product);
      } else {
        user.wishlist = [product];
      }
      await this.userRepository.save(user);
      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  removewishlist = async (id: string): Promise<UserDto> => {
    try {
      const userId = this.permissionService.returnRequest().userId;
      const user = await this.userRepository.findOne({
        where: { id: userId, ...isActive },
        relations: ['wishlist'],
      });

      const product = await this.productRepository.findOne({
        id,
        ...isActive,
      });

      if (user.wishlist) {
        user.wishlist = user.wishlist.filter(
          (currentProduct) => currentProduct.id !== product.id,
        );
      }
      await this.userRepository.save(user);
      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  async findByShopPagination(
    id: string,
    page: number,
    limit: number,
  ): Promise<[ProductDto[], number]> {
    try {
      const shop = await this.getShop(id);

      const products = await this.productRepository.findAndCount({
        where: {
          shop,
          ...isActive,
          isApproved: 1,
          isDeleted: ActiveStatus.disabled,
        },
        take: limit,
        skip: (page - 1) * limit,
        order: { updatedAt: 'DESC' },
      });
      return this.conversionService.toPagination<ProductEntity, ProductDto>(
        products,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }
  /*********************** for frontend end ***********************/

  async findById(id: string, relation = true): Promise<ProductDto> {
    try {
      const product = await this.productRepository.findOne({
        where: {
          id,
          ...isActive,
          // isApproved: 1,
        },
        relations: relation
          ? [
              'user',
              'shop',
              'category',
              'productAttributes',
              'productAttributes.attributes',
              'productAttributes.attributes.attributeGroup',
            ]
          : [],
      });
      return this.conversionService.toDto<ProductEntity, ProductDto>(product);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(dto: ProductDto): Promise<ProductDto[]> {
    try {
      const products = await this.productRepository.find({
        where: {
          ...dto,
          ...isActive,
          isApproved: 1,
          isDeleted: ActiveStatus.disabled,
        },
      });
      return this.conversionService.toDtos<ProductEntity, ProductDto>(products);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByUser(id: string, relation = false): Promise<ProductDto[]> {
    try {
      const user = await this.getUser(id);
      const products = await this.productRepository.find({
        where: {
          user,
          ...isActive,
          isApproved: 1,
          isDeleted: ActiveStatus.disabled,
        },
        relations: relation ? ['category'] : [],
      });
      return this.conversionService.toDtos<ProductEntity, ProductDto>(products);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        ProductEntity,
        ProductDto
      >(dto);

      const product = await this.productRepository.create(dtoToEntity);

      product.user = await this.getUser(dto.userID);
      product.shop = await this.getShop(dto.shopID);
      product.location = product.shop?.location;
      product.geoLocation = product.shop?.geoLocation;
      product.category = await this.getCategory(dto.categoryID);
      product.rating = 0;
      product.merchant = product?.shop?.merchant;

      await this.productRepository.save(product);

      const productDto = await this.conversionService.toDto<
        ProductEntity,
        ProductDto
      >(product);

      if (dto.hasProductAttribute === 0) {
        const productDefaultAttr = await this.attributeRepository.findOne({
          name: 'Default',
        });

        const productAtts: any[] = [
          {
            reference: `${product.reference}-default`,
            quantity: product.quantity,
            reserved: 0,
            sold: 0,
            price: product.price,
            weight: product.weight,
            purchasedPrice: product.purchasedPrice,
            discount: product.discount,
            wholesalePrice: product.wholesalePrice,
            additionalShippingCost: product.additionalShippingCost,
            image: product.image.cover,
            productID: product.id,
            attributesID: [
              {
                id: productDefaultAttr.id,
              },
            ],
          },
        ];
        const modifiedDtos: any[] = [];
        for (const productAtt of productAtts) {
          modifiedDtos.push(this.requestService.forCreate(productAtt));
        }
        const productAttributes =
          this.productAttributeService.bulkCreate(modifiedDtos);
        console.log(productAttributes);
      }
      await this.processStockPurchase(dto, product);
      // this.indexProductSearch(productDto);
      return productDto;
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async processStockPurchase(
    dto: CreateProductDto,
    product: ProductEntity,
  ): Promise<void> {
    try {
      if (dto.hasProductAttribute) {
        return;
      }
      const stockPurchase = new StockPurchaseEntity();
      stockPurchase.createAt = new Date();
      stockPurchase.updatedAt = new Date();
      stockPurchase.createdBy = product.createdBy;
      stockPurchase.updatedBy = product.updatedBy;
      stockPurchase.product = product;
      stockPurchase.quantity = product.quantity;
      stockPurchase.inHand = product.quantity;
      stockPurchase.purchasedPrice = product.purchasedPrice;
      await this.stockPurchaseRepository.save(stockPurchase);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: CreateProductDto): Promise<ProductDto> {
    try {
      const oldProduct = await this.getProduct(id);
      // console.log({ oldProduct });

      if (dto.userID) oldProduct.user = await this.getUser(dto.userID);
      if (dto.shopID) oldProduct.shop = await this.getShop(dto.shopID);
      if (dto.categoryID)
        oldProduct.category = await this.getCategory(dto.categoryID);

      const savedDto = { ...oldProduct, ...dto };
      const productEntity = await this.conversionService.toEntity<
        ProductEntity,
        ProductDto
      >(savedDto);

      const updatedProduct = await this.productRepository.save(productEntity, {
        reload: true,
      });

      const productDto = await this.conversionService.toDto<
        ProductEntity,
        ProductDto
      >(updatedProduct);

      const sendProductInfo = { ...oldProduct.category, ...productDto };
      delete sendProductInfo.isApproved;
      delete sendProductInfo.isDeleted;
      delete sendProductInfo.isRefundable;
      this.indexProductSearch(sendProductInfo);
      return productDto;
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getProduct(id);

      const deleted = await this.productRepository.save({
        ...saveDto,
        ...isInActive,
      });

      this.removeProductFromIndex(id);
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /*********************************** relations ******************************/

  getProduct = async (id: string): Promise<ProductEntity> => {
    const product = await this.productRepository.findOne({
      where: {
        id,
        ...isActive,
        isApproved: 1,
        isDeleted: ActiveStatus.disabled,
      },
      relations: ['category', 'productAttributes'],
    });
    this.exceptionService.notFound(product, 'Product not found!!');
    return product;
  };

  getUser = async (id: string): Promise<UserEntity> => {
    const user = await this.userRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(user, 'User not found!!');
    return user;
  };

  getShop = async (id: string): Promise<ShopEntity> => {
    const shop = await this.shopRepository.findOne({
      where: {
        id,
        ...isActive,
        isApproved: 1,
        // isDeleted: ActiveStatus.disabled,
      },
      relations: ['merchant'],
    });
    this.exceptionService.notFound(shop, 'Shop Not Found!!');
    return shop;
  };

  getCategory = async (id: string): Promise<CategoryEntity> => {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(category, 'Category Not Found!!');
    return category;
  };

  indexProductSearch = (productDto: ProductDto) => {
    this.searchClient
      .send({ service: 'products', cmd: 'post', method: 'index' }, productDto)
      .subscribe();
  };

  removeProductFromIndex = (id: string) => {
    this.searchClient
      .send({ service: 'product', cmd: 'delete', method: 'remove' }, id)
      .subscribe();
  };
}
