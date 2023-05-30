import { Module } from '@nestjs/common';
import { ShipmentGroupController } from './controllers/shipment-group.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  ExceptionService,
  RequestService,
  ResponseService,
  ShipmentGroupEntity,
} from '@simec/ecom-common';
import { ShipmentGroupService } from './services/shipment-group.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShipmentGroupEntity])],
  controllers: [ShipmentGroupController],
  providers: [
    ShipmentGroupService,
    ExceptionService,
    ConversionService,
    RequestService,
    ResponseService,
  ],
})
export class ShipmentGroupModule {}
