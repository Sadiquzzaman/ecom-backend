import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateCustomerRefundRequestDto,
  CustomerGuard,
  CustomerRefundRequestDto,
  CustomerRefundRequestStatusDto,
  DtoValidationPipe,
  PaginationDecorator,
  PaginationDTO,
  ResponseDto,
  ResponseService,
  UpdateCustomerRefundRequestDto,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { CustomerRefundService } from '../services/customer-refund.service';

@ApiTags('Customer Refund')
@ApiBearerAuth()
@Controller('customer-refund')
export class CustomerRefundController {
  constructor(
    private readonly responseService: ResponseService,
    private readonly customerRefundService: CustomerRefundService,
  ) {} // private readonly requestService: RequestService, // private readonly responseService: ResponseService,

  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: 'Get the paginated data of refund request list',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Get('get-refund-request-list')
  // getRefundRequestPaginatedList(
  //   @PaginationDecorator() pagination: PaginationDTO,
  //   @Query() refundRequestStatus: CustomerRefundRequestStatusDto,
  // ): Promise<ResponseDto> {
  //   const confirmedOrders = this.customerRefundService.pagination(
  //     pagination.page,
  //     pagination.limit,
  //     pagination.sort,
  //     pagination.order === 'ASC' ? 'ASC' : 'DESC',
  //     refundRequestStatus,
  //   );
  //   return this.responseService.toPaginationResponse(
  //     HttpStatus.OK,
  //     'Customer Refund Request Pagination',
  //     pagination.page,
  //     pagination.limit,
  //     confirmedOrders,
  //   );
  // }

  @UseGuards(new CustomerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of refund request list for customer',
  })
  @HttpCode(HttpStatus.OK)
  @Get('get-customer-refund-request-list')
  getRefundRequestPaginatedListForCustomer(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() refundRequestStatus: CustomerRefundRequestStatusDto,
  ): Promise<ResponseDto> {
    const confirmedOrders = this.customerRefundService.paginationForCustomer(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      refundRequestStatus,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      'Customer Refund Request Pagination',
      pagination.page,
      pagination.limit,
      confirmedOrders,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(): Promise<any> {
    return Promise.resolve('data');
  }

  // Get Order Shop Invoices for Refund Request
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('order-details/:id')
  getShopInvoicesAndAssignmentsOfOrder(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const invoices = this.customerRefundService.getShopInvoicesOfAnOrder(id);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, invoices);
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
    const customerRefund = this.customerRefundService.findById(id);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      customerRefund,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  findOne(dto: any): Promise<any> {
    return Promise.resolve('data');
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Create Customer Refund Request!',
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: CreateCustomerRefundRequestDto })
  @Post('create-refund-request')
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    customerRefundRequestDto: CreateCustomerRefundRequestDto,
  ): Promise<ResponseDto> {
    const refundRequestData = this.customerRefundService.create(
      customerRefundRequestDto,
    );
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Refund Request Created',
      refundRequestData,
    );
  }

  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: '',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Patch('update-refund-request-status/:id')
  // updateRefundRequestStatus(
  //   @Param('id', new UuidValidationPipe()) id: string,
  //   @Body(
  //     new DtoValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  //   )
  //   dto: UpdateCustomerRefundRequestDto,
  // ): Promise<ResponseDto> {
  //   const updatedData = this.customerRefundService.updateRefundRequestStatus(
  //     id,
  //     dto,
  //   );
  //   return this.responseService.toDtoResponse<CustomerRefundRequestDto>(
  //     HttpStatus.OK,
  //     'Refund Request Updated',
  //     updatedData,
  //   );
  // }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  update(id: string, dto: any): Promise<any> {
    return Promise.resolve('data');
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  remove(id: string): Promise<any> {
    return Promise.resolve('data');
  }
}
