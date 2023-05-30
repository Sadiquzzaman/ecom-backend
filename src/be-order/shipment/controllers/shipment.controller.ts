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
  RequestService,
  ResponseDto,
  ResponseService,
  ShipmentDto,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { ShipmentService } from '../services/shipment.service';

@ApiTags('Shipment')
@ApiBearerAuth()
@Controller('shipments')
export class ShipmentController
  implements GeneralController<ShipmentDto, ResponseDto>
{
  constructor(
    private shipmentService: ShipmentService,
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
    const shipments = this.shipmentService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shipments);
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
    const shipments = this.shipmentService.findByObject(dto);
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
    const shipments = this.shipmentService.pagination(
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
    const shipment = this.shipmentService.findById(id);
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
    const shipmentGroup = this.shipmentService.findByShipmentGroup(id);
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
    const shipment = this.shipmentService.creates(modifiedDto);
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
    const shipment = this.shipmentService.update(id, modifiedDto);
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
    const deleted = this.shipmentService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Shipment is deleted successfully',
      deleted,
    );
  }
}
