import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  ExceptionService,
  PermissionService,
  RequestService,
  ResponseService,
  ShopEntity,
  ShopInvoiceEntity,
  ShopReviewEntity,
  UserEntity,
} from '@simec/ecom-common';
import { ShopReviewController } from './controllers/shop-review.controller';
import { ShopReviewService } from './services/shop-review.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopReviewEntity,
      UserEntity,
      ShopEntity,
      ShopInvoiceEntity,
    ]),
  ],
  controllers: [ShopReviewController],
  providers: [
    ShopReviewService,
    ConversionService,
    ResponseService,
    ExceptionService,
    RequestService,
    PermissionService,
  ],
})
export class ShopReviewModule {}
