import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdminGuard,
  DtoValidationPipe,
  GeneralController,
  ResponseDto,
  ResponseService,
  ShopManagerGuard,
  UserDto,
  UuidValidationPipe,
  UserGuard,
  RequestService,
  CreateUserDto,
  PaginationDecorator,
  MerchantSearchDto,
  PaginationDTO,
  ApprovalDto,
  MerchantBankDetailsDto,
  IntValidationPipe,
  BankDetailsDto,
  CreateBankDetailsDto,
  BankDetailsSearchDto,
} from '@simec/ecom-common';
import { MerchantService } from '../services/merchant.service';
import { UserService } from '../services/user.service';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantUserController implements GeneralController<UserDto> {
  constructor(
    private readonly userService: UserService,
    private readonly merchantService: MerchantService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('bankDetails')
  findAllBankDetails(): Promise<ResponseDto> {
    const bankDetails = this.merchantService.findAllBankdetails();
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      bankDetails,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Merchant approval updated successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Put('/merchant-approval')
  merchantApproval(
    @Body(new DtoValidationPipe())
    ApprovalDto: ApprovalDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(ApprovalDto);
    const merchantApprovalUpdate =
      this.merchantService.updateApprovalStatus(modifiedDto);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      'Merchant approval updated successfully',
      merchantApprovalUpdate[0],
    );
  }

  create(): Promise<ResponseDto> {
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Create is added successfully',
      null,
    );
  }

  @ApiBearerAuth()
  @UseGuards(new ShopManagerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/merchants-pagination')
  async findAllMerchant(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() MerchantSearch: MerchantSearchDto,
  ): Promise<ResponseDto> {
    const users = this.merchantService.merchantPagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order ? 'DESC' : 'ASC',
      MerchantSearch,
    );

    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      users,
    );
  }

  @ApiBearerAuth()
  @UseGuards(new ShopManagerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('')
  async findAll(): Promise<ResponseDto> {
    const merchants = this.merchantService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, merchants);
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('following-shops')
  getFollowingShopByUserId(): Promise<ResponseDto> {
    const userDto = this.userService.getFollowingShopsByUserId();
    return this.responseService.toDtoResponse(HttpStatus.OK, null, userDto);
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  findById(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const userDto = this.merchantService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, userDto);
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/profile')
  findProfileById(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const userDto = this.userService.getProfileByUserId(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, userDto);
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Post('find')
  findOne(
    @Body(new DtoValidationPipe({ skipMissingProperties: true })) dto: UserDto,
  ): Promise<ResponseDto> {
    const users = this.userService.findOne(dto);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, users);
  }

  @UseGuards(new UserGuard())
  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  update(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body(new DtoValidationPipe({ skipMissingProperties: true }))
    dto: CreateUserDto,
  ): Promise<ResponseDto> {
    const userDto = this.userService.update(id, dto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'User updated successfully',
      userDto,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.userService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'User deleted successfully',
      deleted,
    );
  }

  /*******************************Merchant Bank Details**********************************/

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('bankDetailsByBankId/:bankId')
  getBankDetailsByBankId(
    @Param('bankId', new UuidValidationPipe()) bankId: string,
  ): Promise<ResponseDto> {
    const bankDetails = this.merchantService.findBankdetailsByBankId(bankId);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      bankDetails,
    );
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Post('bankDetails/find')
  findOneBankDetails(
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    bankDetailsDto: BankDetailsDto,
  ): Promise<ResponseDto> {
    const bankDetails =
      this.merchantService.findBankdetailsByObject(bankDetailsDto);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      bankDetails,
    );
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('bankDetails/pagination')
  bankDetailsPagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() bankDetailsSearchDto: BankDetailsSearchDto,
  ): Promise<ResponseDto> {
    const bankDetails = this.merchantService.bankdetailsPagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order,
      bankDetailsSearchDto,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      bankDetails,
    );
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: 'Bank Details Added Successfully',
  })
  @ApiBody({ type: CreateBankDetailsDto })
  @HttpCode(HttpStatus.CREATED)
  @Post('bankDetails')
  createBankDetails(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    createBankDetailsDto: CreateBankDetailsDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(createBankDetailsDto);
    const bankDetails = this.merchantService.createBankdetails(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Bank Details Added Successfully',
      bankDetails,
    );
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Bank Details Updated Successfully',
  })
  @ApiBody({ type: CreateBankDetailsDto })
  @HttpCode(HttpStatus.OK)
  @Put('bankDetails/:id')
  updateBankDetails(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    createBankDetailsDto: CreateBankDetailsDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(createBankDetailsDto);
    const bankDetails = this.merchantService.updateBankdetails(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Bank Details Updated Successfully',
      bankDetails,
    );
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Bank Details successfully deleted!',
  })
  @HttpCode(HttpStatus.OK)
  @Delete('bankDetails/:id')
  removeBankDetails(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.merchantService.removeBankdetails(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Bank Details successfully deleted!',
      deleted,
    );
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('bankDetails/:id')
  findByIdBankDetails(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const bankDetails = this.merchantService.findBankdetailsById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, bankDetails);
  }
}
