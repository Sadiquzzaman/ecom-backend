import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversionService,
  TicketDepartmentEntity,
  ExceptionService,
  RequestService,
  ResponseService,
  BankEntity,
} from '@simec/ecom-common';
import { BankController } from './controllers/bank.controller';
import { BankService } from './services/bank.service';

@Module({
  imports: [TypeOrmModule.forFeature([BankEntity])],
  controllers: [BankController],
  providers: [
    ConversionService,
    ResponseService,
    ExceptionService,
    RequestService,
    BankService,
  ],
})
export class BankModule {}
