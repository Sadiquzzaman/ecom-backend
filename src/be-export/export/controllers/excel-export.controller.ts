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
  Response,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EventPattern,
  Payload,
  ClientProxy,
  ClientProxyFactory,
  Transport,
  MessagePattern,
} from '@nestjs/microservices';

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
  MerchantInvoiceSearchDto,
  NotificationDto,
  PaginationDecorator,
  PaginationDTO,
  RequestService,
  ResponseDto,
  ResponseService,
  UuidValidationPipe,
  ExportExcelDto,
} from '@simec/ecom-common';
import { ExcelGeneratorService } from '../common/services/excel-generator.service';
import { MerchantSalesExportService } from '../services/merchant-sales-export.service';

@ApiTags('export-merchant-sales')
@ApiBearerAuth()
@Controller('export/excel')
export class ExcelExportController {
  // private readonly exportClient: ClientProxy;

  constructor(
    // private readonly configService: ConfigService,
    private readonly responseService: ResponseService,
    private readonly excelGeneratorService: ExcelGeneratorService,
    private readonly requestService: RequestService,
    private readonly merchantSalesexportService: MerchantSalesExportService,
  ) {
    // this.exportClient = ClientProxyFactory.create({
    //   transport: Transport.REDIS,
    //   options: { url: configService.get('EXPORT_SERVICE_URL') },
    // });
  }

  // @Post('')
  // genarateExcel(
  //   @Body(
  //     new DtoValidationPipe({
  //       skipMissingProperties: true,
  //       whitelist: true,
  //       forbidNonWhitelisted: true,
  //     }),
  //   )
  //   excelDto: ExportExcelDto,
  //   @Response({ passthrough: true }) res,
  // ) {
  //   return this.excelGeneratorService.generateExcel(
  //     res,
  //     excelDto.headers,
  //     excelDto.rows,
  //   );
  // }
  @MessagePattern({ service: 'export', cmd: 'post', method: 'exportExcel' })
  async exportExcel(@Payload() excelDto: ExportExcelDto): Promise<any> {
    console.log(excelDto);
    const x = await this.excelGeneratorService.generateExcel(
      excelDto.headers,
      excelDto.rows,
    );
    console.log({ x });
    return x;
  }
}
