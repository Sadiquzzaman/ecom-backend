import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistrictService } from './district.service';
import {
  StaticPageEntity,
  CountryEntity,
  CurrencyEntity,
  isActive,
  Point,
  StateEntity,
  StaticPageObject,
} from '@simec/ecom-common';

@Injectable()
export class StaticPageService {
  private readonly logger = new Logger(StaticPageService.name);

  constructor(
    @InjectRepository(StaticPageEntity)
    private readonly configurationRepository: Repository<StaticPageEntity>,
  ) {}

  initStaticPage = async (): Promise<boolean> => {
    await this.createStaticPage();
    return true;
  };

  private createStaticPage = async (): Promise<boolean> => {
    try {
      // console.log(StaticPageObject);

      for (const staticPageObj of StaticPageObject) {
        const spObj = this.generateStaticPageEntity(staticPageObj);
        const division = this.configurationRepository.create(spObj);
        await division.save();
      }
    } catch (error) {
      this.logger.log('error in catch block');
      this.logger.error(JSON.stringify(error));
    }
    return true;
  };

  private generateStaticPageEntity = (spObject: {
    name: string;
    value: string;
  }): StaticPageEntity => {
    const spEntity = new StaticPageEntity();
    spEntity.createAt = new Date();
    spEntity.name = spObject.name;
    spEntity.value = spObject.value;
    return spEntity;
  };
}
