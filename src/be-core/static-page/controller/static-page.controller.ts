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
  StaticPageDto,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { StaticPageService } from '../services/static-page.service';

@ApiTags('Static-Page')
@ApiBearerAuth()
@Controller('static-page')
export class StaticPageController implements GeneralController<StaticPageDto> {
  constructor(
    private staticPageService: StaticPageService,
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
    const configuration = this.staticPageService.findAll();
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      configuration,
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
    staticPageDto: StaticPageDto,
  ): Promise<ResponseDto> {
    const configurations = this.staticPageService.findByObject(staticPageDto);
    return this.responseService.toDtosResponse(
      HttpStatus.OK,
      null,
      configurations,
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
    const configurations = this.staticPageService.pagination(
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
      configurations,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiCreatedResponse({
    description:
      'Message successfully sent! Authority will contact accordingly',
  })
  @ApiBody({ type: StaticPageDto })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    staticPageDto: StaticPageDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forCreate(staticPageDto);
    const configuration = this.staticPageService.create(modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.CREATED,
      'Message successfully sent! Authority will contact accordingly',
      configuration,
    );
  }

  @UseGuards(new AdminGuard())
  @ApiOkResponse({
    description:
      'Message successfully updated! Authority will contact accordingly',
  })
  @ApiBody({ type: StaticPageDto })
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
    staticPageDto: StaticPageDto,
  ): Promise<ResponseDto> {
    const modifiedDto = this.requestService.forUpdate(staticPageDto);
    const configuration = this.staticPageService.update(id, modifiedDto);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      'Message successfully updated! Authority will contact accordingly',
      configuration,
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
    const deleted = this.staticPageService.remove(id);
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
  @Get('terms')
  findOneByTitle(): Promise<ResponseDto> {
    const configuration = this.staticPageService.findTermsAndConditionByTitle();
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      configuration,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('privacy')
  findPrivacyPolicy(): Promise<ResponseDto> {
    const configuration = this.staticPageService.findPrivacyPolicyByTitle();
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      configuration,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('return')
  findReturnAndRefund(): Promise<ResponseDto> {
    const configuration = this.staticPageService.findReturnAndRefundbyTitle();
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      configuration,
    );
  }

  @ApiOkResponse({
    status: HttpStatus.OK,
    description: '',
  })
  @HttpCode(HttpStatus.OK)
  @Get('about')
  findAboutUs(): Promise<ResponseDto> {
    const configuration = this.staticPageService.findAboutUs();
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      configuration,
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
    const configuration = this.staticPageService.findByPageName(id);
    return this.responseService.toDtoResponse(
      HttpStatus.OK,
      null,
      configuration,
    );
  }
}
