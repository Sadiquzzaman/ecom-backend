import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BankDetailsEntity,
  BankEntity,
  isActive,
  MerchantEntity,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class BankDetailsFaker {
  constructor(
    @InjectRepository(MerchantEntity)
    private merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(BankEntity)
    private bankRepository: Repository<BankEntity>,
    @InjectRepository(BankDetailsEntity)
    private bankDetailsRepository: Repository<BankDetailsEntity>,
  ) {}

  init = async () => {
    const merchants = await this.merchantRepository.find({
      where: { ...isActive },
      relations: ['user'],
    });

    const banks = await this.bankRepository.find({
      where: { ...isActive },
    });

    for (let i = 1; i < 10; i++) {
      const bankDetails = new BankDetailsEntity();
      bankDetails.accountHolderName = 'Account Holder';
      let randomAccountNumber = Math.floor(Math.random() * 1000000000);
      bankDetails.accountNumber = 'AC-' + randomAccountNumber;
      bankDetails.remarks = 'This is a bank account';

      bankDetails.merchant =
        merchants[
          Math.floor(Math.random() * merchants.length * 100) % merchants.length
        ];

      bankDetails.banks =
        banks[Math.floor(Math.random() * banks.length * 100) % banks.length];
      bankDetails.createAt = new Date();
      bankDetails.updatedAt = new Date();
      await this.bankDetailsRepository.save(bankDetails);
    }
  };

  count = async () => {
    return this.bankDetailsRepository.count();
  };
}
