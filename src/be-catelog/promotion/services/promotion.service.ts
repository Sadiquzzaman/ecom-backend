import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ActiveStatus,
  ApprovalDto,
  Bool,
  CategoryEntity,
  CheckPromotionSlotDto,
  ConversionService,
  CreatePromotionDto,
  DeleteDto,
  ExceptionService,
  GeneralService,
  InvoiceStatus,
  isActive,
  isInActive,
  MerchantEntity,
  PermissionService,
  ProductEntity,
  PromotionDto,
  PromotionEntity,
  PromotionInvoiceEntity,
  PromotionSearchDto,
  PromotionsSlotEntity,
  PromotionStatus,
  PromotionType,
  RequestService,
  ShopEntity,
  ShopTypeEntity,
  SslPrepareDto,
  SslPrepareEntity,
  SslProductProfileEnum,
  SslResponseDto,
  SslShippingMethodEnum,
  SystemException,
  TransMasterEntity,
  UserEntity,
  UserResponseDto,
} from '@simec/ecom-common';
import { randomUUID } from 'crypto';
import moment from 'moment';
import SSLCommerz from 'sslcommerz-nodejs';
import { Repository } from 'typeorm';

@Injectable()
export class PromotionService implements GeneralService<PromotionDto> {
  private readonly logger = new Logger(PromotionService.name);
  private readonly searchClient: ClientProxy;
  // private readonly configService: ConfigService;

