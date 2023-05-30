import { PromotionSlotService } from './promotion-slot.service';
import { Injectable, Logger } from '@nestjs/common';

import { CountryService } from './country.service';
import { StateService } from './state.service';
import { ShopTypeService } from './shop-type.service';
import { TicketDepartmentService } from './ticket-department.service';
import { RefundReasontService } from './refund-reason.service';
import { StaticPageService } from './static-page.service';
import { ProductAttributeSeedService } from './product-attribute.service';
import { BankService } from './bank.service';

@Injectable()
export class CoreService {
  private readonly logger = new Logger(CoreService.name);
  constructor(
    private readonly countryService: CountryService,
    private readonly stateService: StateService,
    private readonly typeService: ShopTypeService,
    private readonly ticketDepartmentService: TicketDepartmentService,
    private readonly refundReasonService: RefundReasontService,
    private readonly staticPageService: StaticPageService,
    private readonly productAttributeSeedService: ProductAttributeSeedService,
    private readonly bankService: BankService,
    private readonly promotionSlotService: PromotionSlotService,
  ) {}

  initCore = async (): Promise<boolean> => {
    this.logger.log('Core initializing is started');
    await this.countryService.initCountries();
    await this.stateService.initStates();
    await this.typeService.initTypes();
    await this.ticketDepartmentService.initTicketDepartment();
    await this.refundReasonService.initRefundReason();
    await this.staticPageService.initStaticPage();
    await this.staticPageService.initStaticPage();
    await this.productAttributeSeedService.initAttribute();
    await this.bankService.initBank();
    await this.promotionSlotService.initPromotionSlot();
    return true;
  };
}
