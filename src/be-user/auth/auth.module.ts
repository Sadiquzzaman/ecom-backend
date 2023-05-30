import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BcryptService,
  ConversionService,
  ExceptionService,
  RequestService,
  ResponseService,
  UserEntity,
} from '@simec/ecom-common';
import { UserModule } from '../users/user.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

@Module({
  imports: [HttpModule, UserModule, TypeOrmModule.forFeature([UserEntity])],

  providers: [
    AuthService,
    BcryptService,
    ExceptionService,
    ResponseService,
    ConfigService,
    ConversionService,
    RequestService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
