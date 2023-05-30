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
  CreatePromotionDto,
  DtoValidationPipe,
  GeneralController,
  IntValidationPipe,
  PaginationDecorator,
  PaginationDTO,
  PromotionDto,
  PromotionSearchDto,
  RequestService,
  ResponseDto,
  ResponseService,
  ShopReviewDto,
  UserGuard,
  UuidValidationPipe,
  ApprovalDto,
  DateRangeParamDto,
  CheckPromotionSlotDto,
  MerchantGuard,
  ShopManagerGuard,
} from '@simec/ecom-common';
import { PromotionService } from '../services/promotion.service';

@ApiTags('Promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionController
  implements GeneralController<PromotionDto, ResponseDto>
{
  constructor(
    private promotionService: PromotionService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('promotions-by-approval-status')
  getAllUnApprovedShop(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() promotionSearchDto: PromotionSearchDto,
  ): Promise<ResponseDto> {
    const promotions = this.promotionService.promotionByApprovalStatus(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order,
      promotionSearchDto,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      promotions,
    );
  }
  @UseGuards(new AdminGuard())
  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shop approval updated successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Put('/promotion-approval')
  async merchantApproval(
    @Body(new DtoValidationPipe())
    ApprovalDto: ApprovalDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(ApprovalDto);
    const promotionApprovalUpdate: any =
      await this.promotionService.updateApprovalStatus(modifiedDto);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      'promotion approval updated successfully',
      promotionApprovalUpdate[0],
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(): Promise<ResponseDto> {
    const promotions = this.promotionService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, promotions);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('latest-promotions')
  getLatestPromotions(): Promise<ResponseDto> {
    const promotions = this.promotionService.getLatestPromotions();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, promotions);
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
    dto: PromotionDto,
  ): Promise<ResponseDto> {
    const promotions = this.promotionService.findByObject(dto);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, promotions);
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('admin/pagination')
  adminPagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() promotionSearch: PromotionSearchDto,
  ): Promise<ResponseDto> {
    const promotions = this.promotionService.adminPagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      promotionSearch,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      'Promotion paginated Data',
      pagination.page,
      pagination.limit,
      promotions,
    );
  }

  @UseGuards(new ShopManagerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('merchant/pagination')
  merchantPagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() promotionSearch: PromotionSearchDto,
  ): Promise<ResponseDto> {
    const promotions = this.promotionService.merchantPagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      promotionSearch,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      'Promotion paginated Data',
      pagination.page,
      pagination.limit,
      promotions,
    );
  }

  @UseGuards(new UserGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Promotion is added successfully',
  })
  @ApiBody({ type: CreatePromotionDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreatePromotionDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(dto);
    const promotion = this.promotionService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Promotion added successfully',
      promotion,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Promotion is updated successfully',
  })
  @ApiBody({ type: CreatePromotionDto })
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
    dto: CreatePromotionDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(dto);
    const promotion = this.promotionService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Promotion is updated successfully',
      promotion,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Promotion is deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.promotionService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Promotion is deleted successfully',
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
    const promotion = this.promotionService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, promotion);
  }

  // Get Booked and Available Slots of a banner type
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the available booked date of promotion slot',
  })
  @HttpCode(HttpStatus.OK)
  @Get('/booking/slots')
  getAvailablebalanceForMerchant(
    @Query() checkoSlotDto: CheckPromotionSlotDto,
  ): Promise<ResponseDto> {
    const data = this.promotionService.getBookingSlots(checkoSlotDto);

    return this.responseService.toResponse(
      HttpStatus.OK,
      'Booking Slots',
      data,
    );
    return;
    data;
  }
  // Get Booked and Available Slots of a banner type
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the available booked date of promotion slot',
  })
  @HttpCode(HttpStatus.OK)
  @Get('/booking/costs')
  getPromotionCost(
    @Query() checkoSlotDto: CheckPromotionSlotDto,
  ): Promise<ResponseDto> {
    const data = this.promotionService.calculateCost(checkoSlotDto);

    return this.responseService.toResponse(
      HttpStatus.OK,
      'Booking Costs',
      data,
    );
    return data;
  }
}
