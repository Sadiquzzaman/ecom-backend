import { Injectable, Logger } from '@nestjs/common';
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
  CategoryEntity,
  ConversionService,
  CreateProductDto,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  PermissionService,
  ProductDto,
  ProductEntity,
  PromotionDto,
  PromotionEntity,
  PromotionsSlotEntity,
  PromotionStatus,
  PromotionType,
  RequestService,
  ShopEntity,
  StockPurchaseEntity,
  SystemException,
  UserDto,
  UserEntity,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class ProductService implements GeneralService<ProductDto> {
  private readonly logger = new Logger(ProductService.name);
  private readonly searchClient: ClientProxy;

  constructor(
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
    @InjectRepository(PromotionsSlotEntity)
    private readonly promotionSlotsRepository: Repository<PromotionsSlotEntity>,
    @InjectRepository(StockPurchaseEntity)
    private readonly stockPurchaseRepository: Repository<StockPurchaseEntity>,
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
        relations: ['category'],
      });
      return this.conversionService.toDtos<ProductEntity, ProductDto>(products);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findPopularProducts(): Promise<ProductDto[]> {
    try {
      const query = await this.productRepository.createQueryBuilder('product');

      query
        .where({ ...isActive })
        .andWhere('product.isApproved = :productApproval', {
          productApproval: ActiveStatus.enabled,
        })
        .andWhere('product.isDeleted = :isDeleted', {
          isDeleted: ActiveStatus.disabled,
        })
        .leftJoinAndSelect('product.shop', 'shop')
        .andWhere('shop.isApproved = :shopApproval', {
          shopApproval: ActiveStatus.enabled,
        });

      query.orderBy('product.popular', 'DESC').take(4);

      const products = await query.getMany();

      // await this.productRepository.find({
      //   where: { ...isActive, isApproved: 1 },
      //   take: 4,
      //   order: { popular: 'DESC' },
      // });
      return this.conversionService.toDtos<ProductEntity, ProductDto>(products);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findTrendingProducts(): Promise<ProductDto[]> {
    try {
      const query = await this.productRepository.createQueryBuilder('product');

      query
        .where({ ...isActive })
        .andWhere('product.isApproved = :productApproval', {
          productApproval: ActiveStatus.enabled,
        })
        .andWhere('product.isDeleted = :isDeleted', {
          isDeleted: ActiveStatus.disabled,
        })
        .leftJoinAndSelect('product.shop', 'shop')
        .andWhere('shop.isApproved = :shopApproval', {
          shopApproval: ActiveStatus.enabled,
        });

      query.orderBy('product.trending', 'DESC').take(4);

      const products = await query.getMany();

      // const products = await this.productRepository.find({
      //   where: { ...isActive, isApproved: 1 },
      //   take: 4,
      //   order: { trending: 'DESC' },
      // });
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
        where: { ...where },
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

  async stock(
    page: number,
    limit: number,
    sort: string,
    order: string,
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
        where: { ...where, isApproved: 1, isDeleted: ActiveStatus.disabled },
        take: limit,
        skip: (page - 1) * limit,
        order: {
          [sort !== undefined ? sort : 'name']:
            sort !== undefined ? order : 'ASC',
        },
        relations: [
          'productAttributes',
          'stockItemTransactions',
          'stockPurchases',
        ],
      });
      // for (const product of products) {
      //   console.log(product);
      // }
      return this.conversionService.toPagination<ProductEntity, ProductDto>(
        products,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

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
      // const category = await this.getCategory(id);
      const query = this.productRepository.createQueryBuilder('product');

      query
        .where({ ...isActive })
        .andWhere('product.isApproved = :approveStatus', {
          approveStatus: ActiveStatus.enabled,
        })
        .andWhere('product.isDeleted = :isDeleted', {
          isDeleted: ActiveStatus.disabled,
        })
        .leftJoinAndSelect('product.shop', 'shop')
        .andWhere('shop.isActive = :shopActive', { shopActive: 1 })
        .andWhere('shop.isApproved = :approveStatus', {
          approveStatus: ActiveStatus.enabled,
        })
        .leftJoinAndSelect('product.category', 'category')
        .andWhere('category.id = :categoryId', {
          categoryId: id,
        });

      if (price && price === 'asc') {
        query.orderBy('product.price', 'ASC');
      }
      if (price && price === 'dsc') {
        query.orderBy('product.price', 'DESC');
      }
      if (rating && rating === 'asc') {
        query.orderBy('product.rating', 'ASC');
      }
      if (rating && rating === 'dsc') {
        query.orderBy('product.rating', 'DESC');
      }
      if (algorithm && algorithm === 'latest') {
        query.orderBy('product.updatedAt', 'DESC');
      }
      if (algorithm && algorithm === 'popular') {
        query.orderBy('product.popular', 'DESC');
      }
      if (algorithm && algorithm === 'trending') {
        query.orderBy('product.trending', 'DESC');
      }

      query.skip((page - 1) * limit).take(limit);

      const [product, count] = await query.getManyAndCount();

      const products = await this.conversionService.toDtos<
        ProductEntity,
        ProductDto
      >(product);
      console.log(products, count);

      return [products, count];
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findLatestPromotionsByCategory(id: string): Promise<PromotionDto[]> {
    const productQuery = await this.promotionSlotsRepository.createQueryBuilder(
      'productSlots',
    );

    productQuery
      .where({ ...isActive })
      .andWhere('productSlots.promotionType = :productPromotionType', {
        productPromotionType: PromotionType.Product,
      });

    const productSlots = await productQuery.getOne();

    const query = await this.promotionRepository.createQueryBuilder(
      'promotions',
    );

    query
      .where({ ...isActive })
      .leftJoinAndSelect('promotions.category', 'category')
      .leftJoinAndSelect('promotions.product', 'products')
      .andWhere('category.id = :categoryId', { categoryId: id })
      .andWhere('promotions.type = :promotionType', {
        promotionType: PromotionType.Product,
      })
      .andWhere('promotions.promotionStatus = :publishedpromotion', {
        publishedpromotion: PromotionStatus.PUBLISHED,
      });

    query.orderBy('promotions.updatedAt', 'DESC').take(productSlots.limit);

    const allPromotions = await query.getMany();

    for (const promotions of allPromotions) {
      query.andWhere('DATE(promotions.startDate) <= :startDate', {
        startDate: new Date(),
      });

      query.andWhere('DATE(promotions.endDate) >= :endDate', {
        endDate: new Date(),
      });
    }

    const promotions = await query.getMany();

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
      const query = await this.productRepository.createQueryBuilder('product');

      query
        .where({ ...isActive })
        .andWhere('product.id = :productId', { productId: id })
        .leftJoinAndSelect('product.merchant', 'merchants')
        .leftJoinAndSelect('merchants.user', 'users')
        .leftJoinAndSelect('product.shop', 'shops')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.productAttributes', 'productAttributes')
        .leftJoinAndSelect('productAttributes.attributes', 'attributes')
        .leftJoinAndSelect('attributes.attributeGroup', 'attributeGroup')
        .orderBy('productAttributes.price', 'ASC');

      const product = await query.getOne();
      if (product.category.isRootCategory === 0) {
        query.leftJoinAndSelect('category.parent', 'parnet');
      }
      if (product.category.isRootCategory === 1) {
        query.leftJoinAndSelect('category.children', 'children');
      }
      const pr = await query.getOne();
      return this.conversionService.toDto<ProductEntity, ProductDto>(pr);
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
      product.merchant = product.shop?.merchant;
      product.category = await this.getCategory(dto.categoryID);
      product.rating = 0;
      await this.productRepository.save(product);

      const productDto = await this.conversionService.toDto<
        ProductEntity,
        ProductDto
      >(product);
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
      },
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
