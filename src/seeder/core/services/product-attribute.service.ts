import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as faker from 'faker';
import {
  AttributeEntity,
  AttributeGroupEntity,
  GetImageFromDir,
  ShopTypeEntity,
  shopTypes,
} from '@simec/ecom-common';

@Injectable()
export class ProductAttributeSeedService {
  private readonly logger = new Logger(ProductAttributeSeedService.name);

  constructor(
    @InjectRepository(AttributeGroupEntity)
    private attrGrpRepository: Repository<AttributeGroupEntity>,
    @InjectRepository(AttributeEntity)
    private attrRepository: Repository<AttributeEntity>,
  ) {}

  private defaultGrp: AttributeGroupEntity = null;
  private defaultAttrs: AttributeEntity[] = [];

  initAttribute = async (): Promise<void> => {
    await this.attributeGroup();
    await this.attributes();
  };

  private attributeGroup = async () => {
    await this.defaultGroup();
  };

  private defaultGroup = async () => {
    const grp = new AttributeGroupEntity();
    grp.name = 'Default';
    grp.description =
      'Sets default attribute for variable products automatically if only 1 option is in-stock.';
    grp.position = 1;

    grp.createAt = new Date();
    grp.updatedAt = new Date();
    try {
      const create = await this.attrGrpRepository.create(grp);
      this.defaultGrp = await this.attrGrpRepository.save(create);
    } catch (error) {}
  };

  private attributes = async () => {
    await this.defaultAttributes();
  };

  private defaultAttributes = async () => {
    const attr = new AttributeEntity();
    attr.name = 'Default';
    attr.description =
      'Sets default attribute for variable products automatically if only 1 option is in-stock.';
    attr.attributeGroup = this.defaultGrp;

    attr.createAt = new Date();
    attr.updatedAt = new Date();
    try {
      const create = await this.attrRepository.create(attr);
      this.defaultAttrs.push(await this.attrRepository.save(create));
    } catch (error) {}
  };
}
