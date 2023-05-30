import { ShippingModule } from './shipping/shipping.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { publicUrls } from './public.url';
import {
  AuthMiddleware,
  configEnvironment,
  configRedis,
  configTypeorm,
  PublicMiddleware,
} from '@simec/ecom-common';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { ShipmentGroupModule } from './shipment-group/shipment-group.module';
import { ShipmentModule } from './shipment/shipment.module';
import { RefundModule } from './refund/refund.module';
import { CustomerRefundModule } from './refund/customer-refund/customer-refund.module';
import { RefundShippingAssignmentModule } from './refund/refund-shipment-assignment/refund-shipping-assignment.module';
import { ReturnShippingAssignmentModule } from './refund/return-shipment-assignment/return-shipping-assignment.module';

@Module({
  imports: [
    configEnvironment(),
    configTypeorm(),
    configRedis(),
    CartModule,
    OrderModule,
    ShippingModule,
    ShipmentGroupModule,
    ShipmentModule,
    RefundModule,
    CustomerRefundModule,
    RefundShippingAssignmentModule,
    ReturnShippingAssignmentModule,
  ],
  providers: [],
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
