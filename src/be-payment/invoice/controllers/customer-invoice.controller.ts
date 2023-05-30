import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AdminGuard,
  IntValidationPipe,
  MerchantInvoiceSearchDto,
  PaginationDecorator,
  PaginationDTO,
  ResponseDto,
  ResponseService,
  ShopInvoiceSearchDto,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { ShopInvoiceService } from '../services/shop-invoice.service';

@ApiTags('Customer Invoice')
@ApiBearerAuth()
@Controller('customer-invoice')
export class CustomerInvoiceController {
  constructor(
    private shopInvoiceService: ShopInvoiceService,
    private readonly responseService: ResponseService,
  ) {}

  // Get all the shop invoice list
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the list of all shop invoice',
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(): Promise<ResponseDto> {
    const shopInvoices = this.shopInvoiceService.findAll();
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      shopInvoices,
    );
  }

  // // Get a single shop invoice by shop invoice object
  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: 'Get a single shop invoice by object',
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
  //   shopInvoiceDto: shopInvoiceDto,
  // ): Promise<ResponseDto> {
  //   const shopInvoices =
  //     this.shopInvoiceService.findByObject(shopInvoiceDto);
  //   return this.responseService.toDtosResponse(
  //     HttpStatus.OK,
  //     null,
  //     shopInvoices,
  //   );
  // }

  // Get the paginated list of shop invoice
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of shop invoice with details',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() shopInvoiceSearchDto: ShopInvoiceSearchDto,
  ): Promise<ResponseDto> {
    const shopInvoices = this.shopInvoiceService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      shopInvoiceSearchDto,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      shopInvoices,
    );
  }

  // Get shop invoice by order id
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/order/:id')
  findByOrder(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const invoices = this.shopInvoiceService.findByOrder(id);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, invoices);
  }

  // // Get shop invoice by user id
  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: 'Get shop invoice by user id',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Get('find/user/:id')
  // findByUser(
  //   @Param('id', new UuidValidationPipe()) id: string,
  // ): Promise<ResponseDto> {
  //   const shopInvoices = this.shopInvoiceService.findByUser(id);
  //   return this.responseService.toDtosResponse(
  //     HttpStatus.OK,
  //     null,
  //     shopInvoices,
  //   );
  // }

  // Change status of single shop invoice
  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'shop Invoice is deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.shopInvoiceService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'shop Invoice is deleted successfully',
      deleted,
    );
  }

  // Get a single shop invoice by id
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get a single shop invoice by id',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  findById(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const mercchantInvoice = this.shopInvoiceService.findById(id);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      mercchantInvoice,
    );
  }
}
