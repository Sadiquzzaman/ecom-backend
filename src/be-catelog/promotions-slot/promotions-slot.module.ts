import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  PromotionsSlotEntity,
  RequestService,
  ResponseService,
} from '@simec/ecom-common';
import { PromotionsSlotController } from './controller/promotions-slot.controller';
import { PromotionsSlotService } from './service/promotions-slot.service';

@Module({
  imports: [TypeOrmModule.forFeature([PromotionsSlotEntity])],
  providers: [
    PromotionsSlotService,
    ResponseService,
    RequestService,
    ConversionService,
  ],
  controllers: [PromotionsSlotController],
})
export class PromotionsSlotModule {}
