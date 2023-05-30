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
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdminGuard,
  CreateCouponDto,
  DtoValidationPipe,
  GeneralController,
  IntValidationPipe,
  PaginationDecorator,
  PaginationDTO,
  RequestService,
  ResponseDto,
  ResponseService,
  CouponPaginationSearchFilter,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { CouponDto } from '@simec/ecom-common/dist/dto/coupon/coupon.dto';

import { CouponService } from '../services/coupon.service';

@ApiTags('Coupon')
@ApiBearerAuth()
@Controller('coupon')
export class CouponController
  implements GeneralController<CouponDto, ResponseDto>
{
  constructor(
    private couponService: CouponService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(new AdminGuard())
  @Get()
  findAll(): Promise<ResponseDto> {
    const shops = this.couponService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @UseGuards(new AdminGuard())
  @HttpCode(HttpStatus.OK)
  @Get('find')
  findOne(
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CouponDto,
  ): Promise<ResponseDto> {
    const shops = this.couponService.findByObject(dto);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @UseGuards(new AdminGuard())
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() couponSearchFilterDto: CouponPaginationSearchFilter,
  ): Promise<ResponseDto> {
    const shops = this.couponService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      couponSearchFilterDto,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      shops,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(new AdminGuard())
  @Get(':id')
  findById(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const coupon = this.couponService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, coupon);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @UseGuards(new AdminGuard())
  @HttpCode(HttpStatus.OK)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateCouponDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(dto);
    const coupon = this.couponService.create(modifiedDto);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, coupon);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Coupon is updated successfully',
  })
  @ApiBody({ type: CreateCouponDto })
  @UseGuards(new AdminGuard())
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
    dto: CreateCouponDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(dto);
    const coupon = this.couponService.update(id, modifiedDto);

    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Coupon is updated successfully',
      coupon,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @UseGuards(new AdminGuard())
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.couponService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Coupon is deleted successfully',
      deleted,
    );
  }
}
