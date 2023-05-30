import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BankEntity, bankObject } from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class BankService {
  private readonly logger = new Logger(BankService.name);

  constructor(
    @InjectRepository(BankEntity)
    private readonly bankRepository: Repository<BankEntity>,
  ) {}

  initBank = async (): Promise<void> => {
    try {
      for (const bank of bankObject) {
        const bankEntity = new BankEntity();
        bankEntity.bankName = bank.name;
        bankEntity.createAt = new Date();
        bankEntity.updatedAt = new Date();

        const created = await this.bankRepository.create(bankEntity);
        await this.bankRepository.save(created);
      }
    } catch (error) {
      this.logger.error(JSON.stringify(error));
    }
  };
}
