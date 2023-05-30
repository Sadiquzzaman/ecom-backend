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
  MerchantGuard,
  PaginationDecorator,
  PaginationDTO,
  ResponseDto,
  ResponseService,
  ShipmentAssignmentDeliveryStatusDto,
  UpdateCustomerRefundRequestDto,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { MerchantRefundService } from '../services/merchant-refund.service';

@ApiTags('Merchant Refund')
@ApiBearerAuth()
@Controller('merchant-refund')
export class MerchantRefundController {
  constructor(
    private readonly responseService: ResponseService,
    private readonly merchantRefundService: MerchantRefundService,
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
  //   const confirmedOrders = this.merchantRefundService.pagination(
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

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() status: ShipmentAssignmentDeliveryStatusDto,
  ): Promise<ResponseDto> {
    const brands = this.merchantRefundService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      status,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      brands,
    );
  }

  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: '',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Get()
  // findAll(): Promise<any> {
  //   return Promise.resolve('data');
  // }

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
    const invoices = this.merchantRefundService.getShopInvoicesOfAnOrder(id);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, invoices);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/:refundStatus')
  findById(
    @Param('id', new UuidValidationPipe()) id: string,
    @Param('refundStatus') refundStatus: number,
  ): Promise<ResponseDto> {
    const customerRefund = this.merchantRefundService.findById(
      id,
      refundStatus,
    );
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      customerRefund,
    );
  }

  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: '',
  // })
  // @HttpCode(HttpStatus.OK)
  // findOne(dto: any): Promise<any> {
  //   return Promise.resolve('data');
  // }

  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: 'Create Customer Refund Request!',
  // })
  // @HttpCode(HttpStatus.OK)
  // @ApiBody({ type: CreateCustomerRefundRequestDto })
  // @Post('create-refund-request')
  // create(
  //   @Body(
  //     new DtoValidationPipe({
  //       whitelist: true,
  //       forbidNonWhitelisted: true,
  //     }),
  //   )
  //   customerRefundRequestDto: CreateCustomerRefundRequestDto,
  // ): Promise<ResponseDto> {
  //   const refundRequestData = this.merchantRefundService.create(
  //     customerRefundRequestDto,
  //   );
  //   return this.responseService.toDtoResponse(
  //     HttpStatus.OK,
  //     'Refund Request Created',
  //     refundRequestData,
  //   );
  // }

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
  //   const updatedData = this.merchantRefundService.updateRefundRequestStatus(
  //     id,
  //     dto,
  //   );
  //   return this.responseService.toDtoResponse<CustomerRefundRequestDto>(
  //     HttpStatus.OK,
  //     'Refund Request Updated',
  //     updatedData,
  //   );
  // }

  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: '',
  // })
  // @HttpCode(HttpStatus.OK)
  // update(id: string, dto: any): Promise<any> {
  //   return Promise.resolve('data');
  // }

  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: '',
  // })
  // @HttpCode(HttpStatus.OK)
  // remove(id: string): Promise<any> {
  //   return Promise.resolve('data');
  // }
}
