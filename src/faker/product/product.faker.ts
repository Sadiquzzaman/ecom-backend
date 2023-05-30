import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as faker from 'faker';
import {
  AttributeEntity,
  AttributeGroupEntity,
  Bool,
  GetImageFromDir,
  ProductAttributeEntity,
  ProductEntity,
  StockPurchaseEntity,
} from '@simec/ecom-common';
import { CommonFakerService } from '../common-faker/common-faker.service';

@Injectable()
export class ProductFaker {
  constructor(
    @InjectRepository(AttributeGroupEntity)
    private attrGrpRepository: Repository<AttributeGroupEntity>,
    @InjectRepository(AttributeEntity)
    private attrRepository: Repository<AttributeEntity>,
    @InjectRepository(ProductAttributeEntity)
    private productAttrRepository: Repository<ProductAttributeEntity>,
    @InjectRepository(ProductEntity)
    private productRepository: Repository<ProductEntity>,
    @InjectRepository(StockPurchaseEntity)
    private stockPurchaseRepository: Repository<StockPurchaseEntity>,
    private readonly commonService: CommonFakerService,
  ) {}

  defaultGrp: AttributeGroupEntity = null;
  colorGrp: AttributeGroupEntity = null;
  sizeGrp: AttributeGroupEntity = null;

  defaultAttrs: AttributeEntity[] = [];
  colorAttrs: AttributeEntity[] = [];
  sizeAttrs: AttributeEntity[] = [];

  sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

  prices = [10.5, 15.5, 20.5, 25.5, 30.5, 60.0, 70.0, 80.0, 90.0, 100.0];
  rating = [1, 2, 3, 4, 5];
  quantity = [50, 60, 100, 120, 130];
  weight = [10, 20, 30, 40, 50];
  private images: string[] = [];
  /******************* attribute group ************************/
  attributeGroup = async () => {
    await this.defaultGroup();
    await this.sizeGroup();
    await this.colorGroup();
  };

