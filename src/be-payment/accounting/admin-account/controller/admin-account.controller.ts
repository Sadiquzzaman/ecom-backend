import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  IntValidationPipe,
  InvoiceEntity,
  ResponseDto,
  ResponseService,
} from '@simec/ecom-common';
import { AdminAccountService } from '../service/admin-account.service';

@ApiTags('Admin-Account')
@ApiBearerAuth()
@Controller('admin-account')
export class AdminAccountController {
  constructor(
    private adminAccountService: AdminAccountService,
    private readonly responseService: ResponseService,
  ) {}

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of invoice with details',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @Query('page', new IntValidationPipe()) page: number,
    @Query('limit', new IntValidationPipe()) limit: number,
    @Query('sort') sort: string,
    @Query('order') order: string,
  ): Promise<ResponseDto> {
    const invoices = this.adminAccountService.pagination(
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
      invoices,
    );
  }
}
