import { ConfigurationModule } from './configuration/configuraion.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ContactUsModule } from './contact-us/contact-us.module';
import { CountryModule } from './country/country.module';
import { CurrencyModule } from './currency/currency.module';
import { DistrictModule } from './district/district.module';
import { NoteModule } from './note/note.module';
import { publicUrls } from './public.url';
import { ResidentialAreaModule } from './residential-area/residential-area.module';
import { StateModule } from './state/state.module';
import { ThanaModule } from './thana/thana.module';
import { TicketModule } from './ticket/ticket.module';
import { TicketDepartmentModule } from './ticket-department/ticket-department.module';
import { BrandModule } from './brand/brand.module';
import {
  AuthMiddleware,
  configEnvironment,
  configRedis,
  configTypeorm,
  PublicMiddleware,
} from '@simec/ecom-common';
import { StaticPageModule } from './static-page/static-page.module';
import { BankModule } from './bank/bank.module';

@Module({
  imports: [
    configEnvironment(),
    configTypeorm(),
    configRedis(),
    BankModule,
    CountryModule,
    CurrencyModule,
    StateModule,
    DistrictModule,
    ThanaModule,
    ResidentialAreaModule,
    NoteModule,
    ContactUsModule,
    TicketModule,
    TicketDepartmentModule,
    BrandModule,
    ConfigurationModule,
    StaticPageModule,
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
