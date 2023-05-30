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
  CreateShipmentDto,
  DateRangeParamDto,
  DtoValidationPipe,
  GeneralController,
  IntValidationPipe,
  PaginationDecorator,
  PaginationDTO,
  RequestService,
  ResponseDto,
  ResponseService,
  ShipmentDto,
  UuidValidationPipe,
  CreateShipmetDeliveryAssignmetDto,
  ShopSearchDto,
  ShipmentAssignmentDeliveryStatusDto,
  ShippingStatusUpdateDto,
} from '@simec/ecom-common';
import { AdminShippingService } from '../services/admin-shiping.service';
// import { ShipmentAssignmentDeliveryStatus } from '@simec/ecom-common/dist/dto/shipment/shipment-delivery-assignment.dto';
import { ShippingService } from '../services/shiping.service';

@ApiTags('Admin Shipping')
@ApiBearerAuth()
@Controller('admin-shipping')
export class AdminShippingController
  implements GeneralController<ShipmentDto, ResponseDto>
{
  constructor(
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
    private adminShippingService: AdminShippingService,
  ) {}

  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description:
  //     'Get the paginated data of Shipping status list with shop invoice',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Get()
  // getAssignedOrderPaginatedList(
  //   @PaginationDecorator() pagination: PaginationDTO,
  //   @Query()
  //   shipmentAssignmentDeliveryStatusDto: ShipmentAssignmentDeliveryStatusDto,
  // ): Promise<ResponseDto> {
  //   const confirmedOrders =
  //     this.adminShippingService.getAssignedShopInvoicesForTransporter(
  //       pagination.page,
  //       pagination.limit,
  //       pagination.sort,
  //       pagination.order === 'ASC' ? 'ASC' : 'DESC',
  //       shipmentAssignmentDeliveryStatusDto,
  //     );
  //   return this.responseService.toPaginationResponse(
  //     HttpStatus.OK,
  //     null,
  //     pagination.page,
  //     pagination.limit,
  //     confirmedOrders,
  //   );
  // }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description:
      'Get the paginated data of confirmed order list with shop invoice',
  })
  @HttpCode(HttpStatus.OK)
  @Get('get-shop-invoice')
  getConfirmedOrderPaginatedList(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() assignStatus: ShipmentAssignmentDeliveryStatusDto,
  ): Promise<ResponseDto> {
    const confirmedOrders = this.adminShippingService.getConfirmedOrderList(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      assignStatus,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      confirmedOrders,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description:
      'Get the paginated data of confirmed order list with shop invoice',
  })
  @HttpCode(HttpStatus.OK)
  @Get('shop-invoice-shipping-status')
  getShopInvoiceShippingStatus(
    @Query('orderId', new UuidValidationPipe()) orderId: string,
  ): Promise<ResponseDto> {
    const data =
      this.adminShippingService.getShopInvoiceShippingStatus(orderId);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Shop Invoice Shipping Status',
      data,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Create Shipment Delivery Assignment Task',
  })
  @HttpCode(HttpStatus.OK)
  @Post('shipment-delivery-assignment')
  createShipmentDeliveryAssignment(
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateShipmetDeliveryAssignmetDto,
  ): Promise<ResponseDto> {
    const shipmentDeliveryAssignmentData =
      this.adminShippingService.createShipmentDeliveryAssignment(dto);
    return this.responseService.toDtosResponse(
      HttpStatus.CREATED,
      '',
      shipmentDeliveryAssignmentData,
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
    dto: ShipmentDto,
  ): Promise<ResponseDto> {
    const shipments = this.adminShippingService.findByObject(dto);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shipments);
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
    @Query('id') id: string,
  ): Promise<ResponseDto> {
    const shipments = this.adminShippingService.pagination(
      page,
      limit,
      sort,
      order,
      id,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      page,
      limit,
      shipments,
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
    const shipment = this.adminShippingService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, shipment);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/shipment-groups/:id')
  findByShipmentGroup(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const shipmentGroup = this.adminShippingService.findByShipmentGroup(id);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      shipmentGroup,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Shipment is added successfully',
  })
  @ApiBody({ type: CreateShipmentDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateShipmentDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(dto);
    const shipment = this.adminShippingService.creates(modifiedDto);
    return this.responseService.toDtosResponse(
      HttpStatus.CREATED,
      'Shipment  is added successfully',
      shipment,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shipment is updated successfully',
  })
  @ApiBody({ type: CreateShipmentDto })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateShipmentDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(dto);
    const shipment = this.adminShippingService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Shipment is updated successfully',
      shipment,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shipment is deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.adminShippingService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Shipment is deleted successfully',
      deleted,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('get-confirmed-orders')
  findAll(): Promise<ResponseDto> {
    const shipments = this.adminShippingService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shipments);
  }
}
