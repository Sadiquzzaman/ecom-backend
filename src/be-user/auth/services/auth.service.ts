import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {
  ActiveStatus,
  BcryptService,
  Bool,
  ChangePasswordDto,
  ConversionService,
  CreateUserDto,
  CustomUserRoleDto,
  ExceptionService,
  Gender,
  GoogleSignInDto,
  LoginDto,
  MailFromDto,
  MailParserDto,
  PhoneOrEmailDto,
  Redis,
  RequestService,
  ResetPasswordDto,
  RoleName,
  SystemException,
  UserDto,
  UserEntity,
  UserResponseDto,
  UserRoleDto,
} from '@simec/ecom-common';
import * as jwt from 'jsonwebtoken';
import { RedisService } from 'nestjs-redis';
import { timeout } from 'rxjs/operators';
import { UserService } from '../../users/user/services/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly notificationClient: ClientProxy;

  constructor(
    private readonly configService: ConfigService,
    private readonly bcryptService: BcryptService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,

    private readonly conversionService: ConversionService,
    private readonly requestService: RequestService,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    this.notificationClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: { url: configService.get('NOTIFICATION_SERVICE_URL') },
    });
  }

  async login(loginDto: LoginDto): Promise<UserResponseDto> {
    try {
      const user = await this.validateUser(loginDto);
      const userRoles = await this.userService.findRolesByUserId(user.id);
      const userResponseDto = await this.generatePayload(user, userRoles);
      const accessToken = await this.generateToken(userResponseDto, loginDto);

      await this.redisService
        .getClient(Redis.REDIS_SESSION)
        .set(accessToken, JSON.stringify(userResponseDto));
      userResponseDto.accessToken = accessToken;
      return Promise.resolve(userResponseDto);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async forgetPassword(phoneOrEmailDto: PhoneOrEmailDto): Promise<UserDto> {
    try {
      const user = await this.userService.updatePasswordToken(phoneOrEmailDto);
      if (user) {
        const mailParserDto = this.getForgetPasswordContent(user);
        this.notificationClient
          .emit(
            { service: 'mail', cmd: 'post', method: 'sendNoReplyMailMessage' },
            mailParserDto,
          )
          .pipe(timeout(5000))
          .subscribe();
        delete user.password;
        return Promise.resolve(user);
      } else {
        throw new SystemException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User phone or email is not correct',
        });
      }
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async changePassword(changePasswordDto: ChangePasswordDto): Promise<UserDto> {
    try {
      const user = await this.userService.updatePassword(changePasswordDto);
      if (user) {
        delete user.password;
        return Promise.resolve(user);
      } else {
        throw new SystemException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User phone or email is not correct',
        });
      }
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<UserDto> {
    try {
      const user = await this.userService.resetPassword(resetPasswordDto);
      if (user) {
        delete user.password;
        return Promise.resolve(user);
      } else {
        throw new SystemException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User phone or email is not correct',
        });
      }
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async generateToken(
    payload: UserResponseDto,
    loginDto: LoginDto,
  ): Promise<string> {
    const privateKEY = this.configService
      .get('PRIVATE_KEY')
      .replace(/\\n/g, '\n');

    let accessToken;

    if (loginDto.isChecked === 1) {
      accessToken = jwt.sign({ ...payload }, privateKEY, {
        expiresIn: '365d',
        algorithm: 'RS256',
      });
    } else {
      accessToken = jwt.sign({ ...payload }, privateKEY, {
        expiresIn: '365d',
        algorithm: 'RS256',
      });
    }
    this.logger.log('access token: ' + accessToken);
    return Promise.resolve(accessToken);
  }

  async socialLogin(
    socialSignInDto: GoogleSignInDto,
  ): Promise<UserResponseDto> {
    console.log(socialSignInDto);
    let user = await this.userRepository.findOne({
      where: {
        email: socialSignInDto.email,
      },
      relations: ['customer'],
    });
    console.log('User Data', user);

    if (!user) {
      const createUserDto = new CreateUserDto();
      createUserDto.email = socialSignInDto.email;
      createUserDto.gender = Gender.Unknown;
      createUserDto.lastPasswdGen = new Date();

      createUserDto.location = 'Unknown';
      createUserDto.geoLocation = { x: 0, y: 0 };
      createUserDto.firstName = socialSignInDto.firstName;
      createUserDto.lastName = socialSignInDto.lastName;
      createUserDto.profileImageUrl = socialSignInDto.profileImageUrl;

      createUserDto.password = await this.bcryptService.hashPassword(
        crypto.randomBytes(8).toString('hex'),
      );

      let userDto: UserDto = createUserDto;

      userDto = await this.requestService.forCreate(userDto);
      userDto.isActive = ActiveStatus.enabled;
      console.log({ userDto });

      const dtoToEntity = await this.conversionService.toEntity<
        UserEntity,
        UserDto
      >(userDto);
      user = this.userRepository.create(dtoToEntity);

      user.profile = await this.userService.generateProfileEntity();
      // user.address = await this.userService.generateAddress(createUserDto);
      user = await this.userRepository.save(user);
      await this.userService.generateCustomerEntity(user, true);
      // Generate Customer
      await this.userService.generateUserRoleEntity(
        RoleName.CUSTOMER_ROLE,
        user,
      );
    }

    const userDtoConverted = await this.conversionService.toDto<
      UserEntity,
      UserDto
    >(user);
    // console.log(user);

    const userRoles = await this.userService.findRolesByUserId(user.id);
    const userResponseDto = await this.generatePayload(
      userDtoConverted,
      userRoles,
    );
    const loginDto = new LoginDto();
    loginDto.email = user.email;
    // loginDto.isChecked = Bool.Yes;
    loginDto.password = null;

    const accessToken = await this.generateToken(userResponseDto, loginDto);

    await this.redisService
      .getClient(Redis.REDIS_SESSION)
      .set(accessToken, JSON.stringify(userResponseDto));
    userResponseDto.accessToken = accessToken;
    return Promise.resolve(userResponseDto);
  }

  async generatePayload(
    userDto: UserDto,
    userRoles: UserRoleDto[],
  ): Promise<UserResponseDto> {
    let isSuperAdmin = false;
    let isAdmin = false;
    let isShopManager = false;
    let isEmployee = false;
    let isCustomer = false;
    let isMerchant = false;
    let isUser = false;
    let isAffiliator = false;
    let isTransporter = false;
    let SuperAdminId = null;
    let AdminId = null;
    let ShopManagerId = null;
    let EmployeeId = null;
    let CustomerId = null;
    let MerchantId = null;
    let AffiliatorId = null;
    let TransporterId = null;
    const customUserRoleDtos = [];
    for (const userRole of userRoles) {
      const customUserRoleDto = new CustomUserRoleDto();
      customUserRoleDto.role = userRole.role?.role as RoleName;
      switch (
        userRole.role?.role as RoleName // use for single privilege,
      ) {
        case RoleName.SUPER_ADMIN_ROLE:
          isSuperAdmin = true;
          SuperAdminId = userDto.id;
          AdminId = userDto.id;
          break;
        case RoleName.ADMIN_ROLE:
          isAdmin = true;
          AdminId = userDto.admin.id;
          break;
        case RoleName.SHOP_MANAGER:
          isShopManager = true;
          ShopManagerId = userDto.shopManager.id;
          break;
        case RoleName.EMPLOYEE_ROLE:
          isEmployee = true;
          EmployeeId = userDto.employee.id;
          break;
        case RoleName.CUSTOMER_ROLE:
          isCustomer = true;
          CustomerId = userDto.customer.id;
          break;
        case RoleName.MERCHANT_ROLE:
          isMerchant = true;
          MerchantId = userDto.merchant.id;
          break;
        case RoleName.USER_ROLE:
          isUser = true;
          break;
        case RoleName.TRANSPORTER_ROLE:
          isTransporter = true;
          TransporterId = userDto.transporter.id;
          break;
        case RoleName.AFFILIATOR_ROLE:
          isAffiliator = true;
          AffiliatorId = userDto.affiliator.id;
          break;
      }
      customUserRoleDto.shopId = userRole.shop?.id;
      customUserRoleDtos.push(customUserRoleDto);
    }
    const userResponseDto = new UserResponseDto();
    userResponseDto.phone = userDto.phone;
    userResponseDto.userName = userDto.firstName + ' ' + userDto.lastName;
    userResponseDto.roles = customUserRoleDtos;
    userResponseDto.isSuperAdmin = isSuperAdmin;
    userResponseDto.isAdmin = isAdmin;

    userResponseDto.isEmployee = isEmployee;
    userResponseDto.isCustomer = isCustomer;
    userResponseDto.isMerchant = isMerchant;
    userResponseDto.isUser = isUser;
    userResponseDto.isAffiliator = isAffiliator;
    userResponseDto.isTransporter = isTransporter;
    userResponseDto.isShopManager = isShopManager;

    userResponseDto.userId = userDto.id;
    userResponseDto.SuperAdminId = SuperAdminId;
    userResponseDto.AdminId = AdminId;
    userResponseDto.EmployeeId = EmployeeId;
    userResponseDto.CustomerId = CustomerId;
    userResponseDto.MerchantId = MerchantId;
    userResponseDto.AffiliatorId = AffiliatorId;
    userResponseDto.TransporterId = TransporterId;
    userResponseDto.ShopManagerId = ShopManagerId;

    userResponseDto.hasLicenseAndNID = false;
    if (userDto.license && userDto.nid) {
      userResponseDto.hasLicenseAndNID = true;
    }
    return Promise.resolve(userResponseDto);
  }

  async validateUser(loginDto: LoginDto): Promise<UserDto> {
    try {
      const user: UserDto = await this.userService.findOneByEmailOrPhone(
        loginDto.phone || loginDto.email,
      );

      console.log('🔥🔥🔥🔥🔥 user', user);

      const isPasswordMatched = await this.bcryptService.comparePassword(
        loginDto.password,
        user?.password,
      );

      if (!isPasswordMatched) {
        throw new SystemException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User password is not valid',
        });
      }
      return user;
    } catch (error) {
      throw new SystemException(error);
    }
  }

  getForgetPasswordContent(user: UserDto): MailParserDto {
    const parseMailFrom = new MailFromDto();
    parseMailFrom.address = this.configService.get('MAIL_NO_REPLY_USER');
    parseMailFrom.name = 'EBONEAR';

    const mailParserDto = new MailParserDto();
    mailParserDto.from = parseMailFrom;
    mailParserDto.to = user.email;
    mailParserDto.subject = 'reset password';
    const serverUrl =
      this.configService.get('RESET_PASSWORD_MAIL_LINK') +
      '/' +
      user.resetPasswordToken;

    mailParserDto.html =
      '<body bgcolor="#e1e5e8" style="margin-top: 0;margin-bottom: 0;margin-right: 0;margin-left: 0;padding-top: 10px;padding-bottom: 10px;padding-right: 10px;padding-left: 10px;background-color: #e1e5e8;"><div style="padding: 10px; background-color: #ffffff"><div style="margin: center auto; text-align: center"><h1>Forget your password?</h1><div>That\'s okay, it happens! Click on the button below to reset your password.</div><a href="' +
      serverUrl +
      '" style="cursor:pointer;display: inline-block;border-radius: 3px;margin: 20px;padding: 10px;background-color: #f8d155;color: #222;text-decoration: none;">Reset Password</a></div></div></body>';
    return mailParserDto;
  }
}
