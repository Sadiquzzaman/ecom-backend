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
  AdminGuard,
  CreateOrderDto,
  CustomerGuard,
  DtoValidationPipe,
  GeneralController,
  IntValidationPipe,
  OrderDto,
  RequestService,
  ResponseDto,
  ResponseService,
  UuidValidationPipe,
  ChangeOrderStatusDto,
} from '@simec/ecom-common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CustomerOrderService } from '../services/customer-order.service';

@ApiTags('Customer Order')
@ApiBearerAuth()
@Controller('customer-orders')
export class CustomerOrderController implements GeneralController<OrderDto> {
  constructor(
    private customerOrderService: CustomerOrderService,
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
    const orders = this.customerOrderService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, orders);
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
    orderDto: OrderDto,
  ): Promise<ResponseDto> {
    const orders = this.customerOrderService.findByObject(orderDto);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, orders);
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
    @Query('status', new IntValidationPipe()) status: number,
  ): Promise<ResponseDto> {
    const orders = this.customerOrderService.pagination(
      page,
      limit,
      sort,
      order,
      status,
    );

    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      page,
      limit,
      orders,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/user/:id')
  findByUser(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const orders = this.customerOrderService.findByUser(id);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, orders);
  }

  @UseGuards(new CustomerGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Order is added successfully',
  })
  @ApiBody({ type: CreateOrderDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    )
    orderDto: CreateOrderDto,
  ): Promise<ResponseDto> {
    console.log(orderDto);
    const modifiedDto = this.requestService.forCreate(orderDto);
    const order = this.customerOrderService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Order is added successfully',
      order,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/set-shipping-address/:cartId/:shippingId')
  setShippingAddress(
    @Param('cartId', new UuidValidationPipe())
    cartID: string,
    @Param('shippingId', new UuidValidationPipe())
    shippingId: string,
  ): Promise<ResponseDto> {
    const order = this.customerOrderService.setShippingAddress(cartID, shippingId);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, order);
  }

  @UseGuards(new CustomerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Order status is updated successfully',
  })
  @ApiBody({ type: ChangeOrderStatusDto })
  @HttpCode(HttpStatus.OK)
  @Put('/change-status/:id')
  updateOrderStatus(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    orderDto: ChangeOrderStatusDto,
  ): Promise<ResponseDto> {
    
    const orderStatus = this.customerOrderService.updateOrderStatus(id, orderDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Order status is updated successfully',
      orderStatus,
    );
  }

  @UseGuards(new CustomerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Order is updated successfully',
  })
  @ApiBody({ type: CreateOrderDto })
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
    orderDto: CreateOrderDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(orderDto);
    const order = this.customerOrderService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Order is updated successfully',
      order,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Order is deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.customerOrderService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Order is deleted successfully',
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
    const orders = this.customerOrderService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, orders);
  }
}
