import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  DtoValidationPipe,
  MerchantWithdrawalParamDto,
  PaginationDecorator,
  PaginationDTO,
  RequestService,
  ResponseDto,
  ResponseService,
  UpdateMerchantWithdrawalDto,
  UuidValidationPipe
} from '@simec/ecom-common';
import { AdminMerchantWithdrawalService } from '../service/admin-merchant-withdrawal.service';

@ApiBearerAuth()
@ApiTags('Admin Merchant Withdrawal')
@Controller('admin-merchant-withdrawal')
export class AdminMerchantWithdrawalController {
  constructor(
    private readonly adminMerchantWithdrawalService: AdminMerchantWithdrawalService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  // Get the paginated list of merchant invoice
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of merchant withdrawal',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() merchantWithdrawalParam: MerchantWithdrawalParamDto,
  ): Promise<ResponseDto> {
    const merchantInvoices = this.adminMerchantWithdrawalService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      merchantWithdrawalParam,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      merchantInvoices,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Patch('admin-merchant-withdrawal-update/:id')
  update(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body(new DtoValidationPipe()) body: UpdateMerchantWithdrawalDto,
  ): Promise<ResponseDto> {
    const data = this.adminMerchantWithdrawalService.update(id, body);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'merchant withdrawal updated',
      data,
    );
  }
}
