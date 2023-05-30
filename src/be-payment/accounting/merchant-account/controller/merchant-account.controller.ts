import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AdminGuard,
  DtoValidationPipe,
  IntValidationPipe,
  MerchantInvoiceDto,
  RequestService,
  ResponseDto,
  ResponseService,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { MerchantAccountService } from '../service/merchant-account.service';

@ApiTags('Merchant Account')
@ApiBearerAuth()
@Controller('merchant-account')
export class MerchantAccountController {
  constructor(
    private merchatnAccountService: MerchantAccountService,
    private readonly responseService: ResponseService,
  ) {}

  // Get all the merchant invoice list
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the list of all merchant invoice',
  })
  @HttpCode(HttpStatus.OK)
  @Get('merchant-invoice')
  findAll(): Promise<ResponseDto> {
    const merchantInvoices = this.merchatnAccountService.findAll();
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      merchantInvoices,
    );
  }

  // // Get a single merchant invoice by merchant invoice object
  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: 'Get a single merchant invoice by object',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Post('find')
  // findOne(
  //   @Body(
  //     new DtoValidationPipe({
  //       skipMissingProperties: true,
  //       whitelist: true,
  //       forbidNonWhitelisted: true,
  //     }),
  //   )
  //   merchantInvoiceDto: MerchantInvoiceDto,
  // ): Promise<ResponseDto> {
  //   const merchantInvoices =
  //     this.merchatnAccountService.findByObject(merchantInvoiceDto);
  //   return this.responseService.toDtosResponse(
  //     HttpStatus.OK,
  //     null,
  //     merchantInvoices,
  //   );
  // }

  // Get the paginated list of merchant invoice
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of merchant invoice with details',
  })
  @HttpCode(HttpStatus.OK)
  @Get('merchant-invoice/pagination')
  pagination(
    @Query('page', new IntValidationPipe()) page: number,
    @Query('limit', new IntValidationPipe()) limit: number,
    @Query('sort') sort: string,
    @Query('order') order: string,
  ): Promise<ResponseDto> {
    const merchantInvoices = this.merchatnAccountService.pagination(
      page,
      limit,
      sort,
      order,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      page,
      limit,
      merchantInvoices,
    );
  }

  // Get merchant invoice by order id
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('merchant-invoice/find/order/:id')
  findByOrder(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const invoices = this.merchatnAccountService.findByOrder(id);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, invoices);
  }

  // // Get merchant invoice by user id
  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: 'Get merchant invoice by user id',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Get('find/user/:id')
  // findByUser(
  //   @Param('id', new UuidValidationPipe()) id: string,
  // ): Promise<ResponseDto> {
  //   const merchantInvoices = this.merchatnAccountService.findByUser(id);
  //   return this.responseService.toDtosResponse(
  //     HttpStatus.OK,
  //     null,
  //     merchantInvoices,
  //   );
  // }

  // Change status of single merchant invoice
  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Merchant Invoice is deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete('merchant-invoice/:id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.merchatnAccountService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Merchant Invoice is deleted successfully',
      deleted,
    );
  }

  // Get a single merchant invoice by id
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get a single merchant invoice by id',
  })
  @HttpCode(HttpStatus.OK)
  @Get('merchant-invoice/:id')
  findById(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const mercchantInvoice = this.merchatnAccountService.findById(id);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      mercchantInvoice,
    );
  }
}
