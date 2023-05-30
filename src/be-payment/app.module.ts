import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SslCommerzeModule } from './ssl-commerze/ssl-commerze.module';
import { InvoiceModule } from './invoice/invoice.module';
import { publicUrls } from './public.url';
import {
  AuthMiddleware,
  configEnvironment,
  configRedis,
  configTypeorm,
  PublicMiddleware,
} from '@simec/ecom-common';
import { OnlinePaymentActivityLogModule } from './online-payment-activity-log/online-payment-activity-log.module';
import { AdminAccountModule } from './accounting/admin-account/admin-account.module';
import { MerchantAccountModule } from './accounting/merchant-account/merchant-account.module';
import { MerchantWithdrawalModule } from './accounting/merchant-withdrawal/merchant-withdrawal.module';

@Module({
  imports: [
    configEnvironment(),
    configTypeorm(),
    configRedis(),
    SslCommerzeModule,
    InvoiceModule,
    OnlinePaymentActivityLogModule,
    AdminAccountModule,
    MerchantAccountModule,
    MerchantWithdrawalModule
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PublicMiddleware).forRoutes('*');
    consumer
      .apply(AuthMiddleware)
      .exclude(...publicUrls)
      .forRoutes('*');
  }
}
