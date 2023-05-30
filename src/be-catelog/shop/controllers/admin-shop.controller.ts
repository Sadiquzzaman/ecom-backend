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
  ShopManagerAssignShopDto,
  ShopManagerEntity,
} from '@simec/ecom-common';
import { AdminShopService } from '../services/admin-shop.service';
import { ShopService } from '../services/shop.service';

@ApiTags('Admin Shop')
@ApiBearerAuth()
@Controller('admin/shops')
export class AdminShopController implements GeneralController<ShopDto> {
  constructor(
    private adminShopService: AdminShopService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  /***************** Solr reset ********************/
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @UseGuards(new AdminGuard())
  @ApiBearerAuth()
  @Get('solr-reset')
  solrReset(): Promise<ResponseDto> {
    // const products = this.adminProductService.findAll();
    // return this.responseService.toDtosResponse(HttpStatus.OK, null, products);
    this.adminShopService.shopSolrReset();
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Solr reset on process.',
      null,
    );
  }
  /**************** Solr reset ********************/

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(): Promise<ResponseDto> {
    const shops = this.adminShopService.findAll();
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
    const shops = this.adminShopService.findByObject(dto);
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
    const shops = this.adminShopService.shopByApprovalStatus(
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

  @UseGuards(new ShopManagerGuard())
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
    const shops = this.adminShopService.pagination(
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
    const shops = await this.adminShopService.findByTypePagination(
      id,
      page,
      limit,
      rating,
      algorithm,
    );
    const promotions = await this.adminShopService.findLatestPromotionsByType(
      id,
    );
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
    const user = this.adminShopService.followShop(dto.shopId, dto.userId);
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
    const user = this.adminShopService.unFollowShop(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, user);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/:name')
  findByName(@Param('name') name: string): Promise<ResponseDto> {
    const shop = this.adminShopService.findByName(name);
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
    const shops = this.adminShopService.findByMerchant(id);
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
    const shopCount = this.adminShopService.shopCountByMerchant(id);
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
    const shops = this.adminShopService.findByMerchant(id, true);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('popular')
  findPopularShops(): Promise<ResponseDto> {
    const shops = this.adminShopService.findPopularShops();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, shops);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('trending')
  findTrendingShops(): Promise<ResponseDto> {
    const shops = this.adminShopService.findTrendingShops();
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
    const shop = this.adminShopService.create(modifiedDto);

    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Shop is added successfully',
      shop,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shop manager assigned successfully',
  })
  @ApiBody({ type: ShopManagerAssignShopDto })
  @HttpCode(HttpStatus.OK)
  @Put('shop-manager-assignment')
  async shopManagerAssignment(
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: ShopManagerAssignShopDto,
  ): Promise<ResponseDto> {
    const shopManager: any = await this.adminShopService.assignShopMangerShop(
      dto,
    );
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Shop manager assigned successfully',
      shopManager,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Shop Manager Details',
  })
  @HttpCode(HttpStatus.OK)
  @Get('shop-manager-details/:id')
  getShopManagerDetails(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const shopManager = this.adminShopService.getShopManagerById(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Shop Manager Details',
      shopManager,
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
  //   const shop: any = await this.adminShopService.shopApproved(dto);
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
    const shopApprovalUpdate: any =
      await this.adminShopService.updateApprovalStatus(modifiedDto);
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
    console.log('Update Shop');
    const modifiedDto = this.requestService.forUpdate(dto);
    const shop = this.adminShopService.update(id, modifiedDto);

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
    const deleted = this.adminShopService.remove(id);
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
    const shop = this.adminShopService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, shop);
  }

  @MessagePattern({ service: 'shops', cmd: 'get', method: 'getByID' })
  getByID(id: string): Promise<ShopDto> {
    return this.adminShopService.findById(id);
  }
}
