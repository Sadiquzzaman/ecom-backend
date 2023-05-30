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
  ShipmentGroupDto,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { ShipmentGroupService } from '../services/shipment-group.service';

@ApiTags('Shipment Groups')
@ApiBearerAuth()
@Controller('shipment-groups')
export class ShipmentGroupController
  implements GeneralController<ShipmentGroupDto, ResponseDto>
{
  constructor(
    private shipmentGroupService: ShipmentGroupService,
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
    const shipmentGroups = this.shipmentGroupService.findAll();
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      shipmentGroups,
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
    dto: ShipmentGroupDto,
  ): Promise<ResponseDto> {
    const shipmentGroup = this.shipmentGroupService.findByObject(dto);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      shipmentGroup,
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
    const shipmentGroups = this.shipmentGroupService.pagination(
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
      shipmentGroups,
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
    const shipmentGroup = this.shipmentGroupService.findById(id);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      shipmentGroup,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Shipment group is Added successfully',
  })
  @ApiBody({ type: ShipmentGroupDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: ShipmentGroupDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(dto);
    const shipmentGroup = this.shipmentGroupService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Shipment group is added successfully',
      shipmentGroup,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shipment group is updated successfully',
  })
  @ApiBody({ type: ShipmentGroupDto })
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
    dto: ShipmentGroupDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(dto);
    const shipmentGroup = this.shipmentGroupService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Shipment group is updated successfully',
      shipmentGroup,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shipment group is deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.shipmentGroupService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Shipment Group is deleted successfully',
      deleted,
    );
  }
}
