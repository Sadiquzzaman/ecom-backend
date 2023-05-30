import {
  ForbiddenException,
  HttpService,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ActiveStatus,
  AddressEntity,
  AddUserRoleDto,
  AdminEntity,
  AffiliatorEntity,
  BankDetailsDto,
  BankDetailsEntity,
  BankDetailsSearchDto,
  BankEntity,
  BcryptService,
  ChangePasswordDto,
  ConversionService,
  CountryEntity,
  CreateOtpDto,
  CreateUserDto,
  CustomerEntity,
  CustomerSearchDto,
  DeleteDto,
  DistrictEntity,
  EmployeeEntity,
  EmployeeType,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  MailFromDto,
  MailParserDto,
  MerchantDto,
  MerchantEntity,
  NotificationDto,
  OtpDto,
  PermissionService,
  PhoneOrEmailDto,
  ProfileEntity,
  RequestService,
  ResetPasswordDto,
  RoleEntity,
  RoleName,
  ShopManagerEntity,
  SystemException,
  ThanaEntity,
  TransporterDto,
  TransporterEntity,
  TransporterSearchDto,
  UserDto,
  UserEntity,
  UserRoleDto,
  UserRoleEntity,
  UserSearchFilterDto,
  UserType,
} from '@simec/ecom-common';
// const ejs = require('ejs');
import ejs from 'ejs';
// const path = require('path');
import path from 'path';
import { timeout } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService implements GeneralService<UserDto> {
  private readonly logger = new Logger(UserService.name);
  private readonly notificationClient: ClientProxy;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
    @InjectRepository(BankDetailsEntity)
    private readonly bankDetailsRepository: Repository<BankDetailsEntity>,
    @InjectRepository(ShopManagerEntity)
    private readonly shopManagerEntityRepository: Repository<ShopManagerEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(TransporterEntity)
    private readonly transporterRepository: Repository<TransporterEntity>,
    @InjectRepository(AffiliatorEntity)
    private readonly affiliatorRepository: Repository<AffiliatorEntity>,
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(CountryEntity)
    private readonly countryRepository: Repository<CountryEntity>,
    @InjectRepository(DistrictEntity)
    private readonly districtRepository: Repository<DistrictEntity>,
    @InjectRepository(ThanaEntity)
    private readonly thanaRepository: Repository<ThanaEntity>,
    @InjectRepository(BankEntity)
    private readonly bankRepository: Repository<BankEntity>,
    @InjectRepository(AddressEntity)
    private readonly addressRepository: Repository<AddressEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly bcryptService: BcryptService,
    private readonly requestService: RequestService,
    private readonly permissionService: PermissionService,
    private readonly httpService: HttpService,
  ) {
    this.notificationClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: { url: configService.get('NOTIFICATION_SERVICE_URL') },
    });
  }

  findAll = async (): Promise<UserDto[]> => {
    try {
      const users = await this.userRepository.find({
        where: { ...isActive },
      });
      return this.conversionService.toDtos<UserEntity, UserDto>(users);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  findAllTransporter = async (): Promise<TransporterDto[]> => {
    try {
      const transporters = await this.transporterRepository.find({
        where: { ...isActive },
        relations: ['user'],
      });
      return this.conversionService.toDtos<TransporterEntity, TransporterDto>(
        transporters,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  };

  findById = async (id: string, relation = true): Promise<UserDto> => {
    try {
      const user = await this.userRepository.findOne({
        where: { id, ...isActive },
        relations: relation
          ? [
              'profile',
              'merchant',
              'customer',
              'employee',
              'affiliator',
              // 'address',
              'roles',
            ]
          : [],
      });
      this.exceptionService.notFound(user, 'User is not found');
      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  findInactiveUserById = async (
    id: string,
    relation = true,
  ): Promise<UserDto> => {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: relation
          ? [
              'profile',
              'merchant',
              'customer',
              'employee',
              'affiliator',
              'address',
              'roles',
            ]
          : [],
      });
      this.exceptionService.notFound(user, 'User is not found');
      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  getWishListByUserId = async (): Promise<UserDto> => {
    try {
      const id = await this.permissionService.returnRequest().userId;
      console.log('ID ', id);

      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['wishlist'],
      });
      if (user) this.exceptionService.notFound(user, 'User is not found');
      if (user.isActive === ActiveStatus.disabled) {
        throw new ForbiddenException('Your account is not activated yet');
      }
      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  getFollowingShopsByUserId = async (): Promise<UserDto> => {
    try {
      const id = this.permissionService.returnRequest().userId;
      const user = await this.userRepository.findOne({
        where: { id, ...isActive },
        relations: ['followingShops'],
      });
      this.exceptionService.notFound(user, 'User is not found');
      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  getProfileByUserId = async (
    id: string,
    relation = true,
  ): Promise<UserDto> => {
    try {
      const user = await this.userRepository.findOne({
        where: { id, ...isActive },
        relations: relation
          ? [
              'profile',
              'address',
              'address.country',
              'address.district',
              'address.thana',
            ]
          : [],
      });
      this.exceptionService.notFound(user, 'User is not found');
      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  transporterPagination = async (
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    transporterSearch: TransporterSearchDto,
  ): Promise<[TransporterDto[], number]> => {
    try {
      const query =
        this.transporterRepository.createQueryBuilder('transporters');
      query
        .innerJoinAndSelect('transporters.user', 'users')
        .where('transporters.isActive = :isActive', { ...isActive });
      if (transporterSearch.firstName) {
        query.andWhere('lower(users.firstName) like :fullName', {
          fullName: `%${transporterSearch.firstName.toLowerCase()}%`,
        });
      }
      if (transporterSearch.email) {
        query.andWhere('lower(users.email) like :email', {
          email: `%${transporterSearch.email.toLowerCase()}%`,
        });
      }
      query
        .orderBy('users.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [transporters, count] = await query.getManyAndCount();

      // this.exceptionService.notFound(users, 'No merchant found!!');
      const transporter = await this.conversionService.toDtos<
        TransporterEntity,
        TransporterDto
      >(transporters);
      return [transporter, count];
    } catch (error) {
      throw new SystemException(error);
    }
  };

  customerPagination = async (
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    customerSearch: CustomerSearchDto,
  ): Promise<[UserDto[], number]> => {
    try {
      const query = this.userRepository.createQueryBuilder('users');
      query
        .innerJoinAndSelect('users.customer', 'customer')
        .where('users.isActive = :isActive', { ...isActive })
        .andWhere('users.customer IS NOT NULL');
      // if (userSearch.isApproved) {
      //   query.andWhere('merchant.isApproved = :isApproved', {
      //     isApproved: userSearch.isApproved === '1' ? '1' : '0',
      //   });
      // }
      if (customerSearch.firstName) {
        query.andWhere('lower(users.firstName) like :fullName', {
          fullName: `%${customerSearch.firstName.toLowerCase()}%`,
        });
      }
      if (customerSearch.email) {
        query.andWhere('lower(users.email) like :email', {
          email: `%${customerSearch.email.toLowerCase()}%`,
        });
      }
      query
        .orderBy('users.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [users, count] = await query.getManyAndCount();

      // this.exceptionService.notFound(users, 'No merchant found!!');
      const user = await this.conversionService.toDtos<UserEntity, UserDto>(
        users,
      );
      return [user, count];
    } catch (error) {
      throw new SystemException(error);
    }
  };

  findByObject = async (dto: UserDto): Promise<UserDto[]> => {
    try {
      const users = await this.userRepository.find({
        where: {
          ...dto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<UserEntity, UserDto>(users);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  findOne = async (dto: UserDto): Promise<UserDto> => {
    try {
      const user = await this.userRepository.findOne({
        where: {
          ...dto,
          ...isActive,
        },
      });
      this.exceptionService.notFound(user, 'User is not found');
      return await this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  findOneByEmailOrPhone = async (emailOrPhone: string): Promise<UserDto> => {
    try {
      const query = this.userRepository.createQueryBuilder('user');

      const user = await query
        .where(
          '(user.phone = :phone OR user.email = :email) and user.isActive = :isActive',
          {
            phone: emailOrPhone,
            email: emailOrPhone,
            ...isActive,
          },
        )
        .leftJoinAndSelect('user.merchant', 'merchant')
        .leftJoinAndSelect('user.customer', 'customer')
        .leftJoinAndSelect('user.admin', 'admin')
        .leftJoinAndSelect('user.transporter', 'transporter')
        .leftJoinAndSelect('user.employee', 'employee')
        .leftJoinAndSelect('user.affiliator', 'affiliator')
        .leftJoinAndSelect('user.shopManager', 'shopManager')
        .getOne();

      this.exceptionService.notFound(
        user,
        'User is not found by phone or email',
      );

      return await this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  findRolesByUserId = async (id: string): Promise<UserRoleDto[]> => {
    try {
      const query = this.userRoleRepository.createQueryBuilder('userRole');
      const userRoles = await query
        .innerJoin('userRole.user', 'user', 'user.id=:id', { id })
        .innerJoinAndSelect('userRole.role', 'role')
        .leftJoinAndSelect('userRole.shop', 'shop')
        .getMany();
      this.logger.log(JSON.stringify(userRoles));
      return this.conversionService.toDtos<UserRoleEntity, UserRoleDto>(
        userRoles,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  };

  findAllMerchant = async (
    page: number,
    limit: number,
    sort: string,
    order: 'ASC' | 'DESC' = 'DESC',
    approvalLabel: number,
  ): Promise<[UserDto[], number]> => {
    try {
      const query = this.userRepository.createQueryBuilder('users');

      const [users, count] = await query
        .innerJoinAndSelect('users.merchant', 'merchant')
        .where('users.isActive = :isActive', { ...isActive })
        .andWhere('merchant.isApproved = :isApproved', {
          isApproved: approvalLabel,
        })
        .andWhere('users.merchant IS NOT NULL')
        // .orderBy(sort !== 'undefined' ? sort : 'updatedAt', order)
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      // this.exceptionService.notFound(users, 'No merchant found!!');
      const user = await this.conversionService.toDtos<UserEntity, UserDto>(
        users,
      );
      return [user, count];
    } catch (error) {
      throw new SystemException(error);
    }
  };

  create = async (createUserDto: CreateUserDto): Promise<any> => {
    try {
      // console.log({
      //   '🔥': '🔥 🔥 🔥 🔥 🔥 🔥 🔥',
      //   phonec: createUserDto.phone,
      //   email: createUserDto.email,
      //   l: createUserDto.email.length > 0,
      // });

      // const response = createUserDto.captcha;
      // const secretKey = this.configService.get('SECRET_KEY');
      // const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${response}`;
      // const res = (await this.httpService.get(url).toPromise()) as any;
      //if (res.data?.success === true)
      // {
      if (createUserDto.phone == null && createUserDto.email == null) {
        throw new Error('Please, Fill in any of your phone or email');
      }
      if (createUserDto.phone || createUserDto.email) {
        const user = await this.createUser(createUserDto);
        return this.conversionService.toDto<UserEntity, UserDto>(user);
      }

      // }
      // else {
      //   throw new SystemException({
      //     status: HttpStatus.UNAUTHORIZED,
      //     message: 'Recaptcha Error!!',
      //   });
      // }
    } catch (error) {
      throw new SystemException(error);
    }
  };

  sendOtpByMail = async (createOtpDto: CreateOtpDto, userId: string) => {
    const parseMailFrom = new MailFromDto();
    parseMailFrom.address = this.configService.get('MAIL_NO_REPLY_USER');
    parseMailFrom.name = 'EBONEAR';

    const parseMail = new MailParserDto();
    parseMail.from = parseMailFrom;
    parseMail.to = createOtpDto.email;
    parseMail.subject = 'Otp for registration';
    parseMail.html =
      '<div style="padding: 2rem 0rem 2rem 0rem; background-color: #e1e5e8; height: 100%">' +
      '<div style="padding: 1rem 1rem 1rem 1rem; text-align: center;border-radius: 2px;background-color: #ffffff; margin-right: 15rem;margin-left: 15rem;">' +
      '<p style="text-align: center; font-size: 1.5rem; color: #2b2b2b">Welcome To Ebonear! You are just one step away from register</p>' +
      '<img style="text-align: center; margin-top: 1.5rem" src=""/>' +
      '<p style="margin-top: 3rem; text-align: start">We are exited to have you get started. First you need to confirm your account. An OTP (One Time Passowrd) is attached with this e-mail. Fill up with the following OTP.</p>' +
      '<p style="margin-top: 1rem; text-align: center">' +
      createOtpDto.otp +
      '</p>' +
      '<p style="margin-top: 3rem; text-align: start">You can verify OTP later by using the following link.</p>' +
      '<p style="font-style: italic;margin-top: 1rem; text-align: center">' +
      this.configService.get('VERIFICATION_MAIL_LINK') +
      '/' +
      userId +
      '</p>' +
      '</div>' +
      '</div>';

    console
      .log
      // path.join(__dirname, '../../../views/mail/confirm-account.ejs'),
      // import path from "path";
      // import ejs from 'ejs';
      ();

    ejs
      .renderFile(
        path.join(__dirname, '../../../views/mail/confirm-account.ejs'),
        {
          createOtpDto: createOtpDto,
          confirm_link: this.configService.get('VERIFICATION_MAIL_LINK'),
        },
      )
      .then((result) => {
        parseMail.html = result;
      });
    this.logger.log(parseMail);
    this.notificationClient
      .emit(
        { service: 'mail', cmd: 'post', method: 'sendNoReplyMailMessage' },
        parseMail,
      )
      .pipe(timeout(5000))
      .subscribe();
  };

  createNotification = async (notificationDto: NotificationDto) => {
    this.notificationClient
      .emit(
        {
          service: 'notification',
          cmd: 'create',
          method: 'createNotification',
        },
        notificationDto,
      )
      .pipe(timeout(5000))
      .subscribe();
  };

  notificationMailToAdmin = async (
    email: string,
    notificationDto: NotificationDto,
  ) => {
    const parseMailFrom = new MailFromDto();
    parseMailFrom.address = this.configService.get('MAIL_ADMIN_USER');
    parseMailFrom.name = 'EBONEAR';

    const parseMail = new MailParserDto();
    parseMail.from = parseMailFrom;
    parseMail.to = email;
    parseMail.subject = 'New Merchant Registration';
    parseMail.html =
      '<div style="padding: 2rem 0rem 2rem 0rem; background-color: #e1e5e8; height: 100%">' +
      '<div style="padding: 1rem 1rem 1rem 1rem; text-align: center;border-radius: 2px;background-color: #ffffff; margin-right: 15rem;margin-left: 15rem;">' +
      '<p style="text-align: center; font-size: 1.5rem; color: #2b2b2b">Welcome To Ebonear!</p>' +
      '<img style="text-align: center; margin-top: 1.5rem" src=""/>' +
      '<p style="margin-top: 3rem; text-align: start">' +
      notificationDto.message +
      '</p>' +
      '</div>' +
      '</div>';
    this.logger.log('️‍🔥️‍🔥️‍🔥️‍🔥️‍🔥' + parseMail);
    this.notificationClient
      .emit(
        {
          service: 'mail',
          cmd: 'post',
          method: 'sendAdminMailMessage',
        },
        parseMail,
      )
      .pipe(timeout(5000))
      .subscribe();
  };

  sendOtpBySms = async (createOtpDto: CreateOtpDto) => {
    this.notificationClient
      .emit({ service: 'sms', cmd: 'post', method: 'sendSMS' }, createOtpDto)
      .pipe(timeout(5000))
      .subscribe((res) => {
        return;
      });
  };

  resendOtp = async (userId: string) => {
    const user = await this.userRepository.findOne(userId);
    const createOtp = new CreateOtpDto();
    createOtp.email = user.email;
    createOtp.phone = user.phone;
    createOtp.otp = user.otp;

    await this.sendOtpByMail(createOtp, userId);
    await this.sendOtpBySms(createOtp);
  };

  update = async (id: string, dto: CreateUserDto): Promise<UserDto> => {
    try {
      const saveDto = await this.getUserAndProfile(id);
      dto = this.requestService.forUpdate(dto);

      const user = await this.conversionService.toEntity<UserEntity, UserDto>({
        ...saveDto,
        ...dto,
      });
      user.address = await this.generateAddress(dto);
      user.profile.profileImageUrl = dto.profileImageUrl;
      await this.profileRepository.save(user.profile);
      const updatedUser = await this.userRepository.save(user, {
        reload: true,
      });

      return this.conversionService.toDto<UserEntity, UserDto>(updatedUser);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  updatePasswordToken = async (
    phoneOrEmailDto: PhoneOrEmailDto,
  ): Promise<UserDto> => {
    try {
      const query = this.userRepository.createQueryBuilder('user');

      const savedUser = await query
        .where(
          '(user.phone = :phone OR user.email = :email) and user.isActive = :isActive',
          {
            phone: phoneOrEmailDto.phoneOrEmail,
            email: phoneOrEmailDto.phoneOrEmail,
            ...isActive,
          },
        )
        .getOne();
      this.exceptionService.notFound(savedUser, 'User is not found');

      savedUser.resetPasswordToken = uuidv4();

      const tomorrow = new Date();
      tomorrow.setDate(new Date().getDate() + 1);
      savedUser.resetPasswordValidity = tomorrow;

      const updatedUser = await this.userRepository.save(
        {
          ...savedUser,
        },
        {
          reload: true,
        },
      );
      return this.conversionService.toDto<UserEntity, UserDto>(updatedUser);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  updatePassword = async (
    changePasswordDto: ChangePasswordDto,
  ): Promise<UserDto> => {
    try {
      const savedUser = await this.userRepository.findOne({
        resetPasswordToken: changePasswordDto.token,
        ...isActive,
      });

      this.exceptionService.notFound(savedUser, 'User is not found');
      savedUser.password = await this.bcryptService.hashPassword(
        changePasswordDto.newPassword,
      );

      const updatedUser = await this.userRepository.save(
        {
          ...savedUser,
        },
        {
          reload: true,
        },
      );
      return this.conversionService.toDto<UserEntity, UserDto>(updatedUser);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  resetPassword = async (
    resetPasswordDto: ResetPasswordDto,
  ): Promise<UserDto> => {
    try {
      const id = this.permissionService.returnRequest().userId;
      const savedUser = await this.userRepository.findOne({
        where: { id, ...isActive },
      });

      const matchPassword = await this.bcryptService.comparePassword(
        resetPasswordDto.presentPassword,
        savedUser.password,
      );

      console.log(matchPassword);
      if (matchPassword) {
        this.exceptionService.notFound(savedUser, 'User is not found');
        savedUser.password = await this.bcryptService.hashPassword(
          resetPasswordDto.newPassword,
        );

        const updatedUser = await this.userRepository.save(
          {
            ...savedUser,
          },
          {
            reload: true,
          },
        );
        return this.conversionService.toDto<UserEntity, UserDto>(updatedUser);
      } else {
        const error = { message: 'Please enter correct password!' };
        throw new SystemException(error);
      }
    } catch (error) {
      throw new SystemException(error);
    }
  };

  verifyOtp = async (id: string, otp: OtpDto): Promise<OtpDto> => {
    const userOtp = await this.userRepository.findOne({ id, ...otp });
    this.exceptionService.notFound(userOtp, 'Otp mismatched resend');
    if (userOtp) {
      userOtp.isActive = 1;
      userOtp.otp = 0;
    }
    await this.userRepository.save(userOtp);

    return this.conversionService.toDto<UserEntity, UserDto>(userOtp);
  };

  remove = async (id: string): Promise<DeleteDto> => {
    try {
      const saveDto = await this.getUser(id);

      const deleted = await this.userRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  };

  // merchantPagination = async (
  //   page: number,
  //   limit: number,
  // ): Promise<[UserDto[], number]> => {
  //   try {
  //     const query = this.userRepository.createQueryBuilder('users');

  //     const users = await query
  //       .where('users.isActive = :isActive', { ...isActive })
  //       .andWhere('users.merchant IS NOT NULL')
  //       .skip((page - 1) * limit)
  //       .take(limit)
  //       .getMany();

  //     const total = await this.userRepository.count();

  //     return this.conversionService.toPagination<UserEntity, UserDto>([
  //       users,
  //       total,
  //     ]);
  //   } catch (error) {
  //     throw new SystemException(error);
  //   }
  // };

  // customerPagination = async (
  //   page: number,
  //   limit: number,
  // ): Promise<[UserDto[], number]> => {
  //   try {
  //     const query = this.userRepository.createQueryBuilder('users');

  //     const users = await query
  //       .where('users.isActive = :isActive', { ...isActive })
  //       .andWhere('users.customer IS NOT NULL')
  //       .andWhere('users.merchant IS NULL')
  //       .skip((page - 1) * limit)
  //       .take(limit)
  //       .getMany();

  //     const total = await this.userRepository.count();

  //     return this.conversionService.toPagination<UserEntity, UserDto>([
  //       users,
  //       total,
  //     ]);
  //   } catch (error) {
  //     throw new SystemException(error);
  //   }
  // };

  adminPagination = async (
    page: number,
    limit: number,
    sort: string,
    order: 'ASC' | 'DESC' = 'DESC',
    userSearchFilterDto: UserSearchFilterDto,
  ): Promise<[UserDto[], number]> => {
    try {
      const query = await this.userRepository.createQueryBuilder('user');
      query
        .leftJoinAndMapMany(
          'user.roles',
          UserRoleEntity,
          'role',
          'role.user_id = user.id',
        )
        .leftJoinAndMapMany(
          'role.role',
          RoleEntity,
          'userRoleType',
          'role.role_id = userRoleType.id',
        )
        .where('userRoleType.role in (:...roles)', {
          roles: [userSearchFilterDto.label],
        })
        .andWhere('user.isActive = :isActive', { ...isActive });

      if (userSearchFilterDto.name) {
        query.andWhere(
          "concat(lower(user.firstName), ' ',lower(user.lastName)) like :fullName",
          {
            fullName: `%${userSearchFilterDto.name.toLowerCase()}%`,
          },
        );
      }

      if (userSearchFilterDto.email) {
        query.andWhere('lower(user.email) like :email', {
          email: `%${userSearchFilterDto.email.toLowerCase()}%`,
        });
      }

      if (userSearchFilterDto.phone) {
        query.andWhere('lower(user.phone) like :phone', {
          phone: `%${userSearchFilterDto.phone.toLowerCase()}%`,
        });
      }

      switch (userSearchFilterDto.label.toString()) {
        case 'ADMIN_ROLE':
          query.leftJoinAndSelect('user.admin', 'admin');
          break;
        case 'CUSTOMER_ROLE':
          query.leftJoinAndSelect('user.customer', 'customer');
          break;
        case 'MERCHANT_ROLE':
          query.leftJoinAndSelect('user.merchant', 'merchant');
          break;
        case 'TRANSPORTER_ROLE':
          query.leftJoinAndSelect('user.transporter', 'transporter');
          break;
        case 'SHOP_MANAGER_ROLE':
          query.leftJoinAndSelect('user.shopManager', 'shopManager');
          break;
      }

      if (userSearchFilterDto?.approveStatus) {
        query.andWhere('merchant.isApproved = :isApproved', {
          isApproved: userSearchFilterDto?.approveStatus,
        });
      }

      sort === 'createdAt'
        ? (sort = 'user.createdAt')
        : (sort = 'user.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);

      const [users, total] = await query.getManyAndCount();

      // console.log(users);

      return this.conversionService.toPagination<UserEntity, UserDto>([
        users,
        total,
      ]);
    } catch (error) {
      throw new SystemException(error);
    }
  };
  /****************** helper ************/

  generateProfileEntity = async (): Promise<ProfileEntity> => {
    let profileEntity = new ProfileEntity();
    profileEntity = this.requestService.forCreate(profileEntity);
    profileEntity.profileImageUrl = '/assets/images/user-profile.png';
    profileEntity.coverImageUrl = '/assets/images/profile-cover.png';
    const profile = this.profileRepository.create(profileEntity);
    await this.profileRepository.save(profile);
    return profile;
  };

  generateUserRoleEntity = async (
    roleName: RoleName,
    user: UserEntity,
  ): Promise<UserEntity> => {
    let userRole = new UserRoleEntity();
    userRole.user = user;
    userRole.role = await this.getRoleByName(roleName);
    userRole = this.requestService.forCreate(userRole);

    await this.userRoleRepository.save(userRole);
    return Promise.resolve(user);
  };

  generateAdminEntity = async (
    user: UserEntity,
    sendOtp = false,
  ): Promise<void> => {
    let adminEntity = new AdminEntity();
    adminEntity = this.requestService.forCreate(adminEntity);
    const admin = this.adminRepository.create(adminEntity);
    await this.adminRepository.save(admin);
    user.admin = admin;
    user.isActive = 0;
    user.otp = this.otpGenerator();

    const savedUser = await this.userRepository.save(user);

    if (savedUser && sendOtp) {
      const createOtp = new CreateOtpDto();
      createOtp.email = user.email;
      createOtp.phone = user.phone;
      createOtp.otp = user.otp;

      await this.sendOtpByMail(createOtp, savedUser.id);
      await this.sendOtpBySms(createOtp);
    }
  };

  generateShopManagerEntity = async (
    user: UserEntity,
    sendOtp = false,
  ): Promise<void> => {
    let shopManagerEntity = new ShopManagerEntity();
    shopManagerEntity = this.requestService.forCreate(shopManagerEntity);
    const shopManager =
      this.shopManagerEntityRepository.create(shopManagerEntity);
    await this.shopManagerEntityRepository.save(shopManager);
    user.shopManager = shopManager;
    user.isActive = 0;
    user.otp = this.otpGenerator();

    const savedUser = await this.userRepository.save(user);

    if (savedUser && sendOtp) {
      const createOtp = new CreateOtpDto();
      createOtp.email = user.email;
      createOtp.phone = user.phone;
      createOtp.otp = user.otp;

      await this.sendOtpByMail(createOtp, savedUser.id);
      await this.sendOtpBySms(createOtp);
    }
  };

  generateCustomerEntity = async (
    user: UserEntity,
    sendOtp = false,
  ): Promise<void> => {
    let cusEntity = new CustomerEntity();
    cusEntity.outstandingAllowAmount = 5000.0;
    cusEntity.maxPaymentDays = 15.0;
    cusEntity = this.requestService.forCreate(cusEntity);
    const customer = this.customerRepository.create(cusEntity);
    customer.billingAddress = user.address;
    customer.shippingAddresses = [];
    customer.shippingAddresses.push(customer.billingAddress);
    await this.customerRepository.save(customer);
    user.customer = customer;
    if (user.isActive === ActiveStatus.enabled) {
      // user.isActive = 0;
    } else {
      user.isActive = 0;
    }
    user.otp = this.otpGenerator();

    const savedUser = await this.userRepository.save(user);

    if (savedUser && sendOtp) {
      const createOtp = new CreateOtpDto();
      createOtp.email = user.email;
      createOtp.phone = user.phone;
      createOtp.otp = user.otp;

      await this.sendOtpByMail(createOtp, savedUser.id);
      await this.sendOtpBySms(createOtp);
    }
  };

  generateTransporter = async (
    user: UserEntity,
    sendOtp = false,
  ): Promise<void> => {
    let transporterEntity = new TransporterEntity();
    transporterEntity = this.requestService.forCreate(transporterEntity);

    const transporter = this.transporterRepository.create(transporterEntity);
    await this.transporterRepository.save(transporter);

    user.transporter = transporter;
    user.isActive = 0;
    user.otp = this.otpGenerator();

    const savedUser = await this.userRepository.save(user);

    if (savedUser && sendOtp) {
      const createOtp = new CreateOtpDto();
      createOtp.email = user.email;
      createOtp.phone = user.phone;
      createOtp.otp = user.otp;

      await this.sendOtpByMail(createOtp, savedUser.id);
      await this.sendOtpBySms(createOtp);
    }
  };

  generateMerchantEntity = async (user: UserEntity): Promise<void> => {
    let merEntity = new MerchantEntity();
    merEntity = this.requestService.forCreate(merEntity);

    const merchant = this.merchantRepository.create(merEntity);
    await this.merchantRepository.save(merchant);
    user.merchant = merchant;
    user.isActive = 0;
    user.otp = this.otpGenerator();

    const savedUser = await this.userRepository.save(user);

    if (savedUser) {
      const createOtp = new CreateOtpDto();
      createOtp.email = user.email;
      createOtp.phone = user.phone;
      createOtp.otp = user.otp;

      await this.sendOtpByMail(createOtp, savedUser.id);
      await this.sendOtpBySms(createOtp);
    }
  };

  generateEmployeeEntity = async (
    user: UserEntity,
    sendOtp = false,
  ): Promise<void> => {
    let employeeEntity = new EmployeeEntity();
    employeeEntity = this.requestService.forCreate(employeeEntity);
    const getCreatingUser = await this.permissionService.returnRequest();
    const admin = await this.getAdminByUserId(getCreatingUser.userId);
    if (getCreatingUser.isMerchant) {
      employeeEntity.employeeType = EmployeeType.merchantEmployee;
    } else {
      employeeEntity.employeeType = EmployeeType.adminEmployee;
      employeeEntity.admin = admin;
    }

    employeeEntity.employeeType = 1;
    const employee = this.employeeRepository.create(employeeEntity);
    await this.employeeRepository.save(employee);
    user.employee = employee;
    user.isActive = 0;
    user.otp = this.otpGenerator();

    const savedUser = await this.userRepository.save(user);
    if (savedUser && sendOtp) {
      const createOtp = new CreateOtpDto();
      createOtp.email = user.email;
      createOtp.phone = user.phone;
      createOtp.otp = user.otp;

      await this.sendOtpByMail(createOtp, savedUser.id);
      await this.sendOtpBySms(createOtp);
    }
  };

  generateAffiliatorEntity = async (user: UserEntity): Promise<void> => {
    let affiliatorEntity = new AffiliatorEntity();
    affiliatorEntity.baseFee = 0.0;
    affiliatorEntity.clickFee = 0.0;
    affiliatorEntity.percentFee = 0.0;
    affiliatorEntity = this.requestService.forCreate(affiliatorEntity);

    const affiliator = this.affiliatorRepository.create(affiliatorEntity);
    await this.affiliatorRepository.save(affiliator);
    user.affiliator = affiliator;
    await this.userRepository.save(user);
  };

  generateAddress = async (
    createUserDto: CreateUserDto,
  ): Promise<AddressEntity> => {
    const country = await this.countryRepository.findOne({
      where: {
        isoCode: 'BGD',
        ...isActive,
      },
    });

    const query = this.districtRepository.createQueryBuilder('district');

    const district = await query
      .innerJoinAndSelect('district.state', 'state')
      .where('district.id = :id and district.isActive = :isActive', {
        id: createUserDto.district,
        ...isActive,
      })
      .getOne();

    const thana = await this.thanaRepository.findOne({
      where: {
        id: createUserDto.thana,
        ...isActive,
      },
    });
    const state = district.state;
    const address = new AddressEntity();
    address.country = country;
    address.district = district;
    address.state = state;
    address.thana = thana;
    address.address = createUserDto.addressPlain;
    address.alias = 'My Alias';
    address.firstname = createUserDto.firstName;
    address.lastname = createUserDto.lastName;
    address.phone = createUserDto.phone;
    await this.addressRepository.save(address);
    return address;
  };

  createUser = async (createUserDto: CreateUserDto): Promise<UserEntity> => {
    createUserDto.geoLocation = { x: 23.735227125474488, y: 90.42589247303918 };
    console.log({ createUserDto });

    if (createUserDto.phone !== null && createUserDto.phone.length > 0) {
      const isPhoneDupicate = await this.userRepository.findOne({
        phone: createUserDto.phone,
      });
      if (isPhoneDupicate) {
        throw new Error('Phone number already is in use');
      }
    }
    if (createUserDto.email !== null && createUserDto.email.length > 0) {
      const isEmailDupicate = await this.userRepository.findOne({
        email: createUserDto.email,
      });
      if (isEmailDupicate) {
        throw new Error('Email address already is in use');
      }
    }

    createUserDto.password = await this.bcryptService.hashPassword(
      createUserDto.password,
    );

    let userDto: UserDto = createUserDto;
    userDto = this.requestService.forCreate(userDto);

    const dtoToEntity = await this.conversionService.toEntity<
      UserEntity,
      UserDto
    >(userDto);
    const user = this.userRepository.create(dtoToEntity);
    user.isActive = ActiveStatus.disabled;

    user.profile = await this.generateProfileEntity();
    user.geoLocation = createUserDto.geoLocation;
    // user.address = await this.generateAddress(createUserDto);

    try {
      await this.userRepository.save(user);
    } catch (error) {
      console.log('💦 💦 💦 💦 💦 💦 💦 💦 💦 💦 💦 💦 💦 💦 💦 💦 💦', error);
    }

    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥', user);
    // await this.userRepository.save(user);

    switch (createUserDto.type) {
      case UserType.SUPER_ADMIN: {
        return this.generateUserRoleEntity(RoleName.SUPER_ADMIN_ROLE, user);
        break;
      }
      case UserType.ADMIN: {
        await this.generateAdminEntity(user, true);
        return this.generateUserRoleEntity(RoleName.ADMIN_ROLE, user);
        break;
      }
      case UserType.CUSTOMER: {
        await this.generateCustomerEntity(user, true);
        return this.generateUserRoleEntity(RoleName.CUSTOMER_ROLE, user);
        break;
      }
      case UserType.MERCHANT: {
        await this.generateCustomerEntity(user, false);
        await this.generateUserRoleEntity(RoleName.CUSTOMER_ROLE, user);
        await this.generateMerchantEntity(user);

        /*----------- Notification-------------(start) */
        // eslint-disable-next-line prefer-const
        const dto = this.createNotificationDto(createUserDto);
        await this.createNotification(dto);

        const admin = await this.userRepository.find({
          where: {
            lastName: 'admin',
          },
        });

        if (admin && admin.length) {
          for (let i = 0; i < admin.length; i++) {
            await this.notificationMailToAdmin(admin[i].email, dto);
          }
        }

        /*----------- Notification-------------(end) */
        return this.generateUserRoleEntity(RoleName.MERCHANT_ROLE, user);
        break;
      }
      case UserType.EMPLOYEE: {
        await this.generateEmployeeEntity(user, true);
        return this.generateUserRoleEntity(RoleName.EMPLOYEE_ROLE, user);
        break;
      }
      case UserType.SHOP_MANAGER: {
        await this.generateShopManagerEntity(user, true);
        return this.generateUserRoleEntity(RoleName.SHOP_MANAGER, user);
        break;
      }
      case UserType.AFFILIATOR: {
        await this.generateAffiliatorEntity(user);
        return this.generateUserRoleEntity(RoleName.AFFILIATOR_ROLE, user);
        break;
      }
      case UserType.TRANSPORTER: {
        await this.generateTransporter(user, true);
        // await this.generateCustomerEntity(user, false);
        // await this.generateUserRoleEntity(RoleName.CUSTOMER_ROLE, user);
        return this.generateUserRoleEntity(RoleName.TRANSPORTER_ROLE, user);
        break;
      }
    }
  };

  createNotificationDto(createUserDto: CreateUserDto) {
    const notificationDto: NotificationDto = new NotificationDto();
    const userName = createUserDto.firstName + ' ' + createUserDto.lastName;
    notificationDto.message = 'New merchant ' + userName + ' has arrived';
    notificationDto.status = 0;
    return notificationDto;
  }

  addRole = async (id: string, dto: AddUserRoleDto): Promise<UserDto> => {
    try {
      const user = await this.getUser(id);

      let userRole = new UserRoleEntity();
      userRole.user = user;
      userRole.role = await this.getRole(dto.roleId);
      userRole = this.requestService.forCreate(userRole);
      await this.userRoleRepository.save(userRole);

      return this.conversionService.toDto<UserEntity, UserDto>(user);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  /*************** relations ************/
  getUser = async (id: string): Promise<UserEntity> => {
    const user = await this.userRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(user, 'User not found!');
    return user;
  };

  getAdminByUserId = async (userId: string): Promise<AdminEntity> => {
    try {
      const query = this.adminRepository.createQueryBuilder('admins');
      query
        .innerJoinAndSelect('admins.user', 'users')
        .where('users.id = :id', { id: userId })
        .andWhere('users.isActive = :isActive', { ...isActive })
        .andWhere('users.admin IS NOT NULL');

      const userRow = await query.getOne();
      if (!userRow) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! No Admin Found.'),
        );
      }
      // this.exceptionService.notFound(users, 'No merchant found!!');
      // const user = await this.conversionService.toDto<AdminEntity, AdminDto>(
      //   userRow,
      // );
      return userRow;
    } catch (error) {
      throw new SystemException(error);
    }
  };

  async getUserAndProfile(id: string) {
    const user = await this.userRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: ['profile'],
    });
    this.exceptionService.notFound(user, 'User not found!');
    return user;
  }

  getRole = async (id: string): Promise<RoleEntity> => {
    const role = await this.roleRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(role, 'Role not found!');
    return role;
  };

  getRoleByName = async (role: RoleName): Promise<RoleEntity> => {
    const roleByName = await this.roleRepository.findOne({
      where: {
        role,
        ...isActive,
      },
    });
    this.exceptionService.notFound(roleByName, 'Role not found!');
    return roleByName;
  };

  otpGenerator = (): number => {
    const max = 99999;
    const min = 10001;
    const generate = Math.random() * (max - min) + min;
    return Math.round(generate);
  };

  /**********************Admin Bank Details list******************************/

  async bankdetailsPagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
    bankDetailsSearchDto: BankDetailsSearchDto,
  ): Promise<[BankDetailsDto[], number]> {
    try {
      let userMerchant;
      let bank;
      const query = await this.bankDetailsRepository.createQueryBuilder(
        'bank_details',
      );

      if (bankDetailsSearchDto.merchantId) {
        userMerchant = await this.getMerchantById(
          bankDetailsSearchDto.merchantId,
        );
        if (!userMerchant) {
          return [[], 0];
        }
      }

      if (bankDetailsSearchDto.bankId) {
        bank = await this.getBank(bankDetailsSearchDto.bankId);
      }

      query
        .where({ ...isActive })
        .leftJoinAndSelect('bank_details.merchant', 'merchant')
        .leftJoinAndSelect('merchant.user', 'user')
        .leftJoinAndSelect('bank_details.banks', 'banks');

      query
        .orderBy('bank_details.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (bankDetailsSearchDto.merchantId) {
        query.andWhere('merchant.id = :merchantId', {
          merchantId: userMerchant.id,
        });
      }

      if (bankDetailsSearchDto.bankId) {
        query.andWhere('banks.id = :bankId', {
          bankId: bank.id,
        });
      }

      if (bankDetailsSearchDto.accountNumber) {
        query.andWhere(
          'lower(bank_details.accountNumber) like :accountNumber',
          {
            accountNumber: `%${bankDetailsSearchDto.accountNumber.toLowerCase()}%`,
          },
        );
      }

      if (bankDetailsSearchDto.accountHolderName) {
        query.andWhere(
          'lower(bank_details.accountHolderName) like :accountHolderName',
          {
            accountHolderName: `%${bankDetailsSearchDto.accountHolderName.toLowerCase()}%`,
          },
        );
      }

      const [allbankdetail, count] = await query.getManyAndCount();

      const allbankdetails = await this.conversionService.toDtos<
        BankDetailsEntity,
        BankDetailsDto
      >(allbankdetail);

      return [allbankdetails, count];
    } catch (error) {
      throw new SystemException(error);
    }
  }

  getMerchantById = async (merchantId: string): Promise<MerchantDto> => {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: { ...isActive, id: merchantId, isApproved: 1 },
      });
      if (!merchant) {
        throw new SystemException(
          new ForbiddenException('Sorry !!! This Merchant is not approved yet'),
        );
      }
      // this.exceptionService.notFound(users, 'No merchant found!!');
      const user = await this.conversionService.toDto<
        MerchantEntity,
        MerchantDto
      >(merchant);
      return user;
    } catch (error) {
      throw new SystemException(error);
    }
  };

  async getBank(id: string): Promise<BankEntity> {
    const bank = await this.bankRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(bank, 'Bank Not Found!!');
    return bank;
  }
}
