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
  RefundShipmentAssignmentDto,
  RefundReasonEntity,
  CreateRefundShipmentAssignmentDto,
  ShippingStatus,
  RefundShippingType,
} from '@simec/ecom-common';
import { RefundShippingAssignmentService } from '../services/refund-shipping-assignment.service.deprecated.';

@ApiTags('Refund Delivery Assignment')
@ApiBearerAuth()
@Controller('refund-delivery-assignment')
export class RefundShippingAssignmentController
  implements GeneralController<RefundShipmentAssignmentDto>
{
  constructor(
    private refundShippingAssignmentService: RefundShippingAssignmentService,
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
    const refundReasons = this.refundShippingAssignmentService.findAll();
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
    refundShipmentDto: RefundShipmentAssignmentDto,
  ): Promise<ResponseDto> {
    const refundReasons =
      this.refundShippingAssignmentService.findByObject(refundShipmentDto);
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
    const refundReasons = this.refundShippingAssignmentService.pagination(
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
    description: 'Assigned successfully',
  })
  @ApiBody({ type: CreateRefundShipmentAssignmentDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    refundShipmentDto: CreateRefundShipmentAssignmentDto,
  ): Promise<ResponseDto> {
    refundShipmentDto.status = ShippingStatus.ASSIGNED;
    refundShipmentDto.shippingType = RefundShippingType.COLLECT_FROM_CUSTOMER;
    const modifiedDto = this.requestService.forCreate(refundShipmentDto);
    console.log(modifiedDto);

    const refundShippingAssignment =
      this.refundShippingAssignmentService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Message successfully sent! Authority will contact accordingly',
      refundShippingAssignment,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    description:
      'Message successfully updated! Authority will contact accordingly',
  })
  @ApiBody({ type: RefundShipmentAssignmentDto })
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
    refundShipmentDto: RefundShipmentAssignmentDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(refundShipmentDto);
    const refundShippingAssignment =
      this.refundShippingAssignmentService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Message successfully updated! Authority will contact accordingly',
      refundShippingAssignment,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Message successfully deleted!',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.refundShippingAssignmentService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Message successfully deleted!',
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
    const refundShippingAssignment =
      this.refundShippingAssignmentService.findById(id);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      refundShippingAssignment,
    );
  }
}
