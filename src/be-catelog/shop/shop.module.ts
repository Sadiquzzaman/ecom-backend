import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  ExceptionService,
  MerchantEntity,
  PermissionService,
  PromotionEntity,
  PromotionsSlotEntity,
  RequestService,
  ResponseService,
  ShopEntity,
  ShopManagerEntity,
  ShopTypeEntity,
  UserEntity,
} from '@simec/ecom-common';
import { AdminShopController } from './controllers/admin-shop.controller';
import { MerchantShopController } from './controllers/merchant-shop.controller';
import { ShopController } from './controllers/shop.controller';
import { AdminShopService } from './services/admin-shop.service';
import { MerchantShopService } from './services/merchant-shop.service';
import { ShopService } from './services/shop.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopEntity,
      UserEntity,
      MerchantEntity,
      ShopTypeEntity,
      PromotionEntity,
      ShopManagerEntity,
      PromotionsSlotEntity,
    ]),
  ],
  controllers: [ShopController, AdminShopController, MerchantShopController],
  providers: [
    ShopService,
    ConversionService,
    ResponseService,
    ExceptionService,
    RequestService,
    PermissionService,
    AdminShopService,
    MerchantShopService,
  ],
})
export class ShopModule {}
