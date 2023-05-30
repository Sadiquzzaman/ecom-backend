import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConversionService,
  OrderDetailsEntity,
  ProductDto,
  ProductEntity,
  ShopDto,
  ShopEntity,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);
  private readonly searchClient: ClientProxy;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(OrderDetailsEntity)
    private readonly orderDetailsRepository: Repository<OrderDetailsEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ShopEntity)
    private readonly shopRepository: Repository<ShopEntity>,
    private readonly conversionService: ConversionService,
  ) {
    this.searchClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        url: configService.get('SEARCH_SERVICE_URL'),
      },
    });
  }

  generateProductAndShopTrending = async (): Promise<boolean> => {
    try {
      // get all the products of last 15 days
      const { today, last15thDay } = this.getDateInterval(15);
      const query = this.orderDetailsRepository
        .createQueryBuilder('order_details')
        .select('order_details.product', 'productId')
        .where(
          'DATE(order_details.created_at) BETWEEN  :last15thDay AND :today',
          { last15thDay, today },
        );
      const productIDs = await query.getRawMany();

      const productMap: Map<string, number> = new Map();
      const shopMap: Map<string, ShopEntity> = new Map();

      // loop through all the product IDs
      for (const productId of productIDs) {
        // filter out duplicate products
        if (!productMap.has(productId.productId)) {
          productMap.set(productId.productId, 0);

          const productWithShop = await this.productRepository.findOne(
            { id: productId.productId },
            { relations: ['shop'] },
          );

          // creating shop-product adjacency list
          const shop = productWithShop.shop;
          delete productWithShop.shop;
          const product = productWithShop;

          if (!shopMap.has(shop.id)) {
            shop['products'] = [];
            shopMap.set(shop.id, shop);
          }
          shopMap.get(shop.id).products.push(product);
        }

        // count product trending
        productMap.set(
          productId.productId,
          productMap.get(productId.productId) + 1,
        );
      }

      //update trending
      for (let [key, shopProduct] of shopMap) {
        let countShopTrending = 0;
        shopProduct.products.forEach(async (productData) => {
          productData.trending += productMap.get(productData.id);
          countShopTrending += productMap.get(productData.id);
          const updatedProduct = await this.productRepository.save(productData);
          const productDto = await this.conversionService.toDto<
            ProductEntity,
            ProductDto
          >(updatedProduct);
          this.indexProductSearch(productDto);
        });
        shopProduct.trending += countShopTrending;
        const updatedShop = await this.shopRepository.save(
          shopMap.get(shopProduct.id),
        );
        const shopDto = await this.conversionService.toDto<ShopEntity, ShopDto>(
          updatedShop,
        );
        this.indexShopSearch(shopDto);
      }

      return Promise.resolve(true);
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  getDateInterval = (interval: number) => {
    const today = new Date();
    const last15thDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - interval,
    );
    return {
      today: today.toISOString().split('T')[0],
      last15thDay: last15thDay.toISOString().split('T')[0],
    };
  };

  indexProductSearch = (productDto: ProductDto) => {
    this.searchClient
      .send({ service: 'products', cmd: 'post', method: 'index' }, productDto)
      .subscribe();
  };

  indexShopSearch = (shopDto: ShopDto) => {
    this.searchClient
      .send({ service: 'shops', cmd: 'post', method: 'index' }, shopDto)
      .subscribe();
  };

  debug = (message) => {
    console.log('🔥🔥🔥 ', message);
  };
}
