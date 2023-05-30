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
  UserResponseDto,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class MerchantShopService implements GeneralService<ShopDto> {
  private readonly searchClient: ClientProxy;

  constructor(
    @InjectRepository(ShopEntity)
    private readonly shopRepository: Repository<ShopEntity>,
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(ShopTypeEntity)
    private readonly typeRepository: Repository<ShopTypeEntity>,
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

  merchantShopPagination = async (
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    shopSearch: ShopSearchDto,
  ): Promise<[ShopDto[], number]> => {
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
      if (shopSearch.shopTypeId) {
        var shopType = await this.getShopTypeById(shopSearch.shopTypeId);
        if (!shopType) {
          return [[], 0];
        }
      }
      console.log({ userMerchant });
      const query = this.shopRepository.createQueryBuilder('shops');
      query
        .where({ ...where })
        .leftJoinAndSelect('shops.shopType', 'shopType')
        .leftJoinAndSelect('shops.merchant', 'merchant')
        .leftJoinAndSelect('merchant.user', 'user');
      if (shopSearch.isApproved) {
        query.andWhere('shops.isApproved = :isApproved', {
          isApproved: shopSearch.isApproved === '1' ? '1' : '0',
        });
      }
      if (shopSearch.name) {
        query.andWhere('lower(shops.name) like :shopName', {
          shopName: `%${shopSearch.name.toLowerCase()}%`,
        });
      }

      if (shopSearch.shopTypeId) {
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
  };

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

  async findAll(): Promise<ShopDto[]> {
    try {
      const userSession: UserResponseDto =
        await this.requestService.userSession();
      const query = await this.shopRepository.createQueryBuilder('shops');

      query
        .where({ ...isActive })
        .andWhere('shops.isApproved = :isApproved', { isApproved: 1 })
        .leftJoinAndSelect('shops.merchant', 'merchant');

      query.andWhere('merchant.id = :merchantId', {
        merchantId: userSession.MerchantId,
      });

      const shops = await query.getMany();
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
      const query = await this.shopRepository.createQueryBuilder('shop');
      query
        .leftJoinAndSelect('shop.shopType', 'shopType')
        .leftJoinAndSelect('shop.merchant', 'merchant')
        .leftJoinAndSelect('merchant.user', 'user');

      const shops = await query.getManyAndCount();
      return this.conversionService.toPagination<ShopEntity, ShopDto>(shops);
    } catch (error) {
      throw new SystemException(error);
    }
  }

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
      const shop = await this.shopRepository.findOne({
        where: {
          id,
          ...isActive,
          isApproved: 1,
        },
        relations: relation ? ['shopType', 'merchant'] : [],
      });
      return this.conversionService.toDto<ShopEntity, ShopDto>(shop);
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
      const userId = this.permissionService.returnRequest().userId;
      const where = { ...isActive, isApproved: is_approved };
      const user = await this.userRepository.findOne({
        where: { ...isActive, id: userId },
        relations: ['merchant'],
      });

      if (user.merchant) {
        where['merchant'] = user.merchant;
      }

      const shops = await this.shopRepository.findAndCount({
        where: { ...where },
        take: limit,
        skip: (page - 1) * limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
        relations: ['merchant', 'merchant.user', 'shopType'],
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
}
