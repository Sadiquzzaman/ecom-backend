import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
  DateRangeParamDto,
  DtoValidationPipe,
  PaginationDecorator,
  PaginationDTO,
  PromotionSlotDto,
  RequestService,
  ResponseDto,
  ResponseService,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { PromotionsSlotService } from '../service/promotions-slot.service';

@ApiTags('Promotions Slot')
@ApiBearerAuth()
@Controller('promotions-slot')
export class PromotionsSlotController {
  constructor(
    private readonly promoSlotService: PromotionsSlotService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Promotion is added successfully',
  })
  @ApiBody({ type: PromotionSlotDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    )
    dto: PromotionSlotDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(dto);
    const promotionSlot = this.promoSlotService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Promotion Slot added successfully',
      promotionSlot,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Get the paginated data of promotions slot',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  getRefundRequestPaginatedList(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() dateRange: DateRangeParamDto,
  ): Promise<ResponseDto> {
    const promoSlots = this.promoSlotService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      dateRange,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      'promotions slot Pagination',
      pagination.page,
      pagination.limit,
      promoSlots,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Promotion is updated successfully',
  })
  @ApiBody({ type: PromotionSlotDto })
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
    dto: PromotionSlotDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(dto);
    const promotionSlot = this.promoSlotService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Promotion Slot is updated successfully',
      promotionSlot,
    );
  }
}
