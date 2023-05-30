import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  CategoryEntity,
  ConversionService,
  ExceptionService,
  MerchantEntity,
  PermissionService,
  ProductEntity,
  PromotionEntity,
  PromotionInvoiceEntity,
  PromotionsSlotEntity,
  RequestService,
  ResponseService,
  ShopEntity,
  ShopTypeEntity,
  SslPrepareEntity,
  TransMasterEntity,
  UserEntity,
} from '@simec/ecom-common';
import { PromotionController } from './controllers/promotion.controller';
import { PromotionService } from './services/promotion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromotionEntity,
      ShopEntity,
      ShopTypeEntity,
      ProductEntity,
      CategoryEntity,
      UserEntity,
      MerchantEntity,
      PromotionsSlotEntity,
      PromotionInvoiceEntity,
      SslPrepareEntity,
      TransMasterEntity,
    ]),
  ],
  controllers: [PromotionController],
  providers: [
    PromotionService,
    ConversionService,
    ResponseService,
    ExceptionService,
    RequestService,
    PermissionService,
    RequestService,
    ConfigService,
  ],
})
export class PromotionModule {}
