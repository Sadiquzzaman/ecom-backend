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
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags
} from '@nestjs/swagger';
import {
  AdminGuard, ChangeOrderStatusDto, CreateOrderDto,
  CustomerGuard,
  DtoValidationPipe,
  GeneralController, OrderDto, OrderSearchFilterDto, PaginationDecorator, PaginationDTO, RequestService,
  ResponseDto,
  ResponseService,
  UuidValidationPipe
} from '@simec/ecom-common';
import { OrderService } from '../services/order.service';

@ApiTags('Order')
@ApiBearerAuth()
@Controller('orders')
export class OrderController implements GeneralController<OrderDto> {
  constructor(
    private orderService: OrderService,
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
    const orders = this.orderService.findAll();
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
    const orders = this.orderService.findByObject(orderDto);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, orders);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('pagination')
  pagination(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() orderSerarchFilter: OrderSearchFilterDto,
  ): Promise<ResponseDto> {
    const orders = this.orderService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order === 'ASC' ? 'ASC' : 'DESC',
      orderSerarchFilter,
    );

    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      orders,
    );
  }

  // Get the paginated list of shop invoice
  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: 'Get the paginated data of confirmed order list with shop invoice',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Get('confirmed-orders')
  // getConfirmedOrderPaginatedList(
  //   @PaginationDecorator() pagination: PaginationDTO,
  //   @Query() dateRangeParam: DateRangeParamDto
  // ): Promise<ResponseDto> {
  //   const confirmedOrders = this.orderService.getConfirmedOrderList(
  //     pagination.page,
  //     pagination.limit,
  //     pagination.sort,
  //     pagination.order === 'ASC' ? 'ASC' : 'DESC',
  //   );
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
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/user/:id')
  findByUser(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const orders = this.orderService.findByUser(id);
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
    const order = this.orderService.create(modifiedDto);
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
    const order = this.orderService.setShippingAddress(cartID, shippingId);
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
    const orderStatus = this.orderService.updateOrderStatus(id, orderDto);
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
    const order = this.orderService.update(id, modifiedDto);
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
    const deleted = this.orderService.remove(id);
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
    const orders = this.orderService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, orders);
  }
}
