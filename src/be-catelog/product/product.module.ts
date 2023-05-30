import { MerchantProductService } from './services/merchant-product.service';
import { AdminProductService } from './services/admin-product.service';
import { MerchantProductController } from './controllers/merchant-product.controller';
import { AdminProductController } from './controllers/admin-product.controller';
import { ProductService } from './services/product.service';
import { ProductController } from './controllers/product.controller';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AttributeEntity,
  AttributeGroupEntity,
  CategoryEntity,
  ConversionService,
  ExceptionService,
  PermissionService,
  ProductEntity,
  PromotionEntity,
  RequestService,
  ResponseService,
  ShopEntity,
  UserEntity,
  StockPurchaseEntity,
  MerchantEntity,
  ProductAttributeEntity,
  PromotionsSlotEntity,
} from '@simec/ecom-common';
import { EcomCacheModule } from '../../cache/ecom-cache.module';
import { ProductAttributeService } from '../product-attribute/services/product-attribute.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      ShopEntity,
      CategoryEntity,
      AttributeEntity,
      AttributeGroupEntity,
      UserEntity,
      PromotionEntity,
      StockPurchaseEntity,
      MerchantEntity,
      ProductAttributeEntity,
      PromotionsSlotEntity,
      MerchantEntity,
    ]),
    EcomCacheModule,
  ],
  controllers: [
    ProductController,
    AdminProductController,
    MerchantProductController,
  ],
  providers: [
    ProductService,
    ConversionService,
    ResponseService,
    ExceptionService,
    RequestService,
    PermissionService,
    AdminProductService,
    MerchantProductService,
    ProductAttributeService,
  ],
})
export class ProductModule {}
