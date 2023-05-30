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
import { EventPattern, Payload } from '@nestjs/microservices';
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
  NotificationDto,
  RequestService,
  ResponseDto,
  ResponseService,
  UuidValidationPipe,
} from '@simec/ecom-common';
import { AdminSalesExportService } from '../services/admin-sales-export.service';

@ApiTags('export')
@ApiBearerAuth()
@Controller('export/excel')
export class AdminSalesExportController {
  constructor(
    private readonly responseService: ResponseService,
    private readonly requestService: RequestService,
    private readonly adminSalesexportService: AdminSalesExportService,
  ) {}

  @Post('')
  genarateExcel(@Body() a: any, @Response({ passthrough: true }) res) {
    return this.adminSalesexportService.generateExcel(res);
  }
}
