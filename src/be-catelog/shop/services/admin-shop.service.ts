import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ApprovalDto,
  ConversionService,
  CreateShopDto,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  MerchantEntity,
  PermissionService,
  PromotionDto,
  PromotionEntity,
  ShopDto,
  ShopEntity,
  ShopTypeEntity,
  SystemException,
  UserDto,
  UserEntity,
  RequestService,
  ActiveStatus,
  ShopSearchDto,
  MerchantDto,
  ShopTypeDto,
  ShopManagerAssignShopDto,
  ShopManagerDto,
  ShopManagerEntity,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class AdminShopService implements GeneralService<ShopDto> {
  private readonly searchClient: ClientProxy;

  constructor(
    @InjectRepository(ShopEntity)
    private readonly shopRepository: Repository<ShopEntity>,
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(ShopTypeEntity)
    private readonly typeRepository: Repository<ShopTypeEntity>,
    @InjectRepository(ShopManagerEntity)
    private readonly shopManagerRepository: Repository<ShopManagerEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PromotionEntity)
    private readonly promotionRepository: Repository<PromotionEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly permissionService: PermissionService,
    private readonly configService: ConfigService,
    private readonly requestService: RequestService,
  ) {
    this.searchClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        url: configService.get('SEARCH_SERVICE_URL'),
      },
    });
  }

  async findAll(): Promise<ShopDto[]> {
    try {
      const shops = await this.shopRepository.find({
        where: { ...isActive, isApproved: 1 },
        relations: ['shopType'],
      });
      return this.conversionService.toDtos<ShopEntity, ShopDto>(shops);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findPopularShops(): Promise<ShopDto[]> {
    try {
      const shops = await this.shopRepository.find({
        where: { ...isActive, isApproved: 1 },
        take: 4,
        order: { popular: 'DESC' },
      });
      return this.conversionService.toDtos<ShopEntity, ShopDto>(shops);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findTrendingShops(): Promise<ShopDto[]> {
    try {
      const shops = await this.shopRepository.find({
        where: { ...isActive, isApproved: 1 },
        take: 4,
        order: { trending: 'DESC' },
      });
      return this.conversionService.toDtos<ShopEntity, ShopDto>(shops);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
    shopSearchDto: ShopSearchDto,
  ): Promise<[ShopDto[], number]> {
    try {
      let userMerchant;
      let shopType;
      const userInfo = await this.permissionService.returnRequest();
      // console.log(userInfo);

      if (shopSearchDto.merchantId) {
        userMerchant = await this.getMerchantById(shopSearchDto.merchantId);
        if (!userMerchant) {
          return [[], 0];
        }
      }
      if (shopSearchDto.shopTypeId) {
        shopType = await this.getShopTypeById(shopSearchDto.shopTypeId);
        if (!shopType) {
          return [[], 0];
        }
      }

      console.log(shopType);
      const query = this.shopRepository.createQueryBuilder('shops');
      query
        .where({ ...isActive })
        .leftJoinAndSelect('shops.shopType', 'shopType')
        .leftJoinAndSelect('shops.merchant', 'merchant')
        .leftJoinAndSelect('shops.shopManagers', 'shopManager')
        .leftJoinAndSelect('merchant.user', 'user');

      if (userInfo.isShopManager === true) {
        query.andWhere('shopManager.id = :shopManagerId', {
          shopManagerId: userInfo.ShopManagerId,
        });
      }
      if (shopSearchDto.name) {
        query.andWhere('lower(shops.name) like :shopName', {
          shopName: `%${shopSearchDto.name.toLowerCase()}%`,
        });
      }
      if (shopSearchDto.merchantId) {
        query.andWhere('merchant.id = :userMerchantId', {
          userMerchantId: userMerchant.id,
        });
      }
      if (shopSearchDto.shopTypeId) {
        query.andWhere('shopType.id = :shopTypeId', {
          shopTypeId: shopType.id,
        });
      }
      query
        .orderBy('shops.updatedAt', 'DESC')
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
  }

  getShopTypeById = async (shopTypeId: string): Promise<ShopTypeDto> => {
    try {
      const getShopType = await this.typeRepository.findOne({
        where: { ...isActive, id: shopTypeId },
      });
      if (!getShopType) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! This ShopType is not found'),
        );
      }
      const shopType = await this.conversionService.toDto<
        ShopTypeEntity,
        ShopTypeDto
      >(getShopType);

      return shopType;
    } catch {}
  };

  getMerchantById = async (merchantId: string): Promise<MerchantDto> => {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: { ...isActive, id: merchantId, isApproved: 1 },
      });
      if (!merchant) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! This Merchant is not approved yet'),
        );
      }
      // this.exceptionService.notFound(users, 'No merchant found!!');
      const user = await this.conversionService.toDto<
        MerchantEntity,
        MerchantDto
      >(merchant);
      return user;
    } catch (error) {
      throw new SystemException(error);
    }
  };

  followShop = async (shopId: string, userId: string): Promise<UserDto> => {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, ...isActive },
        relations: ['followingShops'],
      });

      const shop = await this.shopRepository.findOne({
        id: shopId,
        ...isActive,
        isApproved: 1,
      });
      if (user.followingShops) {
        user.followingShops.push(shop);
      } else {
        user.followingShops = [shop];
      }
      await this.userRepository.save(user);
      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  unFollowShop = async (id: string): Promise<UserDto> => {
    try {
      const userId = this.permissionService.returnRequest().userId;
      const user = await this.userRepository.findOne({
        where: { id: userId, ...isActive },
        relations: ['followingShops'],
      });

      const shop = await this.shopRepository.findOne({
        id,
        ...isActive,
      });

      if (user.followingShops) {
        console.log('befor:', user.followingShops.length);
        user.followingShops = user.followingShops.filter(
          (curShop) => curShop.id !== shop.id,
        );
        console.log('after:', user.followingShops.length);
      }
      await this.userRepository.save(user);
      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  async findById(id: string, relation = true): Promise<ShopDto> {
    try {
      console.log('Find by ID');

      const shop = await this.shopRepository.findOne({
        where: {
          id,
          ...isActive,
          isApproved: 1,
        },
        relations: relation ? ['shopType', 'merchant', 'shopManagers'] : [],
      });
      return this.conversionService.toDto<ShopEntity, ShopDto>(shop);
    } catch (error) {
      throw new SystemException(error);
    }
  }
  async getShopManagerById(id: string): Promise<ShopManagerDto> {
    try {
      const shopManager = await this.shopManagerRepository.findOne({
        where: {
          id,
        },
        relations: ['shops'],
      });
      return this.conversionService.toDto<ShopManagerEntity, ShopManagerDto>(
        shopManager,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(dto: ShopDto): Promise<ShopDto[]> {
    try {
      const shops = await this.shopRepository.find({
        where: { ...dto, ...isActive, isApproved: 1 },
      });
      return this.conversionService.toDtos<ShopEntity, ShopDto>(shops);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /*********************** for frontend start ***********************/
  async findByTypePagination(
    id: string,
    page: number,
    limit: number,
    rating: string,
    algorithm: string,
  ): Promise<[ShopDto[], number]> {
    try {
      const shopType = await this.getShopType(id);
      let order = {};
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
      const shops = await this.shopRepository.findAndCount({
        where: {
          shopType,
          ...isActive,
          isApproved: 1,
        },
        take: limit,
        skip: (page - 1) * limit,
        order: order,
      });
      return this.conversionService.toPagination<ShopEntity, ShopDto>(shops);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findLatestPromotionsByType(id: string): Promise<PromotionDto[]> {
    const shopType = await this.getShopType(id);

    const promotions = await this.promotionRepository.find({
      where: {
        shopType,
        ...isActive,
      },
      relations: ['shop'],
      take: 2,
      order: { updatedAt: 'DESC' },
    });
    return this.conversionService.toDtos<PromotionEntity, PromotionDto>(
      promotions,
    );
  }

  async findByName(name: string): Promise<ShopDto> {
    try {
      const shop = await this.shopRepository.findOne({
        where: { name, ...isActive, isApproved: 1 },
        relations: ['shopType'],
      });
      return this.conversionService.toDto<ShopEntity, ShopDto>(shop);
    } catch (error) {
      throw new SystemException(error);
    }
  }
  /*********************** for frontend end ***********************/

  async findByMerchant(id: string, relation = false): Promise<ShopDto[]> {
    try {
      const user = await this.getUserMerchant(id);
      const merchant = user.merchant;
      const shops = await this.shopRepository.find({
        where: {
          merchant,
          ...isActive,
          isApproved: 1,
        },
        relations: relation ? ['shopType'] : [],
      });
      return this.conversionService.toDtos<ShopEntity, ShopDto>(shops);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByType(id: string): Promise<ShopDto[]> {
    try {
      const shopType = await this.getShopType(id);
      const shops = await this.shopRepository.find({
        where: {
          shopType,
          ...isActive,
          isApproved: 1,
        },
      });
      return this.conversionService.toDtos<ShopEntity, ShopDto>(shops);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async shopCountByMerchant(id: string): Promise<any> {
    const userRepo = this.userRepository.createQueryBuilder('user');
    const user = await userRepo
      .innerJoinAndSelect('user.merchant', 'merchant')
      .where('user.id=:id', { id })
      .getOne();
    const merchantId = user.merchant.id;
    const shopRepo = this.shopRepository.createQueryBuilder('shop');
    const shops = await shopRepo
      .leftJoin('shop.merchant', 'merchant')
      .where('merchant.id=:id', { id: merchantId })
      .getCount();
    return shops;
  }

  async create(dto: CreateShopDto): Promise<ShopDto> {
    try {
      const merchant = await this.getMerchant(dto.merchantID);
      const shopCount = await this.shopRepository.count({
        where: {
          merchant,
          ...isActive,
        },
      });

      if (shopCount <= 1000) {
        const dtoToEntity = await this.conversionService.toEntity<
          ShopEntity,
          ShopDto
        >(dto);

        dtoToEntity.merchant = merchant;

        dtoToEntity.shopType = await this.getShopType(dto.shopTypeID);

        if (dtoToEntity.commission === 0) {
          dtoToEntity.commission = dtoToEntity.shopType.commission;
        }

        const shop = this.shopRepository.create(dtoToEntity);
        shop.rating = 0;

        await this.shopRepository.save(shop);
        const shopDto = await this.conversionService.toDto<ShopEntity, ShopDto>(
          shop,
        );
        this.indexShopSearch(shopDto);
        return shopDto;
      } else {
        const error = { message: 'You have exceeded your shop limit!' };
        throw new SystemException(error);
      }
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: CreateShopDto): Promise<ShopDto> {
    try {
      const saveDto = await this.getShop(id);

      if (dto.merchantID) {
        saveDto.merchant = await this.getMerchant(dto.merchantID);
      }

      if (dto.shopTypeID) {
        saveDto.shopType = await this.getShopType(dto.shopTypeID);
      }

      const dtoToEntity = await this.conversionService.toEntity<
        ShopEntity,
        ShopDto
      >({ ...saveDto, ...dto });

      const updatedDto = await this.shopRepository.save(dtoToEntity, {
        reload: true,
      });

      const shopDto = await this.conversionService.toDto<ShopEntity, ShopDto>(
        updatedDto,
      );
      if (dto.shopManagerId) {
        // const shopManager = await this.getShopManagerById(dto.shopManagerId);
        const managerDto: ShopManagerAssignShopDto = null;
        managerDto.shopManager = dto.shopManagerId;
        managerDto.shops = [shopDto.id];

        await this.assignShopMangerShop(managerDto);
      }
      this.indexShopSearch(shopDto);
      return shopDto;
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getShop(id);

      const deleted = await this.shopRepository.save({
        ...saveDto,
        ...isInActive,
      });
      this.removeShopFromIndex(id);
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** relations **********************/

  getShop = async (id: string): Promise<ShopEntity> => {
    const shop = await this.shopRepository.findOne({
      where: {
        id,
        ...isActive,
        isApproved: 1,
      },
      relations: ['shopType'],
    });
    this.exceptionService.notFound(shop, 'Shop not found!!');
    return shop;
  };

  getUserMerchant = async (id: string): Promise<UserEntity> => {
    const query = this.userRepository.createQueryBuilder('user');
    const user = await query
      .innerJoinAndSelect('user.merchant', 'merchant')
      .where('user.id=:id', { id })
      .getOne();
    this.exceptionService.notFound(user, 'Merchant not found!!');
    return user;
  };

  getMerchant = async (id: string): Promise<MerchantEntity> => {
    const merchant = await this.merchantRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(merchant, 'Merchant not found!!');
    return merchant;
  };

  getShopType = async (id: string): Promise<ShopTypeEntity> => {
    const shopType = await this.typeRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(shopType, 'Shop Type not found!!');
    return shopType;
  };

  indexShopSearch = (shopDto: ShopDto) => {
    this.searchClient
      .send({ service: 'shops', cmd: 'post', method: 'index' }, shopDto)
      .subscribe();
  };

  removeShopFromIndex = (id: string) => {
    this.searchClient
      .send({ service: 'shops', cmd: 'delete', method: 'remove' }, id)
      .subscribe();
  };

  async shopByApprovalStatus(
    page: number,
    limit: number,
    sort: string,
    order: string,
    is_approved: number,
  ): Promise<[ShopDto[], number]> {
    try {
      const userInfo = await this.permissionService.returnRequest();
      console.log({ userInfo });

      const userId = this.permissionService.returnRequest().userId;
      const where = { ...isActive, isApproved: is_approved };
      const user = await this.userRepository.findOne({
        where: { ...isActive, id: userId },
        relations: ['merchant'],
      });

      if (user.merchant) {
        where['merchant'] = user.merchant;
      }
      const conditions = {};
      if (userInfo.isShopManager === true) {
        // conditions['shopManagers.id'] = userInfo.ShopManagerId;
        throw new ForbiddenException(
          'Shop Manager does not Allow to view Shops List',
        );
      }
      const shops = await this.shopRepository.findAndCount({
        relations: ['merchant', 'merchant.user', 'shopType'],
        where: { ...where, ...conditions },
        take: limit,
        skip: (page - 1) * limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
      });
      return this.conversionService.toPagination<ShopEntity, ShopDto>(shops);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async updateApprovalStatus(dto: ApprovalDto): Promise<[ShopDto[]]> {
    // const result = await Promise.all(
    //   dto.shppIds.map(async (id: string) => {

    //     const saveDto = await this.getShop(id)

    //     saveDto.isApproved = dto.isApproved

    //     const dtoToEntity = await this.conversionService.toEntity<
    //       ShopEntity,
    //       ShopDto
    //     >({ ...saveDto});

    //     const updatedDto = await this.shopRepository.save(dtoToEntity, {
    //       reload: true,
    //     });

    //     const shopDto = await this.conversionService.toDto<ShopEntity, ShopDto>(
    //       updatedDto,
    //     );
    //     this.indexShopSearch(shopDto);
    //     return shopDto;
    //   }),
    // );
    // return result

    try {
      const modifiedDto = this.requestService.forUpdate(dto);
      const query = await this.shopRepository
        .createQueryBuilder('shops')
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
      const merchantRs = await query.execute();
      console.log(merchantRs);

      const shops = await this.shopRepository
        .createQueryBuilder('shops')
        .whereInIds(dto.ids)
        .getMany();

      const selectedShops = await this.conversionService.toDtos<
        ShopEntity,
        ShopDto
      >(shops);
      for (const selectedShop of selectedShops) {
        this.indexShopSearch(selectedShop);
      }
      return [selectedShops];
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async assignShopMangerShop(
    dto: ShopManagerAssignShopDto,
  ): Promise<ShopManagerDto> {
    try {
      const shopManager = await this.shopManagerRepository.findOne({
        where: {
          id: dto.shopManager,
        },
        relations: ['shops'],
      });
      if (shopManager) {
        // const shops = await this.shopRepository.findByIds(dto.shops);
        const shops = await this.shopRepository
          .createQueryBuilder()
          .whereInIds(dto.shops)
          .getMany();
        shopManager.shops = shops;
        // shopManager.save();
        await this.shopManagerRepository.save(shopManager);
      }
      return this.conversionService.toDto<ShopManagerEntity, ShopManagerDto>(
        shopManager,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // getShopManagerAllShopListIds = (shopManagerId: string): Promise<any[]> => {
  //   try {
  //     const userId = this.permissionService.returnRequest().;
  //     const where = { ...isActive };
  //     const user = await this.userRepository.findOne({
  //       where: { ...isActive, id: userId },
  //       relations: ['merchant'],
  //     });

  //     const shops = await this.shopRepository.findAndCount({
  //       where: { ...where },
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       order: {
  //         [sort !== 'undefined' ? sort : 'updatedAt']:
  //           sort !== 'undefined' ? order : 'DESC',
  //       },
  //       relations: ['shop', 'merchant.user', 'shopType'],
  //     });
  //     return this.conversionService.toPagination<ShopEntity, ShopDto>(shops);
  //   } catch (error) {
  //     throw new SystemException(error);
  //   }
  // };

  shopSolrReset = () => {
    try {
      this.findAll()
        .then((shops) => {
          // console.log({ L: products.length });

          this.searchClient
            .send({ service: 'shops', cmd: 'post', method: 'rebase' }, shops)
            .subscribe();
        })
        .catch((err) => {
          console.log({ err });
        });
    } catch (error) {}
    // productDtos.forEach((productDto) => this.indexProductSearch(productDto));
  };
}
