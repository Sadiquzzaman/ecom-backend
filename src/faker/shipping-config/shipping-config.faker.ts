import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShipmentEntity, ShipmentGroupEntity } from '@simec/ecom-common';
import * as faker from 'faker';
import { Repository } from 'typeorm';
import { CommonFakerService } from '../common-faker/common-faker.service';

@Injectable()
export class ShippingConfigFaker {
  constructor(
    @InjectRepository(ShipmentGroupEntity)
    private shippingGrpRepository: Repository<ShipmentGroupEntity>,
    @InjectRepository(ShipmentEntity)
    private shippingRepository: Repository<ShipmentEntity>,
    private readonly commonService: CommonFakerService,
  ) {}

  weightGrp: ShipmentGroupEntity = null;
  distanceGrp: ShipmentGroupEntity = null;

  weightAttrs: ShipmentEntity[] = [];
  distanceAttrs: ShipmentEntity[] = [];

  weight = [10, 20, 30, 40, 50, 60, 70, 80, 100];
  weightPrice = [20, 40, 60, 80, 100, 150, 200, 250, 300];

  Distance = [
    10, 20, 30, 40, 50, 60, 70, 80, 100, 150, 200, 250, 300, 350, 400,
  ];
  distancePrice = [
    5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300,
  ];
  /******************* attribute group ************************/
  attributeGroup = async () => {
    await this.weightGroup();
    await this.distanceGroup();
  };

  weightGroup = async () => {
    const grp = new ShipmentGroupEntity();
    grp.name = 'Weight';
    grp.description = faker.commerce.productAdjective();

    grp.createAt = new Date();
    grp.updatedAt = new Date();
    try {
      const create = await this.shippingGrpRepository.create(grp);
      this.weightGrp = await this.shippingGrpRepository.save(create);
    } catch (error) {}
  };

  distanceGroup = async () => {
    const grp = new ShipmentGroupEntity();
    grp.name = 'Distance';
    grp.description = faker.commerce.productAdjective();

    grp.createAt = new Date();
    grp.updatedAt = new Date();
    try {
      const create = await this.shippingGrpRepository.create(grp);
      this.distanceGrp = await this.shippingGrpRepository.save(create);
    } catch (error) {}
  };

  /******************* attribute ************************/

  attributes = async () => {
    await this.weightAttributes();
    await this.distanceAttributes();
  };

  weightAttributes = async () => {
    for (let x = 0; x < this.weight.length; x++) {
      const attr = new ShipmentEntity();
      attr.value = this.weight[x];
      attr.description = faker.lorem.sentence();
      attr.price = this.weightPrice[x];
      attr.shipmentGroup = this.weightGrp;

      attr.createAt = new Date();
      attr.updatedAt = new Date();
      try {
        const create = await this.shippingRepository.create(attr);
        this.weightAttrs.push(await this.shippingRepository.save(create));
      } catch (error) {}
    }
  };

  distanceAttributes = async () => {
    for (let x = 0; x < this.weight.length; x++) {
      const attr = new ShipmentEntity();
      attr.value = this.weight[x];
      attr.description = faker.lorem.sentence();
      attr.price = this.distancePrice[x];
      attr.shipmentGroup = this.distanceGrp;

      attr.createAt = new Date();
      attr.updatedAt = new Date();
      try {
        const create = await this.shippingRepository.create(attr);
        this.distanceAttrs.push(await this.shippingRepository.save(create));
      } catch (error) {}
    }
  };

  init = async () => {
    await this.attributeGroup();
    await this.attributes();
  };

  count = async () => {
    // return this.productRepository.count();
    return 0;
  };
}
