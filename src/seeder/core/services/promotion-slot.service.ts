import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promotionSlotObject, PromotionsSlotEntity } from '@simec/ecom-common';

@Injectable()
export class PromotionSlotService {
  private readonly logger = new Logger(PromotionSlotService.name);

  constructor(
    @InjectRepository(PromotionsSlotEntity)
    private readonly promotionsSlotRepository: Repository<PromotionsSlotEntity>,
  ) {}

  initPromotionSlot = async (): Promise<void> => {
    try {
      for (const promotionSlot of promotionSlotObject) {
        const promotionsSlotEntity = new PromotionsSlotEntity();
        promotionsSlotEntity.title = promotionSlot.title;
        promotionsSlotEntity.dailyCharge = promotionSlot.dailyCharge;
        promotionsSlotEntity.promotionType = promotionSlot.promotionType;
        promotionsSlotEntity.limit = promotionSlot.limit;
        promotionsSlotEntity.createAt = new Date();
        promotionsSlotEntity.updatedAt = new Date();

        const created = await this.promotionsSlotRepository.create(
          promotionsSlotEntity,
        );
        await this.promotionsSlotRepository.save(created);
      }
    } catch (error) {
      this.logger.error(JSON.stringify(error));
    }
  };
}
