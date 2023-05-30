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
import { MessagePattern } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdminGuard,
  ApprovalDto,
  CreateShopDto,
  DtoValidationPipe,
  FollowShopDto,
  GeneralController,
  IntValidationPipe,
  MerchantSearchDto,
  PaginationDecorator,
  PaginationDTO,
  RequestService,
  ResponseDto,
  ResponseService,
  ShopDto,
  ShopManagerGuard,
  UserGuard,
  UuidValidationPipe,
  ShopSearchDto,
} from '@simec/ecom-common';
import { ShopService } from '../services/shop.service';

@ApiTags('Shop')
@ApiBearerAuth()
@Controller('shops')
export class ShopController implements GeneralController<ShopDto> {
  constructor(
    private shopService: ShopService,
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
    const shops = this.shopService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
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
    dto: ShopDto,
  ): Promise<ResponseDto> {
    const shops = this.shopService.findByObject(dto);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('shop-by-approval-status')
  getAllUnApprovedShop(
    @Query('page', new IntValidationPipe()) page: number,
    @Query('limit', new IntValidationPipe()) limit: number,
    @Query('sort') sort: string,
    @Query('order') order: string,
    @Query('is_approved', new IntValidationPipe()) is_approved: number,
  ): Promise<ResponseDto> {
    const shops = this.shopService.shopByApprovalStatus(
      page,
      limit,
      sort,
      order,
      is_approved,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      page,
      limit,
      shops,
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
    @Query() shopSearchDto: ShopSearchDto,
  ): Promise<ResponseDto> {
    const shops = this.shopService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order,
      shopSearchDto,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      shops,
    );
  }

  /*********************** for frontend start ***********************/
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/type')
  async findByTypePagination(
    @Query('id', new UuidValidationPipe()) id: string,
    @Query('page', new IntValidationPipe()) page: number,
    @Query('limit', new IntValidationPipe()) limit: number,
    @Query('rating') rating: string,
    @Query('algorithm') algorithm: string,
  ): Promise<ResponseDto> {
    const shops = await this.shopService.findByTypePagination(
      id,
      page,
      limit,
      rating,
      algorithm,
    );
    const promotions = await this.shopService.findLatestPromotionsByType(id);
    const payload = {
      count: shops[0]?.length,
      data: { promotions, shops: shops[0] },
    };
    return new ResponseDto(
      new Date().getTime(),
      HttpStatus.OK,
      'Shops and Promotions are loaded successfully',
      null,
      payload,
      null,
    );
  }

  @UseGuards(new UserGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Shop is added in user following list successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('follow')
  followShop(
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: FollowShopDto,
  ): Promise<ResponseDto> {
    const user = this.shopService.followShop(dto.shopId, dto.userId);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, user);
  }

  @UseGuards(new UserGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Shop is deleted in user following list successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  @Delete(':id/unfollow')
  unFollowShop(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const user = this.shopService.unFollowShop(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, user);
  }

  @ApiBearerAuth()
  @UseGuards(new ShopManagerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/shops-pagination')
  async findAllShop(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() shopSearch: ShopSearchDto,
  ): Promise<ResponseDto> {
    const shops = this.shopService.shopPagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order ? 'DESC' : 'ASC',
      shopSearch,
    );
    console.log(shopSearch, pagination);

    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      shops,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/:name')
  findByName(@Param('name') name: string): Promise<ResponseDto> {
    const shop = this.shopService.findByName(name);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, shop);
  }

  /*********************** for frontend end ***********************/
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/user/:id')
  findByMerchant(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const shops = this.shopService.findByMerchant(id);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Number of shops a merchant has created',
  })
  @HttpCode(HttpStatus.OK)
  @Get('shop-count/:id')
  shopCountByMerchant(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<any> {
    const shopCount = this.shopService.shopCountByMerchant(id);
    return this.responseService.toResponse(HttpStatus.OK, null, shopCount);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/user/:id/type')
  findShopAndTypeByMerchant(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const shops = this.shopService.findByMerchant(id, true);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('popular')
  findPopularShops(): Promise<ResponseDto> {
    const shops = this.shopService.findPopularShops();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('trending')
  findTrendingShops(): Promise<ResponseDto> {
    const shops = this.shopService.findTrendingShops();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
  }

  @UseGuards(new ShopManagerGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Shop is added successfully',
  })
  @ApiBody({ type: CreateShopDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateShopDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(dto);
    const shop = this.shopService.create(modifiedDto);

    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Shop is added successfully',
      shop,
    );
  }

  // @UseGuards(new AdminGuard())
  // @ApiOkResponse({
  //   status: HttpStatus.OK,
  //   description: 'Shop is updated successfully',
  // })
  // @ApiBody({ type: ApprovalDto })
  // @HttpCode(HttpStatus.OK)
  // @Put('shop-approved')
  // async shopApproved(
  //   @Body(
  //     new DtoValidationPipe({
  //       skipMissingProperties: true,
  //       whitelist: true,
  //       forbidNonWhitelisted: true,
  //     }),
  //   )
  //   dto: ApprovalDto,
  // ): Promise<ResponseDto> {
  //   const shop: any = await this.shopService.shopApproved(dto);
  //   return this.responseService.toDtoResponse(
  //     HttpStatus.OK,
  //     'Shop is updated successfully',
  //     shop,
  //   );
  // }

  @UseGuards(new AdminGuard())
  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shop approval updated successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Put('/shop-approval')
  async merchantApproval(
    @Body(new DtoValidationPipe())
    ApprovalDto: ApprovalDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(ApprovalDto);
    const shopApprovalUpdate: any = await this.shopService.updateApprovalStatus(
      modifiedDto,
    );
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      'shop approval updated successfully',
      shopApprovalUpdate[0],
    );
  }

  @UseGuards(new ShopManagerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shop is updated successfully',
  })
  @ApiBody({ type: CreateShopDto })
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
    dto: CreateShopDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(dto);
    const shop = this.shopService.update(id, modifiedDto);

    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Shop is updated successfully',
      shop,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shop is deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.shopService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Shop is deleted successfully',
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
    const shop = this.shopService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, shop);
  }

  @MessagePattern({ service: 'shops', cmd: 'get', method: 'getByID' })
  getByID(id: string): Promise<ShopDto> {
    return this.shopService.findById(id);
  }
}
