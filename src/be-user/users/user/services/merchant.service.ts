import { Between, In, Any } from 'typeorm';
import { HttpService, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ActiveStatus,
  AddressEntity,
  AddUserRoleDto,
  AffiliatorEntity,
  BcryptService,
  ChangePasswordDto,
  ConversionService,
  CountryEntity,
  CreateOtpDto,
  CreateUserDto,
  CustomerEntity,
  DeleteDto,
  DistrictEntity,
  EmployeeEntity,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  MailParserDto,
  MerchantEntity,
  OtpDto,
  PhoneOrEmailDto,
  ProfileEntity,
  RequestService,
  RoleEntity,
  RoleName,
  SystemException,
  ThanaEntity,
  UserDto,
  UserEntity,
  UserRoleDto,
  UserRoleEntity,
  UserType,
  PermissionService,
  MailFromDto,
  ResetPasswordDto,
  NotificationDto,
  ApprovalDto,
  MerchantDto,
  MerchantSearchDto,
  MerchantBankDetailsDto,
  UserResponseDto,
  BankDetailsDto,
  BankDetailsEntity,
  CreateBankDetailsDto,
  BankEntity,
  BankDetailsSearchDto,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { timeout } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { isNull } from 'util';

@Injectable()
export class MerchantService implements GeneralService<UserDto> {
  private readonly logger = new Logger(MerchantService.name);
  private readonly notificationClient: ClientProxy;

  constructor(
    private readonly configService: ConfigService,
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
    @InjectRepository(BankDetailsEntity)
    private readonly bankDetailsRepository: Repository<BankDetailsEntity>,
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

  async create(dto: CreateUserDto): Promise<UserDto> {
    return null;
  }

  updateApprovalStatus = async (dto: ApprovalDto): Promise<[MerchantDto[]]> => {
    try {
      // const users = await this.userRepository.find({
      //   where: { ...isActive },
      // });
      const modifiedDto = this.requestService.forUpdate(dto);
      const query = await this.merchantRepository
        .createQueryBuilder('marchant')
        .update()
        .set({
          isApproved:
            dto.status === true ? ActiveStatus.enabled : ActiveStatus.disabled,
          approvedBy: dto.updatedBy,
          approvedAt: dto.updatedAt,
          updatedBy: dto.updatedBy,
          updatedAt: dto.updatedAt,
        })
        .whereInIds(dto.ids);
      const merchantRs = await query.execute();

      const merchants = await this.merchantRepository
        .createQueryBuilder('marchant')
        .whereInIds(dto.ids)
        .getMany();
      return [
        await this.conversionService.toDtos<MerchantEntity, MerchantDto>(
          merchants,
        ),
      ];
    } catch (error) {
      throw new SystemException(error);
    }
  };

  findAll = async (): Promise<UserDto[]> => {
    try {
      const query = this.userRepository.createQueryBuilder('users');

      const users = await query
        .innerJoinAndSelect('users.merchant', 'merchant')
        .where('users.isActive = :isActive', { ...isActive })
        .andWhere('users.merchant IS NOT NULL')
        // .orderBy(sort !== 'undefined' ? sort : 'updatedAt', order)

        .getMany();

      // this.exceptionService.notFound(users, 'No merchant found!!');
      const user = await this.conversionService.toDtos<UserEntity, UserDto>(
        users,
      );
      return user;
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

  merchantPagination = async (
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    merchantSearch: MerchantSearchDto,
  ): Promise<[UserDto[], number]> => {
    try {
      const query = this.userRepository.createQueryBuilder('users');
      query
        .innerJoinAndSelect('users.merchant', 'merchant')
        .where('users.isActive = :isActive', { ...isActive })
        .andWhere('users.merchant IS NOT NULL');
      if (merchantSearch.isApproved) {
        query.andWhere('merchant.isApproved = :isApproved', {
          isApproved: merchantSearch.isApproved === '1' ? '1' : '0',
        });
      }
      if (merchantSearch.firstName) {
        query.andWhere('concat(lower(users.firstName), \' \',lower(users.lastName)) like :fullName', {
          fullName: `%${merchantSearch.firstName.toLowerCase()}%`,
        });
      }
      if (merchantSearch.email) {
        query.andWhere('lower(users.email) like :email', {
          email: `%${merchantSearch.email.toLowerCase()}%`,
        });
      }
      query
        .orderBy(`users.${sort}`, order)
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

  merchantSearchPagination = async (
    name: string,
  ): Promise<[UserDto[], number]> => {
    try {
      if (!name || name.length === 0) {
        return Promise.resolve([null, 0]);
      }
      const query = this.userRepository.createQueryBuilder('users');

      const [users, count] = await query
        .innerJoinAndSelect('users.merchant', 'merchant')
        .where('users.isActive = :isActive', { ...isActive })
        .andWhere('users.firstName like :firstName', { firstName: `%${name}%` })
        .andWhere('users.merchant IS NOT NULL')
        // .orderBy(sort !== 'undefined' ? sort : 'updatedAt', order)
        .skip(0)
        .take(10)
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

  findAllMerchantList = async (): Promise<UserDto[]> => {
    try {
      const query = this.userRepository.createQueryBuilder('users');

      const users = await query
        .innerJoinAndSelect('users.merchant', 'merchant')
        .where('users.isActive = :isActive', { ...isActive })
        .andWhere('users.merchant IS NOT NULL')
        // .orderBy(sort !== 'undefined' ? sort : 'updatedAt', order)
        .getMany();

      // this.exceptionService.notFound(users, 'No merchant found!!');
      const user = await this.conversionService.toDtos<UserEntity, UserDto>(
        users,
      );
      return user;
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
      .subscribe();
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
    label: string[],
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
          'role.role_id=userRoleType.id',
        )
        .where('userRoleType.role in (:...roles)', {
          roles: [label],
        })
        .skip((page - 1) * limit)
        .take(limit);
      const [users, total] = await query.getManyAndCount();
      return this.conversionService.toPagination<UserEntity, UserDto>([
        users,
        total,
      ]);
    } catch (error) {
      throw new SystemException(error);
    }
  };
  '"';
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

  generateEmployeeEntity = async (user: UserEntity): Promise<void> => {
    let employeeEntity = new EmployeeEntity();
    employeeEntity = this.requestService.forCreate(employeeEntity);

    const employee = this.employeeRepository.create(employeeEntity);
    await this.employeeRepository.save(employee);
    user.employee = employee;
    await this.userRepository.save(user);
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
    await this.addressRepository.save(address);
    return address;
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
  /**********************Merchant Bank Details*******************************/

  async findAllBankdetails(): Promise<BankDetailsDto[]> {
    try {
      const userSession: UserResponseDto = this.requestService.userSession();

      const query = await this.bankDetailsRepository.createQueryBuilder(
        'bank_details',
      );

      query
        .where({ ...isActive })
        .leftJoinAndSelect('bank_details.merchant', 'merchant')
        .leftJoinAndSelect('bank_details.banks', 'banks')
        .andWhere('merchant.id = :merchantId', {
          merchantId: userSession.MerchantId,
        });

      const allbankdetails = await query.getMany();
      return this.conversionService.toDtos<BankDetailsEntity, BankDetailsDto>(
        allbankdetails,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findBankdetailsByObject(
    bankDetailsDto: BankDetailsDto,
  ): Promise<BankDetailsDto[]> {
    try {
      const allbankdetails = await this.bankDetailsRepository.find({
        where: {
          ...bankDetailsDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<BankDetailsEntity, BankDetailsDto>(
        allbankdetails,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async bankdetailsPagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
    bankDetailsSearchDto: BankDetailsSearchDto,
  ): Promise<[BankDetailsDto[], number]> {
    try {
      let bank;
      const userSession: UserResponseDto =
        await this.requestService.userSession();

      if (bankDetailsSearchDto.bankId) {
        bank = await this.getBank(bankDetailsSearchDto.bankId);
      }

      const query = await this.bankDetailsRepository.createQueryBuilder(
        'bank_details',
      );

      query
        .where({ ...isActive })
        .leftJoinAndSelect('bank_details.merchant', 'merchant')
        .leftJoinAndSelect('bank_details.banks', 'banks')
        .andWhere('merchant.id = :merchantId', {
          merchantId: userSession.MerchantId,
        });

      query
        .orderBy('bank_details.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

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

  async createBankdetails(dto: CreateBankDetailsDto): Promise<BankDetailsDto> {
    try {
      const userSession: UserResponseDto =
        await this.requestService.userSession();
      const dtoToEntity = await this.conversionService.toEntity<
        BankDetailsEntity,
        BankDetailsDto
      >(dto);

      const bankDetails = this.bankDetailsRepository.create(dtoToEntity);
      bankDetails.banks = await this.getBank(dto.bankId);
      bankDetails.merchant = await this.getMerchant(userSession.MerchantId);
      await this.bankDetailsRepository.save(bankDetails);
      return this.conversionService.toDto<BankDetailsEntity, BankDetailsDto>(
        bankDetails,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async updateBankdetails(
    id: string,
    dto: BankDetailsDto,
  ): Promise<BankDetailsDto> {
    try {
      const saveDto = await this.getBankDetails(id);

      const dtoToEntity = await this.conversionService.toEntity<
        BankDetailsEntity,
        BankDetailsDto
      >({ ...saveDto, ...dto });

      const updatedBankDetails = await this.bankDetailsRepository.save(
        dtoToEntity,
        {
          reload: true,
        },
      );
      return this.conversionService.toDto<BankDetailsEntity, BankDetailsDto>(
        updatedBankDetails,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async removeBankdetails(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getBankDetails(id);

      const deleted = await this.bankDetailsRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findBankdetailsById(id: string): Promise<BankDetailsDto> {
    try {
      const bankDetail = await this.getBankDetails(id);
      return this.conversionService.toDto<BankDetailsEntity, BankDetailsDto>(
        bankDetail,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findBankdetailsByBankId(bankId: string): Promise<BankDetailsDto[]> {
    try {
      const userSession: UserResponseDto =
        await this.requestService.userSession();
      const query = await this.bankDetailsRepository.createQueryBuilder(
        'bank_details',
      );
      query
        .where({ ...isActive })
        .leftJoinAndSelect('bank_details.merchant', 'merchant')
        .leftJoinAndSelect('bank_details.banks', 'banks')
        .leftJoinAndSelect('merchant.user', 'user')
        .andWhere('banks.id = :bankIds', { bankIds: bankId })
        .andWhere('merchant.id = :merchantId', {
          merchantId: userSession.MerchantId,
        });

      const bankDetail = await query.getMany();
      return this.conversionService.toDtos<BankDetailsEntity, BankDetailsDto>(
        bankDetail,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/

  async getBankDetails(id: string): Promise<BankDetailsEntity> {
    const bankDetail = await this.bankDetailsRepository.findOne({
      where: {
        id,
        ...isActive,
      },
      relations: ['banks'],
    });
    this.exceptionService.notFound(bankDetail, 'Bank Detail Not Found!!');
    return bankDetail;
  }

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

  async getMerchant(id: string): Promise<MerchantEntity> {
    const merchant = await this.merchantRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(merchant, 'Merchant Not Found!!');
    return merchant;
  }
}
