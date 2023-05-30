import { MerchantShippingService } from './../services/merchant-shiping.service';
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
  DtoValidationPipe,
  GeneralController,
  IntValidationPipe,
  PaginationDecorator,
  PaginationDTO,
  RequestService,
  ResponseDto,
  ResponseService,
  ShipmentAssignmentDeliveryStatusDto,
  ShipmentDto,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { ShippingService } from '../services/shiping.service';

@ApiTags('Merchant Shipping')
@ApiBearerAuth()
@Controller('merchant-shipping')
export class MerchantShippingController
  implements GeneralController<ShipmentDto, ResponseDto>
{
  constructor(
    private merchantShippingService: MerchantShippingService,
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
    const shipments = this.merchantShippingService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shipments);
  }

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
    const confirmedOrders = this.merchantShippingService.getConfirmedOrderList(
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
    const shipments = this.merchantShippingService.findByObject(dto);
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
    const shipments = this.merchantShippingService.pagination(
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
    const shipment = this.merchantShippingService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, shipment);
  }

  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: '',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Get('find/shipment-groups/:id')
  // findByShipmentGroup(
  //   @Param('id', new UuidValidationPipe()) id: string,
  // ): Promise<ResponseDto> {
  //   const shipmentGroup = this.shipmentService.findByShipmentGroup(id);
  //   return this.responseService.toDtosResponse(
  //     HttpStatus.OK,
  //     null,
  //     shipmentGroup,
  //   );
  // }

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
    const shipment = this.merchantShippingService.creates(modifiedDto);
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
    const shipment = this.merchantShippingService.update(id, modifiedDto);
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
    const deleted = this.merchantShippingService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Shipment is deleted successfully',
      deleted,
    );
  }
}
