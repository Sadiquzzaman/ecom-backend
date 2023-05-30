import { Module } from '@nestjs/common';
import { ConversionService, ExceptionService, RequestService, ResponseService, StaticPageEntity } from '@simec/ecom-common';
import { StaticPageController } from './controller/static-page.controller';
import { StaticPageService } from './services/static-page.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([StaticPageEntity])],
  controllers: [StaticPageController],
  providers: [
    ConversionService,
    StaticPageService,
    ResponseService,
    RequestService,
    ExceptionService,
  ]
})
export class StaticPageModule {}
