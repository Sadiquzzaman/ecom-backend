import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as faker from 'faker';
import { GetImageFromDir, Point, ShopEntity } from '@simec/ecom-common';
import { CommonFakerService } from '../common-faker/common-faker.service';

@Injectable()
export class ShopFaker {
  rating = [1, 2, 3, 4, 5];

  constructor(
    @InjectRepository(ShopEntity)
    private shopRepository: Repository<ShopEntity>,
    private readonly commonFaker: CommonFakerService,
  ) {}

  init = async () => {
    const merchants = await this.commonFaker.getMerchants();
    const shopTypes = await this.commonFaker.getShopTypes();
    const images: string[] = [];
    // images.push('/assets/images/shop-1620542959494.jpeg');
    const path = `${process.cwd()}/../ecom-frontend/src/assets/images/image-default/shop`;
    try {
      images.push(...(await GetImageFromDir(path)).map((image) => image));
      // console.log(path, images);
    } catch (error) {
      console.log({ shopPathErr: error });
    }
    if (images.length <= 0) {
      const path = `${process.cwd()}/../ecom-frontend/assets/images/image-default/shop`;
      try {
        images.push(...(await GetImageFromDir(path)).map((image) => image));
        // console.log(path, images);
      } catch (error) {
        // console.log({ shopPathErr: error });
      }
    }
    for (let x = 0; x < 100; x++) {
      const shop = new ShopEntity();
      try {
        const name = images[x]
          .split('.')
          .slice(0, -1)
          .join('-')
          .replace(/vector|logo|-|400x400/gi, ' ')
          .replace(/  /gi, '');
        shop.name = name + ' [' + x + ']';
        shop.domain = faker.internet.domainName();
        shop.url = faker.internet.url();

        shop.location = faker.name.jobArea();
        shop.description = faker.commerce.productDescription();
        shop.rating =
          this.rating[Math.floor(Math.random() * this.rating.length)];

        shop.popular = 0;
        shop.trending = 0;
        shop.isApproved = 1;

        shop.geoLocation = new Point(getX(), getY());
        const shopImage = `./assets/images/image-default/shop/${
          images[x + 200]
        }`;
        shop.shopCoverImage = shopImage;
        // images[Math.floor(Math.random() * images.length * 10000) % images.length];
        shop.shopProfileImage = shopImage;
        // images[Math.floor(Math.random() * images.length * 10000) % images.length];

        shop.merchant =
          merchants[
            Math.floor(Math.random() * merchants.length * 100) %
              merchants.length
          ];
        shop.shopType =
          shopTypes[
            Math.floor(Math.random() * shopTypes.length * 100) %
              shopTypes.length
          ];

        shop.createAt = new Date();
        shop.updatedAt = new Date();

        const created = this.shopRepository.create(shop);
        await this.shopRepository.save(created);
      } catch (error) {
        // console.log({ fakerShopErr: error, img: images[x] });
      }
    }
  };

  count = async () => {
    return this.shopRepository.count();
  };
}

function getX(): number {
  const precision = 100;
  return (
    20 +
    Math.floor(
      Math.random() * (5 * precision - 1 * precision) + 1 * precision,
    ) /
      (1 * precision)
  );
}

function getY(): number {
  const precision = 100;
  return (
    88 +
    Math.floor(
      Math.random() * (5 * precision - 1 * precision) + 1 * precision,
    ) /
      (1 * precision)
  );
}
