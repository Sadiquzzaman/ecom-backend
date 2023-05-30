import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefundReasonEntity, refundReasonJson } from '@simec/ecom-common';

@Injectable()
export class RefundReasontService {
  private readonly logger = new Logger(RefundReasontService.name);

  constructor(
    @InjectRepository(RefundReasonEntity)
    private readonly refundReasonRepository: Repository<RefundReasonEntity>,
  ) {}

  initRefundReason = async (): Promise<void> => {
    for (const refund of refundReasonJson) {
      try {
        const refundEntity = new RefundReasonEntity();
        refundEntity.name = refund.name;
        refundEntity.description = refund.description;
        refundEntity.createAt = new Date();
        refundEntity.updatedAt = new Date();

        const created = await this.refundReasonRepository.create(refundEntity);
        await this.refundReasonRepository.save(created);
      } catch (error) {
        this.logger.error(JSON.stringify(error));
      }
    }
  };
}
