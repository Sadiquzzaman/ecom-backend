import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  configEnvironment,
  configTypeorm,
  ProductEntity,
  PromotionEntity,
  ShopEntity,
  UserEntity,
  CategoryEntity,
  ShopTypeEntity,
  MerchantEntity,
  BankEntity,
  BankDetailsEntity,
} from '@simec/ecom-common';
import { CommonFakerModule } from '../common-faker/common-faker.module';
import { BankDetailsFaker } from './bank-details.faker';

const services = [BankDetailsFaker];

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantEntity, BankEntity, BankDetailsEntity]),
    configEnvironment(),
    configTypeorm(),
    CommonFakerModule,
  ],
  providers: [...services],
  exports: [...services],
})
export class BankDetailsModule {}
