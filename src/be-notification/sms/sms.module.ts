import { HttpModule, Module } from '@nestjs/common';
import { ResponseService, SMSLogEntity } from '@simec/ecom-common';
import { SmsService } from './services/sms.service';
import { SmsController } from './controllers/sms.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([SMSLogEntity])],
  exports: [SmsService],
  providers: [SmsService, ResponseService],
  controllers: [SmsController],
})
export class SmsModule {}
