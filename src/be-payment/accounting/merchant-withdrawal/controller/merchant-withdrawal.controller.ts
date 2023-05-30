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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateMerchantWithdrawalRequestDto,
  DateRangeParamDto,
  DtoValidationPipe,
  MerchantWithdrawalParamDto,
  PaginationDecorator,
  PaginationDTO,
  RequestService,
  ResponseDto,
  ResponseService,
  UpdateMerchantWithdrawalDto,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { MerchantWithdrawalService } from '../service/merchant-withdrawal.service';

@ApiBearerAuth()
@ApiTags('Merchant Withdrawal')
@Controller('merchant-withdrawal')
export class MerchantWithdrawalController {
  constructor(
    private readonly merchantWithdrawalService: MerchantWithdrawalService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Merchant Widthrawal Request is Created successfully',
  })
  @ApiBody({ type: CreateMerchantWithdrawalRequestDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    )
    merchantWithdrawalRequestDto: CreateMerchantWithdrawalRequestDto,
  ): Promise<ResponseDto> {
    const merchantWithdrawalReq = this.merchantWithdrawalService.create(
      merchantWithdrawalRequestDto,
    );
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Merchant Widthrawal Request is Created successfully',
      merchantWithdrawalReq,
    );
  }

  // Get the paginated list of merchant invoice
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of merchant withdrawal',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() merchantWithdrawalParamDto: MerchantWithdrawalParamDto,
  ): Promise<ResponseDto> {
    const merchantInvoices = this.merchantWithdrawalService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      merchantWithdrawalParamDto,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      merchantInvoices,
    );
  }
  // Get available Balance of Merchant
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the available balance of merchant',
  })
  @HttpCode(HttpStatus.OK)
  @Get('available-balance')
  getAvailablebalanceForMerchant(
    @Query('merchantId') merchantId,
  ): Promise<ResponseDto> {
    const data =
      this.merchantWithdrawalService.getAvailableBalanceData(merchantId);

    return this.responseService.toResponse(
      HttpStatus.OK,
      'Available balance Data',
      data,
    );
    return data;
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Patch('merchant-withdrawal-update/:id')
  update(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body(new DtoValidationPipe()) body: UpdateMerchantWithdrawalDto,
  ): Promise<ResponseDto> {
    const data = this.merchantWithdrawalService.update(id, body);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'merchant withdrawal updated',
      data,
    );
  }
}
