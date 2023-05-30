import { PromotionSlotService } from './services/promotion-slot.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreService } from './services/core.service';
import { CountryService } from './services/country.service';
import { CurrencyService } from './services/currency.service';
import { DistrictService } from './services/district.service';
import { StateService } from './services/state.service';
import { ThanaService } from './services/thana.service';
import {
  AttributeEntity,
  AttributeGroupEntity,
  BankEntity,
  ConfigurationEntity,
  CountryEntity,
  CurrencyEntity,
  DistrictEntity,
  RefundReasonEntity,
  ShopTypeEntity,
  StateEntity,
  StaticPageEntity,
  ThanaEntity,
  TicketDepartmentEntity,
  PromotionsSlotEntity,
} from '@simec/ecom-common';
import { ShopTypeService } from './services/shop-type.service';
import { TicketDepartmentService } from './services/ticket-department.service';
import { StaticPageService } from './services/static-page.service';
import { ProductAttributeSeedService } from './services/product-attribute.service';
import { RefundReasontService } from './services/refund-reason.service';
import { BankService } from './services/bank.service';

const services = [
  CountryService,
  CurrencyService,
  CoreService,
  StateService,
  DistrictService,
  ThanaService,
  ShopTypeService,
  TicketDepartmentService,
  StaticPageService,
  ProductAttributeSeedService,
  RefundReasontService,
  BankService,
  PromotionSlotService,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CountryEntity,
      CurrencyEntity,
      StateEntity,
      DistrictEntity,
      ThanaEntity,
      ShopTypeEntity,
      TicketDepartmentEntity,
      ConfigurationEntity,
      StaticPageEntity,
      AttributeGroupEntity,
      AttributeEntity,
      RefundReasonEntity,
      BankEntity,
      PromotionsSlotEntity,
    ]),
  ],
  exports: [...services],
  controllers: [],
  providers: [...services],
})
export class CoreModule {}