  defaultGroup = async () => {
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

  colorGroup = async () => {
    const grp = new AttributeGroupEntity();
    // grp.isColorGroup = Bool.Yes;
    grp.name = 'Color';
    grp.description = faker.commerce.productAdjective();
    grp.position = 2;

    grp.createAt = new Date();
    grp.updatedAt = new Date();
    try {
      const create = await this.attrGrpRepository.create(grp);
      this.colorGrp = await this.attrGrpRepository.save(create);
    } catch (error) {}
  };

  sizeGroup = async () => {
    const grp = new AttributeGroupEntity();
    // grp.isColorGroup = Bool.No;
    grp.name = 'Size';
    grp.description = faker.commerce.productAdjective();
    grp.position = 3;

    grp.createAt = new Date();
    grp.updatedAt = new Date();
    try {
      const create = await this.attrGrpRepository.create(grp);
      this.sizeGrp = await this.attrGrpRepository.save(create);
    } catch (error) {}
  };

  /******************* attribute ************************/

  attributes = async () => {
    await this.defaultAttributes();
    await this.colorAttributes();
    await this.sizeAttributes();
  };

  defaultAttributes = async () => {
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

  colorAttributes = async () => {
    for (let x = 1; x <= 5; x++) {
      const attr = new AttributeEntity();
      attr.name = faker.commerce.color();
      // attr.color = faker.commerce.color();
      attr.description = faker.lorem.sentence();
      // attr.position = x;
      attr.attributeGroup = this.colorGrp;

      attr.createAt = new Date();
      attr.updatedAt = new Date();
      try {
        const create = await this.attrRepository.create(attr);
        this.colorAttrs.push(await this.attrRepository.save(create));
      } catch (error) {}
    }
  };

  sizeAttributes = async () => {
    for (let x = 0; x < this.sizes.length; x++) {
      const attr = new AttributeEntity();
      attr.name = this.sizes[x];
      // attr.color = '';
      attr.description = faker.lorem.sentence();
      // attr.position = x;
      attr.attributeGroup = this.sizeGrp;

      attr.createAt = new Date();
      attr.updatedAt = new Date();
      try {
        const create = await this.attrRepository.create(attr);
        this.sizeAttrs.push(await this.attrRepository.save(create));
      } catch (error) {}
    }
  };

  /******************* product *****************/

  init = async () => {
    await this.attributeGroup();
    await this.attributes();

    // images.push('/assets/images/shop-1620542959494.jpeg');
    try {
      const path = `${process.cwd()}/../ecom-frontend/src/assets/images/image-default/product`;
      this.images.push(...(await GetImageFromDir(path)).map((image) => image));
      // console.log(path, images);
    } catch (error) {
      // console.log({ shopPathErr: error });
    }
    if (this.images.length <= 0) {
      const path = `${process.cwd()}/../ecom-frontend/assets/images/image-default/product`;
      try {
        this.images.push(
          ...(await GetImageFromDir(path)).map((image) => image),
        );
        // console.log(path, images);
      } catch (error) {
        // console.log({ shopPathErr: error });
      }
    }

    const shops = await this.commonService.getShops();
    const categories = await this.commonService.getCategories();

    for (let x = 1; x <= 1000; x++) {
      const pr = new ProductEntity();

      pr.name = faker.commerce.productName();
      pr.summary = faker.lorem.sentence();
      pr.description = faker.commerce.productDescription();
      pr.metaDescription = faker.lorem.paragraph();
      pr.metaKeywords = faker.lorem.slug();
      pr.metaTitle = faker.commerce.productName();
      pr.reference = faker.git.shortSha();
      pr.isRefundable = x % 2 == 0 ? Bool.Yes : Bool.No;
      pr.quantity =
        this.quantity[
          Math.floor(Math.random() * this.quantity.length) % this.prices.length
        ];
      pr.weight =
        this.weight[
          Math.floor(Math.random() * this.weight.length) % this.prices.length
        ];
      pr.reserved = 0;
      pr.sold = 0;
      pr.isApproved = 1;
      pr.isDeleted = 0;

      pr.price =
        this.prices[
          Math.floor(Math.random() * this.prices.length) % this.prices.length
        ];
      pr.purchasedPrice = pr.price - 5;
      pr.rating =
        this.rating[
          Math.floor(Math.random() * this.rating.length) % this.prices.length
        ];

      pr.popular = 0;
      pr.trending = 0;

      pr.discount = x % 5 === 0 ? 0 : 10;
      pr.wholesalePrice = pr.price - (x % 5 === 0 ? 10 : 5);

      pr.additionalShippingCost = x % 5 === 0 ? 5 : 10;
      pr.lowStockThreshold = 3;

      pr.onSale = x % 2 === 0 ? Bool.Yes : Bool.No;
      pr.isVirtual = x % 2 === 0 ? Bool.Yes : Bool.No;
      pr.isPack = x % 2 === 0 ? Bool.Yes : Bool.No;
      // pr.weight = 0;

      pr.image = {
        // cover: '/assets/images/product-1620542949771.jpeg',
        // cover: `${faker.random.image()}?random=${Date.now()}`,

        cover: `./assets/images/image-default/product/${
          this.images[
            Math.floor(Math.random() * 100000 * this.images.length) %
              this.images.length
          ]
        }`,
        gallery: [
          `./assets/images/image-default/product/${
            this.images[
              Math.floor(Math.random() * 100000 * this.images.length) %
                this.images.length
            ]
          }`,
          `./assets/images/image-default/product/${
            this.images[
              Math.floor(Math.random() * 100000 * this.images.length) %
                this.images.length
            ]
          }`,
          `./assets/images/image-default/product/${
            this.images[
              Math.floor(Math.random() * 100000 * this.images.length) %
                this.images.length
            ]
          }`,
          `./assets/images/image-default/product/${
            this.images[
              Math.floor(Math.random() * 100000 * this.images.length) %
                this.images.length
            ]
          }`,
          `./assets/images/image-default/product/${
            this.images[
              Math.floor(Math.random() * 100000 * this.images.length) %
                this.images.length
            ]
          }`,
        ],
      };

      pr.shop = shops[Math.floor(Math.random() * shops.length) % shops.length];
      console.log({shopInfo: pr.shop});

      pr.location = pr.shop.location;
      pr.geoLocation = pr.shop.geoLocation;
      pr.user = pr.shop.merchant.user;
      pr.merchant = pr.shop.merchant;
      // users[Math.floor(Math.random() * users.length) % users.length];
      pr.category =
        categories[
          Math.floor(Math.random() * categories.length) % categories.length
        ];

      pr.createAt = new Date();
      pr.updatedAt = new Date();

      const create = await this.productRepository.create(pr);
      await this.productRepository.save(create);
      await this.productAttribute(create);
    }
  };

  productAttribute = async (product: ProductEntity, proAttLen = 10) => {
    for (let x = 0; x < proAttLen; x++) {
      const proAttr = new ProductAttributeEntity();
      proAttr.price =
        product.price +
        (Math.floor(Math.random() * this.prices.length) % this.prices.length);
      proAttr.purchasedPrice = proAttr.price - Math.floor(Math.random() * 1.2);
      proAttr.discount = product.discount;
      proAttr.quantity = product.quantity / proAttLen;
      proAttr.weight = product.weight / proAttLen;
      proAttr.wholesalePrice = product.wholesalePrice;
      proAttr.product = product;
      proAttr.additionalShippingCost = product.additionalShippingCost;
      // proAttr.weight = 0;

      proAttr.image = product.image.gallery[0];
      // get multiple same att need to fixed
      proAttr.attributes = [
        this.colorAttrs.sort((a, b) => 0.5 - Math.random())[0],
        this.sizeAttrs.sort((a, b) => 0.5 - Math.random())[0],
      ];
      // console.log(proAttr.attributes);

      proAttr.reference = `${product.reference}-${proAttr.attributes[0].name}-${proAttr.attributes[1].name}`;
      proAttr.createAt = new Date();
      proAttr.updatedAt = new Date();

      const productAttribute = await this.productAttrRepository.create(proAttr);
      await this.productAttrRepository.save(productAttribute);

      let stockPurchase = new StockPurchaseEntity();
      stockPurchase.createAt = new Date();
      stockPurchase.updatedAt = new Date();
      stockPurchase.productAttribute = productAttribute;
      stockPurchase.product = product;
      stockPurchase.purchasedPrice = productAttribute.purchasedPrice;
      stockPurchase.quantity = productAttribute.quantity;
      stockPurchase.inHand = product.quantity;
      stockPurchase = await this.stockPurchaseRepository.create(stockPurchase);
      await this.stockPurchaseRepository.save(stockPurchase);
    }
  };

  count = async () => {
    return this.productRepository.count();
  };
}
