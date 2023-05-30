import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as faker from 'faker';
import { GetImageFromDir, ShopTypeEntity, shopTypes } from '@simec/ecom-common';

@Injectable()
export class ShopTypeService {
  private readonly logger = new Logger(ShopTypeService.name);

  constructor(
    @InjectRepository(ShopTypeEntity)
    private readonly typeRepository: Repository<ShopTypeEntity>,
  ) {}

  initTypes = async (): Promise<void> => {
    // const images: string[] = [];
    // images.push('/assets/images/shop-1620542959494.jpeg');
    // const path = `${process.cwd()}/../ecom-image/image-faker/shop-type`;
    // images.push(
    //   ...(await GetImageFromDir(path)).map(
    //     (image) => `../../image-faker/shop-type/${image}`,
    //   ),
    // );

    for (const type of shopTypes) {
      try {
        const typeEntity = new ShopTypeEntity();
        typeEntity.name = type.name;
        typeEntity.image = type.image;
        typeEntity.description = faker.commerce.productDescription();
        // images[Math.floor(Math.random() * 10000) % images.length];
        typeEntity.commission =
          Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) / 100;
        typeEntity.createAt = new Date();
        typeEntity.updatedAt = new Date();
        // console.log(typeEntity);

        const created = await this.typeRepository.create(typeEntity);
        await this.typeRepository.save(created);
      } catch (error) {
        this.logger.error(JSON.stringify(error));
      }
    }
  };
}
