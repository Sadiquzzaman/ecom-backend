import { Injectable, Logger } from '@nestjs/common';
import { ContactUsFaker } from './contact-us/contact-us.faker';
import { CategoryFaker } from './category/category.faker';
import { MerchantFaker } from './merchant/merchant.faker';
import { ShopFaker } from './shop/shop.faker';
import { ProductFaker } from './product/product.faker';
import { PromotionFaker } from './promotion/promotion.faker';
import { CouponFaker } from './coupon/coupon.faker';
import { ShippingConfigFaker } from './shipping-config/shipping-config.faker';
import { BankDetailsFaker } from './bank-details/bank-details.faker';

@Injectable()
export class FakerService {
  private readonly logger = new Logger(FakerService.name);

  constructor(
    private readonly contactUsFaker: ContactUsFaker,
    private readonly categoryFaker: CategoryFaker,
    private readonly merchantFaker: MerchantFaker,
    private readonly shopFaker: ShopFaker,
    private readonly productFaker: ProductFaker,
    private readonly promotionFaker: PromotionFaker,
    private readonly couponFaker: CouponFaker,
    private readonly shippingConfigFaker: ShippingConfigFaker,
    private readonly bankDetailsFaker: BankDetailsFaker,
  ) {}

  async init() {
    await this.category();
    await this.merchant();
    await this.shop();
    await this.product();
    await this.contactUs();
    await this.promotion();
    await this.fnCoupon();
    await this.fnShipment();
    await this.bankDeatils();
    return true;
  }

  category = async () => {
    this.logger.log('Initializing Category faker ...');
    if ((await this.categoryFaker.count()) <= 0) {
      await this.categoryFaker.init();
    } else {
      this.logger.log('Fake category already done!');
    }
    return true;
  };

  promotion = async () => {
    this.logger.log('Initializing Promotion faker ...');
    if ((await this.promotionFaker.count()) <= 0) {
      await this.promotionFaker.init();
    } else {
      this.logger.log('Fake Promotion already done!');
    }
    return true;
  };

  merchant = async () => {
    this.logger.log('Initializing Merchant faker ...');
    // one merchant is from seeder, so less than 1
    if ((await this.merchantFaker.count()) <= 1) {
      await this.merchantFaker.init();
    } else {
      this.logger.log('Fake merchant already done!');
    }
    return true;
  };

  shop = async () => {
    this.logger.log('Initializing Shop faker ...');
    if ((await this.shopFaker.count()) <= 0) {
      await this.shopFaker.init();
    } else {
      this.logger.log('Fake shop already done!');
    }
    return true;
  };

  product = async () => {
    this.logger.log('Initializing Product faker ...');
    if ((await this.productFaker.count()) <= 0 || true) {
      await this.productFaker.init();
    } else {
      this.logger.log('Fake product already done!');
    }
    return true;
  };

  contactUs = async () => {
    this.logger.log('Initializing Contact Us faker ...');
    if ((await this.contactUsFaker.count()) <= 0) {
      await this.contactUsFaker.init();
    } else {
      this.logger.log('Fake contact us already done!');
    }
    return true;
  };

  fnCoupon = async () => {
    this.logger.log('Initializing Coupon faker ...');
    if ((await this.couponFaker.count()) <= 0) {
      await this.couponFaker.init();
    } else {
      this.logger.log('Fake Coupon already done!');
    }
    return true;
  };

  fnShipment = async () => {
    this.logger.log('Initializing shipping config faker ...');
    if ((await this.shippingConfigFaker.count()) <= 0) {
      await this.shippingConfigFaker.init();
    } else {
      this.logger.log('shipping config already done!');
    }
    return true;
  };

  bankDeatils = async () => {
    this.logger.log('Initializing bank details faker ...');
    if ((await this.bankDetailsFaker.count()) <= 0) {
      await this.bankDetailsFaker.init();
    } else {
      this.logger.log('bank details already done!');
    }
    return true;
  };
}
