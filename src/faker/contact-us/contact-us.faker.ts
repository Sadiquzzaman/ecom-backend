import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as faker from 'faker';
import { Bool, ContactUsEntity } from '@simec/ecom-common';

@Injectable()
export class ContactUsFaker {
  constructor(
    @InjectRepository(ContactUsEntity)
    private contactUsRepository: Repository<ContactUsEntity>,
  ) {}

  init = async () => {
    for (let x = 1; x <= 20; x++) {
      const csEntity = new ContactUsEntity();
      csEntity.email = faker.internet.email();
      csEntity.phone = '017458745' + (x < 10 ? '0' + x : x);
      csEntity.subject = faker.lorem.sentence();
      csEntity.message = faker.lorem.paragraph();

      csEntity.createAt = new Date();
      csEntity.updatedAt = new Date();

      const contactUs = this.contactUsRepository.create(csEntity);
      await this.contactUsRepository.save(contactUs);
    }
  };

  count = async () => {
    return this.contactUsRepository.count();
  };
}
