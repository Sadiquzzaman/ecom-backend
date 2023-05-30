import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  ExceptionService,
  RequestService,
  ResponseService,
  ShipmentEntity,
  ShipmentGroupEntity
} from '@simec/ecom-common';
import { ShipmentController } from './controllers/shipment.controller';
import { ShipmentService } from './services/shipment.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShipmentEntity, ShipmentGroupEntity])],
  controllers: [ShipmentController],
  providers: [
    ShipmentService,
    ExceptionService,
    ConversionService,
    RequestService,
    ResponseService,
  ],
})
export class ShipmentModule {}
