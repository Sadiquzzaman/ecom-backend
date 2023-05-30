import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  configEnvironment,
  configTypeorm,
  ShipmentEntity,
  ShipmentGroupEntity,
} from '@simec/ecom-common';
import { CommonFakerModule } from '../common-faker/common-faker.module';
import { ShippingConfigFaker } from './shipping-config.faker';

const services = [ShippingConfigFaker];

@Module({
  imports: [
    TypeOrmModule.forFeature([ShipmentGroupEntity, ShipmentEntity]),
    configEnvironment(),
    configTypeorm(),
    CommonFakerModule,
  ],
  providers: [...services],
  exports: [...services],
})
export class ShippingConfigModule {}
