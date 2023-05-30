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
  DtoValidationPipe,
  GeneralController,
  IntValidationPipe,
  RequestService,
  ResponseDto,
  ResponseService,
  UuidValidationPipe,
  RefundReasonDto,
  RefundReasonEntity,
} from '@simec/ecom-common';
import { RefundReasonService } from '../services/refund-reason.service';

@ApiTags('Refund Reasons')
@ApiBearerAuth()
@Controller('refund-reason')
export class RefundReasonController
  implements GeneralController<RefundReasonDto>
{
  constructor(
    private refundReasonService: RefundReasonService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(): Promise<ResponseDto> {
    const refundReasons = this.refundReasonService.findAll();
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      refundReasons,
    );
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
    brandDto: RefundReasonDto,
  ): Promise<ResponseDto> {
    const refundReasons = this.refundReasonService.findByObject(brandDto);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      refundReasons,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @Query('page', new IntValidationPipe()) page: number,
    @Query('limit', new IntValidationPipe()) limit: number,
    @Query('sort') sort: string,
    @Query('order') order: string,
  ): Promise<ResponseDto> {
    const refundReasons = this.refundReasonService.pagination(
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
      refundReasons,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiCreatedResponse({
    description: 'New Refund Config added Successfully!',
  })
  @ApiBody({ type: RefundReasonDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    brandDto: RefundReasonDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(brandDto);
    const brand = this.refundReasonService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'New Refund Config added Successfully!',
      brand,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    description: 'New Refund Config updated Successfully!',
  })
  @ApiBody({ type: RefundReasonDto })
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
    brandDto: RefundReasonDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(brandDto);
    const brand = this.refundReasonService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'New Refund Config updated Successfully!',
      brand,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Refund Config successfully deleted!',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.refundReasonService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Refund Config successfully deleted!',
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
    const brand = this.refundReasonService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, brand);
  }
}
