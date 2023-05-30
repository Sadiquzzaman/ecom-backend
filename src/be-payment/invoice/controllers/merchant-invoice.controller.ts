import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
  Response,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AdminGuard,
  ResponseDto,
  PaginationDTO,
  ResponseService,
  UuidValidationPipe,
  PaginationDecorator,
  MerchantInvoiceSearchDto,
  PermissionService,
  ShopInvoiceSearchDto,
  ExportExcelDto,
  ExcelColumnType,
} from '@simec/ecom-common';
import { MerchantInvoiceService } from '../services/merchant-invoice.service';

@ApiTags('Merchant Invoice')
@ApiBearerAuth()
@Controller('merchant-invoice')
export class MerchantInvoiceController {
  constructor(
    private readonly configService: ConfigService,
    private merchatnInvoiceService: MerchantInvoiceService,
    private readonly permissionService: PermissionService,
    private readonly responseService: ResponseService,
  ) {}

  // Get all the merchant invoice list
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the list of all merchant invoice',
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(): Promise<ResponseDto> {
    const merchantInvoices = this.merchatnInvoiceService.findAll();
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
  //     this.merchatnInvoiceService.findByObject(merchantInvoiceDto);
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
  @Get('pagination-merchant')
  pagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() merchantInvoiceSearch: MerchantInvoiceSearchDto,
  ): Promise<ResponseDto> {
    console.log('merchant invoice pagination called ', merchantInvoiceSearch);
    const merchantInvoices = this.merchatnInvoiceService.paginationMerchantInv(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      merchantInvoiceSearch,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      merchantInvoices,
    );
  }

  // Get the paginated list of merchant Shop invoice
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of merchant Shop invoice with details',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination-shop')
  paginationShop(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() shopInvoiceSearchDto: ShopInvoiceSearchDto,
  ): Promise<ResponseDto> {
    console.log(
      'merchant Shop invoice pagination called ',
      shopInvoiceSearchDto,
    );
    const merchantInvoices =
      this.merchatnInvoiceService.paginationMerchantShopInv(
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
      merchantInvoices,
    );
  }
  // Get Excel Exported Data for merchant at merchant end
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of merchant invoice with details',
  })
  @HttpCode(HttpStatus.OK)
  @Get('export-merchant')
  async exportMerchant(
    @Response() res,
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() merchantInvoiceSearch: MerchantInvoiceSearchDto,
  ): Promise<any> {
    console.log('merchant invoice pagination called ', merchantInvoiceSearch);
    const merchantInvoices =
      await this.merchatnInvoiceService.paginationMerchantInv(
        pagination.page,
        pagination.limit,
        pagination.sort,
        pagination.order === 'ASC' ? 'ASC' : 'DESC',
        merchantInvoiceSearch,
      );
    const exporta: ExportExcelDto = new ExportExcelDto();
    exporta.headers = [
      {
        header: 'Serial',
        key: 'serial',
        type: ExcelColumnType.NUMBER,
        isCalulate: false,
      },
      {
        header: 'Date',
        key: 'date',
        type: ExcelColumnType.DATE,
        isCalulate: false,
      },
      {
        header: 'Amount',
        key: 'amount',
        type: ExcelColumnType.NUMBER,
        isCalulate: true,
      },
      {
        header: 'Status',
        key: 'status',
        type: ExcelColumnType.STRING,
        isCalulate: false,
      },
    ];

    const rows = [];

    merchantInvoices[0].forEach((invoice, index) => {
      const data = {};
      const date = new Date(invoice.createAt);

      data['serial'] = index + 1;
      data['date'] = date.toLocaleDateString('en-US');
      data['amount'] = invoice ? parseFloat(`${invoice.invoiceTotal}`) : 0.0;
      data['status'] = invoice.status.toUpperCase();
      rows.push(data);
    });
    exporta.rows = rows;
    this.merchatnInvoiceService.exportData(exporta).then((buff) => {
      console.log(buff);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=' + Date.now() + '_report.xlsx',
      );
      return res.send(buff);
    });

    // return res.pipe();
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of merchant shop invoice with details',
  })
  @HttpCode(HttpStatus.OK)
  @Get('export-merchant-shop')
  async exportMerchantShop(
    @Response() res,
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() shopInvoiceSearch: ShopInvoiceSearchDto,
  ): Promise<any> {
    console.log('merchant shop invoice pagination called ', shopInvoiceSearch);
    const merchantInvoices =
      await this.merchatnInvoiceService.paginationMerchantShopInv(
        pagination.page,
        pagination.limit,
        pagination.sort,
        pagination.order === 'ASC' ? 'ASC' : 'DESC',
        shopInvoiceSearch,
      );
    const exporta: ExportExcelDto = new ExportExcelDto();
    exporta.headers = [
      {
        header: 'Serial',
        key: 'serial',
        type: ExcelColumnType.NUMBER,
        isCalulate: false,
      },
      {
        header: 'Date',
        key: 'date',
        type: ExcelColumnType.DATE,
        isCalulate: false,
      },
      {
        header: 'Shop Name',
        key: 'name',
        type: ExcelColumnType.STRING,
        isCalulate: false,
      },
      {
        header: 'Amount',
        key: 'amount',
        type: ExcelColumnType.NUMBER,
        isCalulate: true,
      },
      {
        header: 'Status',
        key: 'status',
        type: ExcelColumnType.STRING,
        isCalulate: false,
      },
    ];

    const rows = [];

    merchantInvoices[0].forEach((invoice, index) => {
      console.log(
        'tttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt',
        invoice,
      );

      const data = {};
      const date = new Date(invoice.createAt);

      data['serial'] = index + 1;
      data['date'] = date.toLocaleDateString('en-US');
      data['name'] = invoice.shop.name;
      data['amount'] = invoice ? parseFloat(`${invoice.invoiceTotal}`) : 0.0;
      data['status'] = invoice.status.toUpperCase();
      rows.push(data);
    });
    exporta.rows = rows;
    this.merchatnInvoiceService.exportData(exporta).then((buff) => {
      console.log(buff);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=' + Date.now() + '_report.xlsx',
      );
      return res.send(buff);
    });

    // return res.pipe();
  }

  // Get merchant invoice by order id
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/order/:id')
  findByOrder(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const invoices = this.merchatnInvoiceService.findByOrder(id);
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
  //   const merchantInvoices = this.merchatnInvoiceService.findByUser(id);
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
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.merchatnInvoiceService.remove(id);
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
  @Get(':id')
  findById(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const mercchantInvoice = this.merchatnInvoiceService.findById(id);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      mercchantInvoice,
    );
  }
}
