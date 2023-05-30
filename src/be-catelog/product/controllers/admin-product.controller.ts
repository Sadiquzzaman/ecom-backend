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
  CreateProductDto,
  CreateWishListDto,
  DtoValidationPipe,
  GeneralController,
  IntValidationPipe,
  MerchantGuard,
  ProductDto,
  RequestService,
  ResponseDto,
  ResponseService,
  ShopManagerGuard,
  UserGuard,
  UuidValidationPipe,
  ApprovalDto,
  PaginationDTO,
  PaginationDecorator,
  ProductSearchDto,
} from '@simec/ecom-common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminProductService } from '../services/admin-product.service';

@ApiTags('Admin-Product')
@ApiBearerAuth()
@Controller('admin/products')
export class AdminProductController
  implements GeneralController<ProductDto, ResponseDto>
{
  constructor(
    private adminProductService: AdminProductService,
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
  ) {}

  @UseGuards(new AdminGuard())
  @ApiBearerAuth()
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Product approval updated successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Put('product-approval')
  productApproval(
    @Body(new DtoValidationPipe())
    ApprovalDto: ApprovalDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(ApprovalDto);
    const productApprovalUpdate =
      this.adminProductService.updateApprovalStatus(modifiedDto);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      'Product approval updated successfully',
      productApprovalUpdate[0],
    );
  }
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
    this.adminProductService.productSolrReset();
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
    const products = this.adminProductService.findAll();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, products);
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
    dto: ProductDto,
  ): Promise<ResponseDto> {
    const products = this.adminProductService.findByObject(dto);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, products);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('approval-pagination')
  approvalPagination(
    @Query('page', new IntValidationPipe()) page: number,
    @Query('limit', new IntValidationPipe()) limit: number,
    @Query('sort') sort: string,
    @Query('order') order: string,
    @Query('approvalLabel') approvalLabel: number,
  ): Promise<ResponseDto> {
    const products = this.adminProductService.approvalPagination(
      page,
      limit,
      sort,
      order,
      approvalLabel,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      page,
      limit,
      products,
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
    @Query() productSearchDto: ProductSearchDto,
  ): Promise<ResponseDto> {
    const products = this.adminProductService.pagination(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order,
      productSearchDto,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      products,
    );
  }

  @UseGuards(new ShopManagerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('stock')
  adminStock(
    @PaginationDecorator() pagination: PaginationDTO,
    @Query() productSearchDto: ProductSearchDto,
  ): Promise<ResponseDto> {
    const products = this.adminProductService.stock(
      pagination.page,
      pagination.limit,
      pagination.sort,
      pagination.order,
      productSearchDto,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      pagination.page,
      pagination.limit,
      products,
    );
  }

  /*********************** for frontend start ***********************/
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/category')
  async findByCategoryPagination(
    @Query('id', new UuidValidationPipe()) id: string,
    @Query('page', new IntValidationPipe()) page: number,
    @Query('limit', new IntValidationPipe()) limit: number,
    @Query('price') price: string,
    @Query('rating') rating: string,
    @Query('algorithm') algorithm: string,
  ): Promise<ResponseDto> {
    const products = await this.adminProductService.findByCategoryPagination(
      id,
      page,
      limit,
      price,
      rating,
      algorithm,
    );

    const promotions =
      await this.adminProductService.findLatestPromotionsByCategory(id);

    const payload = {
      count: products[0]?.length,
      data: { promotions, products: products[0] },
    };
    return new ResponseDto(
      new Date().getTime(),
      HttpStatus.OK,
      'Products and Promotions are loaded successfully',
      null,
      payload,
      null,
    );
  }

  @UseGuards(new UserGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Product is added in user wishlist successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('wishlist')
  productWishList(
    @Body(
      new DtoValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateWishListDto,
  ): Promise<ResponseDto> {
    const user = this.adminProductService.productWishlist(
      dto.productId,
      dto.userId,
    );
    return this.responseService.toDtoResponse(HttpStatus.OK, null, user);
  }

  @UseGuards(new UserGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Product is deleted from user wishlist successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  @Delete(':id/removewishlist')
  removeWishlist(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const user = this.adminProductService.removewishlist(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, user);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/shop')
  findByShop(
    @Query('id', new UuidValidationPipe()) id: string,
    @Query('page', new IntValidationPipe()) page: number,
    @Query('limit', new IntValidationPipe()) limit: number,
  ): Promise<ResponseDto> {
    const products = this.adminProductService.findByShopPagination(
      id,
      page,
      limit,
    );
    return this.responseService.toPaginationResponse(
      HttpStatus.OK,
      null,
      page,
      limit,
      products,
    );
  }
  /*********************** for frontend end ***********************/
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/user/:id')
  findByUser(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const products = this.adminProductService.findByUser(id);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, products);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('popular')
  findPopularProducts(): Promise<ResponseDto> {
    const products = this.adminProductService.findPopularProducts();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, products);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('trending')
  findTrendingProducts(): Promise<ResponseDto> {
    const products = this.adminProductService.findTrendingProducts();
    return this.responseService.toDtosResponse(HttpStatus.OK, null, products);
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('find/user/:id/category')
  findProductsAndCategoryByUser(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const products = this.adminProductService.findByUser(id, true);
    return this.responseService.toDtosResponse(HttpStatus.OK, null, products);
  }

  @UseGuards(new ShopManagerGuard())
  @ApiCreatedResponse({
    status: HttpStatus.CREATED,
    description: 'Product is added successfully',
  })
  @ApiBody({ type: CreateProductDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateProductDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(dto);
    const product = this.adminProductService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Product is added successfully',
      product,
    );
  }

  @UseGuards(new ShopManagerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Product is updated successfully',
  })
  @ApiBody({ type: CreateProductDto })
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
    dto: CreateProductDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(dto);
    const product = this.adminProductService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Product is updated successfully',
      product,
    );
  }

  @UseGuards(new ShopManagerGuard())
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Product is deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new UuidValidationPipe()) id: string,
  ): Promise<ResponseDto> {
    const deleted = this.adminProductService.remove(id);
    return this.responseService.toResponse(
      HttpStatus.OK,
      'Product is deleted successfully',
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
    const product = this.adminProductService.findById(id);
    return this.responseService.toDtoResponse(HttpStatus.OK, null, product);
  }
}
