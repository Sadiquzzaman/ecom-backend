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
  BankDto,
  DtoValidationPipe,
  GeneralController,
  IntValidationPipe,
  PaginationDecorator,
  PaginationDTO,
  RequestService,
  ResponseDto,
  ResponseService,
  ShopManagerGuard,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { BankService } from './../services/bank.service';

@ApiTags('bank')
@ApiBearerAuth()
@Controller('banks')
export class BankController implements GeneralController<BankDto> {
  constructor(
    private bankService: BankService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  // @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'All Bank Lists',
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(): Promise<ResponseDto> {
    const banks = this.bankService.findAll();
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      'All Bank Lists',
      banks,
    );
  }

  @UseGuards(new ShopManagerGuard())
  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'All Bank Lists',
  })
  @HttpCode(HttpStatus.OK)
  @Get('merchant')
  findAllBankForMerchant(): Promise<ResponseDto> {
    const banks = this.bankService.findAllBankForMerchant();
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      'All Bank Lists',
      banks,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Bank List Using Object',
  })
  @HttpCode(HttpStatus.OK)
  @Post('find')
  findOne(
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    bankDto: BankDto,
  ): Promise<ResponseDto> {
    const banks = this.bankService.findByObject(bankDto);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      'Bank List Using Object',
      banks,
    );
  }

  // @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'All Bank List Pagination list',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @PaginationDecorator() pagination: PaginationDTO,
  ): Promise<ResponseDto> {
    const banks = this.bankService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      'All Bank List Pagination List',
      pagination.page,
      pagination.limit,
      banks,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiCreatedResponse({
    description: 'Bank Successfully Added',
  })
  @ApiBody({ type: BankDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    bankDto: BankDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(bankDto);
    const bank = this.bankService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Bank Successfully Added',
      bank,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    description: 'Bank Successfully Updated',
  })
  @ApiBody({ type: BankDto })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  update(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    bankDto: BankDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(bankDto);
    const bank = this.bankService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Bank Successfully Updated',
      bank,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Bank successfully deleted!',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.bankService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Bank successfully deleted!',
      deleted,
    );
  }

  // @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  findById(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const bank = this.bankService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, bank);
  }
}