  constructor(
    @InjectRepository(PromotionEntity)
    private readonly promotionRepository: Repository<PromotionEntity>,
    @InjectRepository(PromotionsSlotEntity)
    private readonly promotionSlotRepository: Repository<PromotionsSlotEntity>,
    @InjectRepository(PromotionsSlotEntity)
    private readonly promoSlotRepository: Repository<PromotionsSlotEntity>,
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(ShopEntity)
    private readonly shopRepository: Repository<ShopEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ShopTypeEntity)
    private readonly shopTypeRepository: Repository<ShopTypeEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(TransMasterEntity)
    private readonly transMasterRepository: Repository<TransMasterEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PromotionInvoiceEntity)
    private readonly promotionInvoiceRepository: Repository<PromotionInvoiceEntity>,
    @InjectRepository(SslPrepareEntity)
    private readonly sslPrepareRepository: Repository<SslPrepareEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly permissionService: PermissionService,
    private readonly requestService: RequestService,
    private readonly configService: ConfigService,
  ) {}

  async promotionByApprovalStatus(
    page: number,
    limit: number,
    sort: string,
    order: string,
    promotionSearchDto: PromotionSearchDto,
  ): Promise<[PromotionDto[], number]> {
    try {
      const query = await this.promotionRepository.createQueryBuilder(
        'promotions',
      );

      query
        .where({ ...isActive })
        .leftJoinAndSelect('promotions.shop', 'shop')
        .leftJoinAndSelect('promotions.product', 'product')
        .andWhere('promotions.isApproved = :approvedStatus', {
          approvedStatus: promotionSearchDto.isApproved,
        });

      query
        .orderBy('promotions.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [promotion, count] = await query.getManyAndCount();

      const promotions = await this.conversionService.toDtos<
        PromotionEntity,
        PromotionDto
      >(promotion);

      return [promotions, count];
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async updateApprovalStatus(dto: ApprovalDto): Promise<[PromotionDto[]]> {
    try {
      const modifiedDto = this.requestService.forUpdate(dto);
      const query = await this.promotionRepository
        .createQueryBuilder('promotions')
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

      const promotions = await this.promotionRepository
        .createQueryBuilder('promotions')
        .whereInIds(dto.ids)
        .getMany();

      const selectedPromotions = await this.conversionService.toDtos<
        PromotionEntity,
        PromotionDto
      >(promotions);
      return [selectedPromotions];
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findAll(): Promise<PromotionDto[]> {
    try {
      const promotions = await this.promotionRepository.find({
        where: { ...isActive },
      });
      return this.conversionService.toDtos<PromotionEntity, PromotionDto>(
        promotions,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async getLatestPromotions(): Promise<PromotionDto[]> {
    try {
      const promotionsSlotsQuery =
        await this.promotionSlotRepository.createQueryBuilder('promotionsSlot');

      promotionsSlotsQuery
        .andWhere({ ...isActive })
        .andWhere('promotionsSlot.promotionType = :productPromotionType', {
          productPromotionType: PromotionType.Banner,
        });

      const bannerSlots = await promotionsSlotsQuery.getOne();

      const query = await this.promotionRepository.createQueryBuilder(
        'promotions',
      );

      query
        .where({ ...isActive, type: PromotionType.Banner })
        .leftJoinAndSelect('promotions.shop', 'shops')
        .leftJoinAndSelect('promotions.product', 'products')
        .andWhere('promotions.type = :promotionType', {
          promotionType: PromotionType.Banner,
        })
        .andWhere('promotions.promotionStatus = :publishedpromotion', {
          publishedpromotion: PromotionStatus.PUBLISHED,
        });

      query.orderBy('promotions.createAt', 'DESC').take(bannerSlots.limit);

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
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async adminPagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
    promotionSearch: PromotionSearchDto,
  ): Promise<[PromotionDto[], number]> {
    try {
      const query = await this.promotionRepository.createQueryBuilder(
        'promotions',
      );

      query
        .where({ ...isActive })
        .leftJoinAndSelect('promotions.shop', 'shops')
        .leftJoinAndSelect('promotions.product', 'products')
        .leftJoinAndSelect('promotions.prmotionSlot', 'prmotionSlots')
        .leftJoinAndSelect('promotions.merchant', 'merchants');

      if (promotionSearch.shopId && promotionSearch.shopId.length > 0) {
        query.andWhere('shops.id = :shopId', {
          shopId: promotionSearch.shopId,
        });
      }

      if (promotionSearch.productId && promotionSearch.productId.length > 0) {
        query.andWhere('products.id = :productId', {
          productId: promotionSearch.productId,
        });
      }

      if (promotionSearch.merchantId && promotionSearch.merchantId.length > 0) {
        query.andWhere('merchants.id = :merchantId', {
          merchantId: promotionSearch.merchantId,
        });
      }

      if (promotionSearch.promotionType) {
        query.andWhere('promotions.type = :promotionType', {
          promotionType: promotionSearch.promotionType,
        });
      }

      if (promotionSearch.isApproved) {
        query.andWhere('promotions.isApproved = :promotionApproval', {
          promotionApproval: promotionSearch.isApproved,
        });
      }

      if (promotionSearch.promotionStatus) {
        query.andWhere('promotions.promotionStatus = :promotionStatus', {
          promotionStatus: promotionSearch.promotionStatus,
        });
      }

      if (promotionSearch?.fromDate || promotionSearch?.toDate) {
        if (promotionSearch?.fromDate && promotionSearch?.toDate) {
          query.andWhere(
            'DATE(promotions.startDate) <= :endDate AND DATE(promotions.endDate) >= :startDate',
            {
              startDate: promotionSearch?.fromDate,
              endDate: promotionSearch?.toDate,
            },
          );
        } else if (promotionSearch?.fromDate) {
          query.andWhere('DATE(promotions.endDate) >= :fromDate', {
            fromDate: promotionSearch?.fromDate,
          });
        } else if (promotionSearch?.toDate) {
          query.andWhere('DATE(promotions.startDate) <= :endDate', {
            endDate: promotionSearch?.toDate,
          });
        }
      }

      query
        .orderBy('promotions.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [promotion, count] = await query.getManyAndCount();

      const promotions = await this.conversionService.toDtos<
        PromotionEntity,
        PromotionDto
      >(promotion);

      return [promotions, count];
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async merchantPagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
    promotionSearch: PromotionSearchDto,
  ): Promise<[PromotionDto[], number]> {
    try {
      const userSession: UserResponseDto =
        await this.requestService.userSession();

      const merchant = await this.getMerchantById(userSession?.MerchantId);

      const query = await this.promotionRepository.createQueryBuilder(
        'promotions',
      );

      query
        .where({ ...isActive })
        .leftJoinAndSelect('promotions.shop', 'shops')
        .leftJoinAndSelect('promotions.product', 'products')
        .leftJoinAndSelect('promotions.prmotionSlot', 'prmotionSlots')
        .leftJoinAndSelect('promotions.merchant', 'merchants')
        .andWhere('merchants.id = :merchantId', { merchantId: merchant.id });

      if (promotionSearch.shopId && promotionSearch.shopId.length > 0) {
        query.andWhere('shops.id = :shopId', {
          shopId: promotionSearch.shopId,
        });
      }

      if (promotionSearch.productId && promotionSearch.productId.length > 0) {
        query.andWhere('products.id = :productId', {
          productId: promotionSearch.productId,
        });
      }

      if (promotionSearch.promotionType) {
        query.andWhere('promotions.type = :promotionType', {
          promotionType: promotionSearch.promotionType,
        });
      }

      if (promotionSearch.isApproved) {
        query.andWhere('promotions.isApproved = :promotionApproval', {
          promotionApproval: promotionSearch.isApproved,
        });
      }

      if (promotionSearch.promotionStatus) {
        query.andWhere('promotions.promotionStatus = :promotionStatus', {
          promotionStatus: promotionSearch.promotionStatus,
        });
      }

      if (promotionSearch?.fromDate || promotionSearch?.toDate) {
        if (promotionSearch?.fromDate && promotionSearch?.toDate) {
          query.andWhere(
            'DATE(promotions.startDate) <= :endDate AND DATE(promotions.endDate) >= :startDate',
            {
              startDate: promotionSearch?.fromDate,
              endDate: promotionSearch?.toDate,
            },
          );
        } else if (promotionSearch?.fromDate) {
          query.andWhere('DATE(promotions.endDate) >= :fromDate', {
            fromDate: promotionSearch?.fromDate,
          });
        } else if (promotionSearch?.toDate) {
          query.andWhere('DATE(promotions.startDate) <= :endDate', {
            endDate: promotionSearch?.toDate,
          });
        }
      }

      query
        .orderBy('promotions.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [promotion, count] = await query.getManyAndCount();

      const promotions = await this.conversionService.toDtos<
        PromotionEntity,
        PromotionDto
      >(promotion);

      return [promotions, count];
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(dto: PromotionDto): Promise<PromotionDto[]> {
    try {
      const promotions = await this.promotionRepository.find({
        where: {
          ...dto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<PromotionEntity, PromotionDto>(
        promotions,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async create(dto: CreatePromotionDto): Promise<any> {
    try {
      const responseData = {
        promotion: null,
        paymentUrl: null,
      };

      dto.endDate = new Date(dto.endDate);
      dto.startDate = new Date(dto.startDate);

      // console.log('🔥🔥🔥🔥🔥🔥🔥🔥', dto);

      const user = this.permissionService.returnRequest();
      const dtoToEntity = await this.conversionService.toEntity<
        PromotionEntity,
        PromotionDto
      >(dto);
      const userId = this.permissionService.returnRequest().userId;
      const promotion = this.promotionRepository.create(dtoToEntity);
      promotion.shop = dto.shopID ? await this.getShopById(dto.shopID) : null;
      // promotion.shopType = await this.getShopTypeById(dto.shopTypeID);
      promotion.shopType = promotion.shop.shopType;
      promotion.product = dto.productID
        ? await this.getProductById(dto.productID)
        : null;
      // promotion.category = await this.getCategoryById(dto.categoryID);
      promotion.category = promotion.product?.category;
      promotion.user = await this.getUserById(userId);

      const userSession: UserResponseDto =
        await this.requestService.userSession();
      if (user.isAdmin || user.isSuperAdmin) {
        promotion.merchant = await this.getMerchantById(dto.merchantId);
      } else {
        promotion.merchant = await this.getMerchantById(userSession.MerchantId);
      }

      const checkDto: CheckPromotionSlotDto = new CheckPromotionSlotDto();

      checkDto.productId = dto.productID;
      checkDto.promotionType = dto.type;
      checkDto.shopId = dto.shopID;

      const requestedDates = await this.getDates(dto.startDate, dto.endDate);

      const checkedDates = await this.getBookingSlots(checkDto);

      const intersetionData = await this.arrayIntersection(
        requestedDates,
        checkedDates.available,
      );
      // console.log(requestedDates, checkedDates, intersetionData);

      if (await this.compareArrays(requestedDates, intersetionData)) {
        // console.log('Here');
        promotion.promotionStatus = PromotionStatus.DRAFT;

        await this.promotionRepository.save(promotion);

        responseData.promotion = promotion;
        if (dto.promotionStatus == PromotionStatus.CONFIRM) {
          // Init Invoice and Payment
          const promotionType = await this.promoSlotRepository.findOne({
            where: {
              promotionType: dto.type,
            },
          });
          const promotionInvoiceEntity: PromotionInvoiceEntity =
            new PromotionInvoiceEntity();
          promotionInvoiceEntity.startDate = dto.startDate;
          promotionInvoiceEntity.endDate = dto.endDate;
          promotionInvoiceEntity.promotionType = dto.type;
          promotionInvoiceEntity.paymentStatus = InvoiceStatus.UNPAID;
          promotionInvoiceEntity.promotion = promotion;
          promotionInvoiceEntity.trnxId = randomUUID();
          promotionInvoiceEntity.amount = promotionType
            ? promotionType.dailyCharge * requestedDates.length
            : 0;
          promotionInvoiceEntity.user = await this.getUserById(
            promotion.user.id,
          );
          promotionInvoiceEntity.merchant = await this.getMerchantById(
            dto.merchantId,
          );
          const modifiedEntity = this.requestService.forCreateEntity(
            promotionInvoiceEntity,
          );
          const createPromoInvoice =
            this.promotionInvoiceRepository.create(modifiedEntity);
          const promotionInvoice = await this.promotionInvoiceRepository.save(
            createPromoInvoice,
          );
          // Save Transmaster Data
          const transMasterEntity: TransMasterEntity = new TransMasterEntity();
          transMasterEntity.promotionInvoice = promotionInvoice;
          transMasterEntity.totalAmount = promotionInvoice.amount;
          transMasterEntity.user = promotionInvoice.user;
          transMasterEntity.isPaid = Bool.No;
          const forCreateEntity =
            this.requestService.forCreateEntity(transMasterEntity);

          await this.transMasterRepository.save(forCreateEntity);

          // Generate Promotion URL
          const transactionUrl = await this.generatePromotionPaymentUrlSSL(
            promotionInvoice,
          );
          responseData.paymentUrl = transactionUrl;
        }
      } else {
        throw new Error('Booking slots are not available!');
      }

      // return this.conversionService.toDto<PromotionEntity, PromotionDto>(
      //   promotion,
      // );

      return responseData;
    } catch (error) {
      console.log(error);
      throw new SystemException(error);
    }
  }
  async calculateCost(dto: CheckPromotionSlotDto): Promise<any> {
    try {
      const responseData = {
        cost: null,
        days: null,
        dailyCharge: null,
      };

      const requestedDates = await this.getDates(dto.startDate, dto.endDate);

      const checkedDates = await this.getBookingSlots(dto);

      const intersetionData = await this.arrayIntersection(
        requestedDates,
        checkedDates.available,
      );

      console.log(requestedDates, checkedDates, intersetionData);

      if (await this.compareArrays(requestedDates, intersetionData)) {
        const promotionType = await this.promoSlotRepository.findOne({
          where: {
            promotionType: dto.promotionType,
          },
        });
        responseData.cost = promotionType
          ? promotionType.dailyCharge * requestedDates.length
          : 0;
        responseData.dailyCharge = promotionType
          ? promotionType.dailyCharge
          : 0;
        responseData.days = requestedDates.length;
      } else {
        throw new Error('Booking slots are not available!');
      }
      return responseData;
    } catch (error) {
      console.log(error);
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: CreatePromotionDto): Promise<any> {
    try {
      const responseData = {
        promotion: null,
        paymentUrl: null,
      };
      const savedPromotion = await this.getPromotionById(id);

      // console.log('🔥🔥🔥🔥🔥🔥🔥🔥', dto.shopID);
      dto.startDate = new Date(dto.startDate);
      dto.endDate = new Date(dto.endDate);

      const tempPromoStatus = savedPromotion.promotionStatus; // Existing Promotion Status
      const requestedStatus = dto.promotionStatus;

      if (dto.shopID) {
        savedPromotion.shop = await this.getShopById(dto.shopID);
      } else {
        savedPromotion.shop = null;
      }

      // console.log('Here');

      if (dto.productID) {
        savedPromotion.product = await this.getProductById(dto.productID);
      } else {
        savedPromotion.product = null;
      }

      const dtoToEntity = await this.conversionService.toEntity<
        PromotionEntity,
        PromotionDto
      >({ ...savedPromotion, ...dto });

      // console.log(dtoToEntity);

      if (
        requestedStatus == PromotionStatus.CONFIRM &&
        tempPromoStatus == PromotionStatus.DRAFT
      ) {
        dtoToEntity.promotionStatus = PromotionStatus.DRAFT;

        const checkDto: CheckPromotionSlotDto = new CheckPromotionSlotDto();

        checkDto.productId = dtoToEntity.product
          ? dtoToEntity.product.id
          : null;
        // console.log('Here');
        checkDto.promotionType = dtoToEntity.type;
        // console.log('Here');
        checkDto.shopId = dtoToEntity.shop ? dtoToEntity.shop.id : null;

        const requestedDates = await this.getDates(
          dtoToEntity.startDate,
          dtoToEntity.endDate,
        );

        const checkedDates = await this.getBookingSlots(checkDto);

        const intersetionData = await this.arrayIntersection(
          requestedDates,
          checkedDates.available,
        );

        // console.log(requestedDates, checkedDates);

        if (await this.compareArrays(requestedDates, intersetionData)) {
          // console.log('Here');

          const updatedPromotion = await this.promotionRepository.save(
            dtoToEntity,
            {
              reload: true,
            },
          );

          const promotionType = await this.promoSlotRepository.findOne({
            where: {
              promotionType: dto.type,
            },
          });

          responseData.promotion = updatedPromotion;
          if (dto.promotionStatus == PromotionStatus.CONFIRM) {
            // Init Invoice and Payment
            // Check for Existing Invoice
            const promotionInvoice =
              await this.promotionInvoiceRepository.findOne({
                where: { promotion: updatedPromotion },
                relations: ['user', 'promotion'],
              });
            // console.log(promotionInvoice);

            if (!promotionInvoice) {
              const promotionInvoiceEntity: PromotionInvoiceEntity =
                new PromotionInvoiceEntity();
              promotionInvoiceEntity.startDate = dto.startDate;
              promotionInvoiceEntity.endDate = dto.endDate;
              promotionInvoiceEntity.promotionType = dto.type;
              promotionInvoiceEntity.paymentStatus = InvoiceStatus.UNPAID;
              promotionInvoiceEntity.promotion = updatedPromotion;
              promotionInvoiceEntity.trnxId = randomUUID();
              promotionInvoiceEntity.amount = promotionType
                ? promotionType.dailyCharge * requestedDates.length
                : 0;
              // console.log(updatedPromotion.user);

              promotionInvoiceEntity.user = await this.getUserById(
                await this.requestService.userSession().userId,
              );
              // console.log('Here');
              promotionInvoiceEntity.merchant = await this.getMerchantById(
                updatedPromotion.merchant.id,
              );
              const modifiedEntity = this.requestService.forCreateEntity(
                promotionInvoiceEntity,
              );
              const createPromoInvoice =
                this.promotionInvoiceRepository.create(modifiedEntity);
              const promotionInvoice =
                await this.promotionInvoiceRepository.save(createPromoInvoice);
            }

            // Save Transmaster Data

            // Check for Existing Transmaster
            const transmaster = await this.transMasterRepository.findOne({
              where: {
                promotionInvoice: promotionInvoice,
              },
            });
            // console.log('transmaster: ', transmaster);

            if (!transmaster) {
              const transMasterEntity: TransMasterEntity =
                new TransMasterEntity();
              transMasterEntity.promotionInvoice = promotionInvoice;
              transMasterEntity.totalAmount = promotionInvoice.amount;
              transMasterEntity.user = promotionInvoice.user;
              transMasterEntity.isPaid = Bool.No;
              const forCreateEntity =
                this.requestService.forCreateEntity(transMasterEntity);

              await this.transMasterRepository.save(forCreateEntity);
            }

            // Generate Promotion URL
            const transactionUrl = await this.generatePromotionPaymentUrlSSL(
              promotionInvoice,
            );
            responseData.paymentUrl = transactionUrl;
          }
        } else {
          throw new Error('Booking slots are not available!');
        }
      } else if (dto.promotionStatus == PromotionStatus.DRAFT) {
        // console.log('draft', dto);

        const checkDto: CheckPromotionSlotDto = new CheckPromotionSlotDto();

        checkDto.productId = dtoToEntity.product?.id;
        checkDto.promotionType = dtoToEntity.type;
        checkDto.shopId = dtoToEntity.shop?.id;

        const requestedDates = await this.getDates(
          dtoToEntity.startDate,
          dtoToEntity.endDate,
        );

        const checkedDates = await this.getBookingSlots(checkDto);

        const intersetionData = await this.arrayIntersection(
          requestedDates,
          checkedDates.available,
        );

        if (await this.compareArrays(requestedDates, intersetionData)) {
          // dtoToEntity.product = product;
          const updatedPromotion = await this.promotionRepository.save(
            dtoToEntity,
            {
              reload: true,
            },
          );
          responseData.promotion = updatedPromotion;
        } else {
          throw new Error('Booking slots are not available!');
        }
      } else if (dto.promotionStatus == PromotionStatus.PUBLISHED) {
        if (
          tempPromoStatus == PromotionStatus.CONFIRM ||
          tempPromoStatus == PromotionStatus.PUBLISHED
        ) {
          const updatedPromotion = await this.promotionRepository.save(
            dtoToEntity,
            {
              reload: true,
            },
          );
          responseData.promotion = updatedPromotion;
        }
      }

      // const dtoToEntity = await this.conversionService.toEntity<
      //   PromotionEntity,
      //   PromotionDto
      // >({ ...savedPromotion, ...dto });

      // if (tempPromoStatus !== PromotionStatus.DRAFT) {
      //   const updatedPromotion = await this.promotionRepository.save(
      //     dtoToEntity,
      //     {
      //       reload: true,
      //     },
      //   );
      //   return updatedPromotion;
      // }

      // }

      return Promise.resolve(responseData);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const savePromotion = await this.getPromotionById(id);

      const deleted = await this.promotionRepository.save({
        ...savePromotion,
        ...isInActive,
      });

      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string): Promise<PromotionDto> {
    try {
      const promotion = await this.promotionRepository.findOne({
        where: {
          id,
          ...isActive,
        },
        relations: [
          'shop',
          'product',
          'merchant',
          'shopType',
          'category',
          'user',
        ],
      });
      return this.conversionService.toDto<PromotionEntity, PromotionDto>(
        promotion,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /******************** relation ****************/

  // Generate Payment URL
  async generatePromotionPaymentUrlSSL(invoice: PromotionInvoiceEntity) {
    try {
      const transmaster = await this.transMasterRepository.findOne({
        where: {
          promotionInvoice: invoice,
        },
      });

      // console.log('transmaster in ssl', transmaster);

      const sslData = new SslPrepareDto();

      // Request Parameters
      sslData.total_amount = invoice.amount || 0;
      sslData.tran_id = transmaster.id;
      // console.log('Here');
      // console.log(this.configService.get('PAYMENT_SUCCESS_URL'));

      sslData.success_url = `${this.configService.get(
        'PROMOTION_PAYMENT_SUCCESS_CALLBACK_URL',
      )}${sslData.tran_id}`;
      // sslData.success_url = `${this.configService.get('PAYMENT_SUCCESS_URL')}${
      //   sslData.tran_id
      // }`;
      sslData.fail_url = `${this.configService.get('PAYMENT_FAIL_URL')}`;
      sslData.cancel_url = `${this.configService.get('PAYMENT_CANCEL_URL')}`;
      // sslData.ipn_url = '';

      // Customer Information
      sslData.cus_name = `${invoice?.user?.firstName || ''} ${
        invoice?.user?.lastName || ''
      }`;
      sslData.cus_email = `${invoice?.user?.email || ''}`;
      sslData.cus_phone = `${invoice?.user?.phone || ''}`;
      sslData.cus_add1 = `${invoice?.user?.address?.address || 'test-address'}`;
      sslData.cus_city = `${invoice?.user?.address?.state.name || ''}`;
      sslData.cus_country = `${invoice?.user?.address?.country.name || ''}`;
      sslData.cus_postcode = `${invoice?.user?.address?.thana.name || ''}`;

      // Shipment Information
      sslData.shipping_method = SslShippingMethodEnum.NO;

      // Product Information
      sslData.product_name = 'Campaign Subscription Fee';
      sslData.product_category = 'Promotion campaign';
      sslData.num_of_item = 1;
      sslData.product_profile = SslProductProfileEnum.NON_PHYSICAL_GOODS;
      sslData.product_amount = invoice?.amount;
      sslData.emi_option = 0;
      sslData.multi_card_name = '';
      sslData.allowed_bin = '';
      sslData.cart = [
        {
          amount: invoice?.amount,
          product: sslData.product_name,
        },
      ];
      sslData.value_a = invoice?.user?.id;
      sslData.value_b = invoice?.id;
      sslData.value_c = randomUUID();
      sslData.value_d = invoice.promotion.id;
      // console.log(transMaster.order, ' 🔥🔥🔥🔥🔥🔥🔥 ', tm?.invoice?.id)

      const dtoToEntity = await this.conversionService.toEntity<
        SslPrepareEntity,
        SslPrepareDto
      >(sslData);

      const prepareSslDto = this.sslPrepareRepository.create(dtoToEntity);
      await this.sslPrepareRepository.save(prepareSslDto);

      /********** ssl commerze init ********************/
      const settings = {
        isSandboxMode: Boolean(this.configService.get('PAYMENT_STORE_SANDBOX')),
        store_id: this.configService.get('PAYMENT_STORE_ID'),
        store_passwd: this.configService.get('PAYMENT_STORE_PASSWORD'),
      };
      // console.log(settings);

      sslData['currency'] = this.configService.get('PAYMENT_STORE_CURRENCY');

      const sslcz = new SSLCommerz(settings);
      const transaction: SslResponseDto = await sslcz.init_transaction(sslData);
      transaction.status = transaction.status.toLowerCase();

      /********** ssl commerze end=========================== ********************/
      return Promise.resolve(transaction);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async arrayIntersection(arr1, arr2) {
    // converting into Set
    const setA = new Set(arr1);
    const setB = new Set(arr2);

    let intersectionResult = [];

    for (let i of setB) {
      if (setA.has(i)) {
        intersectionResult.push(i);
      }
    }

    return intersectionResult;
  }

  // program to compare two arrays

  async compareArrays(arr1, arr2) {
    // compare arrays
    const result = JSON.stringify(arr1) == JSON.stringify(arr2);

    // if result is true
    if (result) {
      return true;
    }
    return false;
  }

  getPromotionById = async (id: string): Promise<PromotionEntity> => {
    const promotion = await this.promotionRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: ['shop', 'product', 'merchant', 'shopType', 'category'],
    });

    this.exceptionService.notFound(promotion, 'Promotion not found!!');
    return promotion;
  };

  getShopById = async (id: string): Promise<ShopEntity> => {
    const shop = await this.shopRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: ['shopType'],
    });

    this.exceptionService.notFound(shop, 'Shop not found!!');
    return shop;
  };

  getShopTypeById = async (id: string): Promise<ShopTypeEntity> => {
    const shopType = await this.shopTypeRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });

    this.exceptionService.notFound(shopType, 'Shop Type not found!!');
    return shopType;
  };

  getMerchantById = async (merchantId: string): Promise<MerchantEntity> => {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: { ...isActive, id: merchantId, isApproved: 1 },
      });
      if (!merchant) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! This Merchant is not approved yet'),
        );
      }
      return merchant;
    } catch (error) {
      throw new SystemException(error);
    }
  };

  getProductById = async (id: string): Promise<ProductEntity> => {
    const product = await this.productRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: ['category'],
    });

    this.exceptionService.notFound(product, 'Product not found!!');
    return product;
  };

  getCategoryById = async (id: string): Promise<CategoryEntity> => {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });

    this.exceptionService.notFound(category, 'Category not found!!');
    return category;
  };

  getUserById = async (id: string): Promise<UserEntity> => {
    const user = await this.userRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });

    this.exceptionService.notFound(user, 'User not found!!');
    return user;
  };

  async getBookingSlots(checkoSlotDto: CheckPromotionSlotDto): Promise<any> {
    const promotionTypedetails = await this.promoSlotRepository.findOne({
      where: {
        promotionType: checkoSlotDto.promotionType,
      },
    });

    console.log(checkoSlotDto);

    const limitOnSlot = promotionTypedetails ? promotionTypedetails.limit : 0;

    const today = checkoSlotDto.startDate
      ? new Date(checkoSlotDto.startDate)
      : new Date();
    if (!checkoSlotDto.startDate) {
      today.setDate(today.getDate() + 1);
    }

    // const nextDate = new Date();
    const nextDate = checkoSlotDto.endDate
      ? new Date(checkoSlotDto.endDate)
      : new Date();
    if (!checkoSlotDto.endDate) {
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setMonth(nextDate.getMonth() + 2);
    }

    const availableData: {
      booked: Date[];
      available: Date[];
    } = {
      booked: [],
      available: [],
    };

    const dates = await this.getDates(today, nextDate);
    // console.log(dates);

    const query = this.promotionRepository.createQueryBuilder('promotions');

    query.where('promotions.type = :type', {
      type: checkoSlotDto.promotionType,
    });
    query.andWhere('promotions.promotion_status IN (:...status)', {
      status: [PromotionStatus.PUBLISHED, PromotionStatus.CONFIRM],
    });
    query.andWhere('DATE(promotions.startDate) >= :startDate', {
      startDate: today,
    });

    query.orWhere('DATE(promotions.endDate) >= :startDate', {
      endDate: nextDate,
    });

    query.andWhere('DATE(promotions.endDate) <= :endDate', {
      endDate: nextDate,
    });

    // query.andWhere('promotions.type = :type', {
    //   type: checkoSlotDto.promotionType,
    // });

    // query.andWhere('promotions.promotionStatus != :number', {
    //   number: 1,
    // });

    // console.log(checkoSlotDto);

    const bookedDates = [];
    const findalDateData = [];
    let promotions: PromotionEntity[] = [];

    switch (parseInt(`${checkoSlotDto.promotionType}`)) {
      case PromotionType.Banner:
        promotions = await query.getMany();
        break;
      case PromotionType.Product:
        const product = await this.productRepository.findOne({
          where: {
            id: checkoSlotDto.productId,
          },
          relations: ['category'],
        });
        if (!product) {
          throw new SystemException('Product Not Found!');
        }
        query.leftJoin('promotions.category', 'category');
        query.andWhere('category.id = :id', {
          id: product.category.id,
        });
        promotions = await query.getMany();
        break;
      case PromotionType.Shop:
        const shop = await this.shopRepository.findOne({
          where: {
            id: checkoSlotDto.shopId,
          },
          relations: ['shopType'],
        });
        query.leftJoin('promotions.shopType', 'shopType');
        query.andWhere('shopType.id = :id', {
          id: shop.shopType.id,
        });
        promotions = await query.getMany();
        break;

      default:
        break;
    }

    console.log('promotions', promotions);

    await promotions.forEach(async (promotion) => {
      let promotionDates = await this.getDates(
        promotion.startDate,
        promotion.endDate,
      );
      bookedDates.push(...promotionDates);
    });
    const promotionCounts = {};
    await bookedDates.forEach((date) => {
      // console.log(bookedDates);

      promotionCounts[date] = (promotionCounts[date] || 0) + 1;
    });
    const finalData = {
      booked: [],
      available: [],
    };
    await dates.forEach((date, index) => {
      if (promotionCounts[date]) {
        if (promotionCounts[date] >= limitOnSlot) {
          finalData.booked.push(date);
        } else {
          finalData.available.push(date);
        }
      } else {
        finalData.available.push(date);
      }
    });

    return finalData;
  }

  // Get Dates from a date range
  async getDates(startDate, stopDate) {
    var dateArray = [];
    var currentDate = moment(startDate);
    var toDate = moment(stopDate);
    while (currentDate <= toDate) {
      dateArray.push(moment(currentDate).format('YYYY-MM-DD'));
      currentDate = moment(currentDate).add(1, 'days');
    }
    return dateArray;
  }
}
