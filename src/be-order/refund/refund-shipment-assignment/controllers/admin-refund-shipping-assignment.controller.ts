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
  ShipmentAssignmentDeliveryStatusDto,
  PaginationDecorator,
  PaginationDTO,
  RefundShipmentAssignmentStatusDto,
} from '@simec/ecom-common';
import { AdminRefundShippingAssignmentService } from '../services/admin-refund-shipping-assignment.service';

@ApiTags('Admin Refund Delivery Assignment')
@ApiBearerAuth()
@Controller('admin-refund-delivery-assignment')
export class AdminRefundShippingAssignmentController
  implements GeneralController<RefundShipmentAssignmentDto>
{
  constructor(
    private adminRefundShippingAssignmentService: AdminRefundShippingAssignmentService,
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
    const refundReasons = this.adminRefundShippingAssignmentService.findAll();
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
      this.adminRefundShippingAssignmentService.findByObject(refundShipmentDto);
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
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() status: ShipmentAssignmentDeliveryStatusDto,
  ): Promise<ResponseDto> {
    const refundReasons =
      this.adminRefundShippingAssignmentService.getAssignedRefundRequestsForAdmin(
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
    // refundShipmentDto.status = ShippingStatus.ASSIGNED;
    if (refundShipmentDto.refundApprovalId) {
      // let refundAvvrovalData = this.re;
    }
    // refundShipmentDto.shippingType = RefundShippingType.COLLECT_FROM_CUSTOMER;
    const modifiedDto = this.requestService.forCreate(refundShipmentDto);
    // console.log(modifiedDto);

    const refundShippingAssignment =
      this.adminRefundShippingAssignmentService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Message successfully sent! Authority will contact accordingly',
      refundShippingAssignment,
    );
  }

  // Update Status
  // @UseGuards(new AdminGuard())
  @ApiOkResponse({
    description:
      'Message successfully updated! Authority will contact accordingly',
  })
  @ApiBody({ type: RefundShipmentAssignmentStatusDto })
  @HttpCode(HttpStatus.OK)
  @Put('update/status/:id')
  updateStatus(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    refundShipmentStatusDto: RefundShipmentAssignmentStatusDto,
  ): Promise<ResponseDto> {
    const refundShippingAssignment =
      this.adminRefundShippingAssignmentService.updateStatus(
        id,
        refundShipmentStatusDto,
      );
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Message successfully updated! Authority will contact accordingly',
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
      this.adminRefundShippingAssignmentService.update(id, modifiedDto);
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
    const deleted = this.adminRefundShippingAssignmentService.remove(id);
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
      this.adminRefundShippingAssignmentService.findById(id);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      refundShippingAssignment,
    );
  }
}
