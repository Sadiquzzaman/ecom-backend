import { AddressService } from './address/services/address.service';
import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AddressEntity,
  AffiliatorEntity,
  BcryptService,
  ConversionService,
  CountryEntity,
  CustomerEntity,
  DistrictEntity,
  EmployeeEntity,
  ExceptionService,
  MerchantEntity,
  ProfileEntity,
  RequestService,
  ResponseService,
  RoleEntity,
  StateEntity,
  ThanaEntity,
  UserEntity,
  UserRoleEntity,
  PermissionService,
  TransporterEntity,
  AdminEntity,
  ShopManagerEntity,
  BankEntity,
  BankDetailsEntity,
} from '@simec/ecom-common';
import { ProfileController } from './profile/controllers/profile.controller';
import { RoleController } from './role/controllers/role.controller';
import { UserController } from './user/controllers/user.controller';
import { ProfileService } from './profile/services/profile.service';
import { RoleService } from './role/services/role.service';
import { UserService } from './user/services/user.service';
import { AddressController } from './address/controllers/address.controller';
import { MerchantService } from './user/services/merchant.service';
import { MerchantUserController } from './user/controllers/merchant-user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      ProfileEntity,
      CustomerEntity,
      MerchantEntity,
      EmployeeEntity,
      AffiliatorEntity,
      AddressEntity,
      CountryEntity,
      StateEntity,
      DistrictEntity,
      ThanaEntity,
      TransporterEntity,
      AdminEntity,
      ShopManagerEntity,
      BankEntity,
      BankDetailsEntity,
    ]),
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
    }),
  ],
  exports: [UserService],

  providers: [
    UserService,
    RoleService,
    ConversionService,
    ResponseService,
    BcryptService,
    ProfileService,
    ExceptionService,
    RequestService,
    RequestService,
    ExceptionService,
    AddressService,
    PermissionService,
    MerchantService,
  ],
  controllers: [
    UserController,
    RoleController,
    ProfileController,
    AddressController,
    MerchantUserController,
  ],
})
export class UserModule {}
