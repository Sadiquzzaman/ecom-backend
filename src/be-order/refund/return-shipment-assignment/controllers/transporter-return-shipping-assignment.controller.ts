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
  PaginationDecorator,
  PaginationDTO,
  RefundApprovalDto,
  RequestService,
  ResponseDto,
  ResponseService,
  ShipmentAssignmentDeliveryStatusDto,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { TransporterReturnShippingAssignmentService } from '../services/transporter-return-shipping-assignment.service';

@ApiTags('Transporter Return Delivery Assignment')
@ApiBearerAuth()
@Controller('transporter-return-delivery-assignment')
export class TransporterReturnShippingAssignmentController
  implements GeneralController<RefundApprovalDto>
{
  constructor(
    private transporterReturnShippingAssignmentService: TransporterReturnShippingAssignmentService,
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
    const brands = this.transporterReturnShippingAssignmentService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, brands);
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
    brandDto: RefundApprovalDto,
  ): Promise<ResponseDto> {
    const brands =
      this.transporterReturnShippingAssignmentService.findByObject(brandDto);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, brands);
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
    const brands = this.transporterReturnShippingAssignmentService.pagination(
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
      brands,
    );
  }
  @UseGuards(new AdminGuard())
  @ApiCreatedResponse({
    description:
      'Message successfully sent! Authority will contact accordingly',
  })
  @ApiBody({ type: RefundApprovalDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    brandDto: RefundApprovalDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(brandDto);
    const brand =
      this.transporterReturnShippingAssignmentService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Message successfully sent! Authority will contact accordingly',
      brand,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    description:
      'Message successfully updated! Authority will contact accordingly',
  })
  @ApiBody({ type: RefundApprovalDto })
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
    brandDto: RefundApprovalDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(brandDto);
    const brand = this.transporterReturnShippingAssignmentService.update(
      id,
      modifiedDto,
    );
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Message successfully updated! Authority will contact accordingly',
      brand,
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
    const deleted = this.transporterReturnShippingAssignmentService.remove(id);
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
    const brand = this.transporterReturnShippingAssignmentService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, brand);
  }
}
