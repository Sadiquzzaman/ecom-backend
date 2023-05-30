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
  Response,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AdminGuard,
  AdminInvoiceSearchDto,
  DtoValidationPipe,
  ExcelColumnType,
  ExportExcelDto,
  IntValidationPipe,
  InvoiceDto,
  MerchantInvoiceSearchDto,
  PaginationDecorator,
  PaginationDTO,
  RequestService,
  ResponseDto,
  ResponseService,
  ShopInvoiceSearchDto,
  UuidValidationPipe,
} from '@simec/ecom-common';

import { InvoiceService } from '../services/invoice.service';
import { MerchantInvoiceService } from '../services/merchant-invoice.service';
import { ShopInvoiceService } from '../services/shop-invoice.service';

@ApiTags('Admin Invoice')
@ApiBearerAuth()
@Controller('admin-invoices')
export class AdminInvoiceController {
  constructor(
    private invoiceService: InvoiceService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
    private readonly shopInvoiceService: ShopInvoiceService,
    private merchatnInvoiceService: MerchantInvoiceService,
  ) {}

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(): Promise<ResponseDto> {
    const invoices = this.invoiceService.findAll();
    // console.log(invoices);

    return this.responseService.toDtosResponse(HttpStatus.OK, null, invoices);
  }

  // Get Excel Exported Data at admin end
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of merchant invoice with details',
  })
  @HttpCode(HttpStatus.OK)
  @Get('export-admin')
  async exportAdmin(
    @Response() res,
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() adminInvoiceSearchDto: AdminInvoiceSearchDto,
  ): Promise<any> {
    console.log('admin invoice pagination called ', adminInvoiceSearchDto);
    const adminInvoices = await this.invoiceService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      adminInvoiceSearchDto,
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
        header: 'Customer',
        key: 'customer',
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

    adminInvoices[0].forEach((invoice, index) => {
      console.log(
        'ttttttttttttttttttttttttttttttttttttttttttttttttttttttt',
        invoice,
      );

      const data = {};
      const date = new Date(invoice.createAt);

      data['serial'] = index + 1;
      data['date'] = date.toLocaleDateString('en-US');
      data['customer'] =
        invoice?.user?.firstName + ' ' + invoice?.user?.lastName;
      data['amount'] = invoice ? parseFloat(`${invoice.invoiceTotal}`) : 0.0;
      data['status'] = invoice?.status.toUpperCase();
      rows.push(data);
    });
    exporta.rows = rows;
    this.invoiceService.exportData(exporta).then((buff) => {
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

  //Export excel for shop invoice at admin end
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of merchant invoice with details',
  })
  @HttpCode(HttpStatus.OK)
  @Get('export-shop')
  async exportShopInvoice(
    @Response() res,
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() shopInvoiceSearch: ShopInvoiceSearchDto,
  ): Promise<any> {
    console.log('merchant invoice pagination called ', shopInvoiceSearch);
    const merchantInvoices = await this.invoiceService.paginationShopInvoice(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      shopInvoiceSearch,
    );
    const exporData: ExportExcelDto = new ExportExcelDto();
    exporData.headers = [
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
      console.log(invoice);

      const data = {};
      const date = new Date(invoice.createAt);

      data['serial'] = index + 1;
      data['date'] = date.toLocaleDateString('en-US');
      data['name'] = invoice?.shop?.name;
      data['amount'] = invoice ? parseFloat(`${invoice.invoiceTotal}`) : 0.0;
      data['status'] = invoice?.status.toUpperCase();
      console.log(data);
      rows.push(data);
    });
    exporData.rows = rows;
    this.invoiceService.exportData(exporData).then((buff) => {
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

  // Get Excel Exported Data for merchant at admin end
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
      await this.invoiceService.paginationMerchantInvoice(
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
        header: 'Merchant',
        key: 'merchant',
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
      const data = {};
      const date = new Date(invoice.createAt);

      data['serial'] = index + 1;
      data['date'] = date.toLocaleDateString('en-US');
      data['merchant'] =
        invoice?.merchant?.user?.firstName +
        ' ' +
        invoice?.merchant?.user?.lastName;
      data['amount'] = invoice ? parseFloat(`${invoice.invoiceTotal}`) : 0.0;
      data['status'] = invoice?.status.toUpperCase();
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
    description: '',
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
    invoiceDto: InvoiceDto,
  ): Promise<ResponseDto> {
    const invoices = this.invoiceService.findByObject(invoiceDto);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, invoices);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() adminInvoiceSearchDto: AdminInvoiceSearchDto,
  ): Promise<ResponseDto> {
    const adminInvoices = this.invoiceService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      adminInvoiceSearchDto,
    );
    //const invoices = this.invoiceService.pagination(page, limit, sort, order);
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      adminInvoices,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination-shop')
  paginationShop(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() shopInvoiceSearchDto: ShopInvoiceSearchDto,
  ): Promise<ResponseDto> {
    const adminInvoices = this.invoiceService.paginationShopInvoice(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      shopInvoiceSearchDto,
    );
    //const invoices = this.invoiceService.pagination(page, limit, sort, order);
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      adminInvoices,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination-merchant')
  paginationMerchant(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() merchantInvoiceSearch: MerchantInvoiceSearchDto,
  ): Promise<ResponseDto> {
    const adminInvoices = this.invoiceService.paginationMerchantInvoice(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      merchantInvoiceSearch,
    );
    //const invoices = this.invoiceService.pagination(page, limit, sort, order);
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      adminInvoices,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/order/:id')
  findByOrder(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const invoices = this.invoiceService.findByOrder(id);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, invoices);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/user/:id')
  findByUser(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const invoices = this.invoiceService.findByUser(id);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, invoices);
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Invoice is deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.invoiceService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Invoice is deleted successfully',
      deleted,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  findById(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const invoice = this.invoiceService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, invoice);
  }
}
