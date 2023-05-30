import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Bool,
  ConversionService,
  InvoiceEntity,
  InvoiceStatus,
  isActive,
  MarchantInvoiceEntity,
  OnlinePaymentActivityLogDto,
  OnlinePaymentActivityLogEntity,
  OrderEntity,
  OrderStatus,
  PromotionEntity,
  PromotionInvoiceEntity,
  PromotionStatus,
  ShopInvoiceEntity,
  SslPrepareDto,
  SslPrepareEntity,
  SslProductProfileEnum,
  SslResponseDto,
  SslShippingMethodEnum,
  SystemException,
  TransMasterDto,
  TransMasterEntity,
} from '@simec/ecom-common';
import { PaymentMethodEnum } from '@simec/ecom-common/dist/enum/payment-method.enum';
import SSLCommerz from 'sslcommerz-nodejs';
import { Repository } from 'typeorm';
import { TransMasterService } from '../../trans-master/services/trans-master.service';

@Injectable()
export class SslCommerzeService {
  constructor(
    @InjectRepository(SslPrepareEntity)
    private readonly sslPrepareRepository: Repository<SslPrepareEntity>,
    @InjectRepository(OnlinePaymentActivityLogEntity)
    private readonly onlinePaymentActivityLogRepository: Repository<OnlinePaymentActivityLogEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,
    @InjectRepository(PromotionInvoiceEntity)
    private readonly promotionInvoiceRepository: Repository<PromotionInvoiceEntity>,
    @InjectRepository(PromotionEntity)
    private readonly promotionRepository: Repository<PromotionEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(ShopInvoiceEntity)
    private readonly shopInvoiceRepository: Repository<ShopInvoiceEntity>,
    @InjectRepository(TransMasterEntity)
    private readonly transMasterRepository: Repository<TransMasterEntity>,
    @InjectRepository(MarchantInvoiceEntity)
    private readonly merchantInvoiceRepository: Repository<MarchantInvoiceEntity>,
    private readonly conversionService: ConversionService,
    private readonly transMasterService: TransMasterService,
    private readonly configService: ConfigService,
  ) {}

  prepare = async (transMaster: {
    // id: string;
    order: string; // Basically Transmaster ID sent as Order From Frontend
    cart_json: any;
  }): Promise<SslResponseDto> => {
    try {
      const tm = await this.transMasterService.findByInvoiceOrID(
        null,
        transMaster.order,
      );

      // console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥Transmaster Data', tm);

      const sslData = new SslPrepareDto();

      // Request Parameters
      sslData.total_amount = tm.totalAmount || 0;
      sslData.tran_id = tm?.id;

      sslData.success_url = `${this.configService.get('PAYMENT_SUCCESS_URL')}${
        sslData.tran_id
      }`;
      sslData.fail_url = `${this.configService.get('PAYMENT_FAIL_URL')}`;
      sslData.cancel_url = `${this.configService.get('PAYMENT_CANCEL_URL')}`;
      // sslData.ipn_url = '';

      // Customer Information
      sslData.cus_name = `${tm?.user?.firstName || ''} ${
        tm?.user?.lastName || ''
      }`;
      sslData.cus_email = `${tm?.user?.email || ''}`;
      sslData.cus_phone = `${tm?.user?.phone || ''}`;
      sslData.cus_add1 = `${tm?.user?.address?.address || 'test-address'}`;
      sslData.cus_city = `${tm?.user?.address?.state.name || ''}`;
      sslData.cus_country = `${tm?.user?.address?.country.name || ''}`;
      sslData.cus_postcode = `${tm?.user?.address?.thana.name || ''}`;

      // Shipment Information
      sslData.shipping_method = SslShippingMethodEnum.NO;

      // Product Information
      sslData.product_name = 'test-product';
      sslData.product_category = 'test-product-category';
      sslData.num_of_item = 1;
      sslData.product_profile = SslProductProfileEnum.GENERAL;
      sslData.product_amount = tm?.totalAmount;
      sslData.emi_option = 0;
      sslData.multi_card_name = '';
      sslData.allowed_bin = '';
      sslData.cart = [
        {
          amount: tm?.totalAmount,
          product: sslData.product_name,
        },
      ];
      sslData.value_a = tm?.user?.id;
      sslData.value_b = tm?.invoice?.id;
      sslData.value_c = tm.invoice.order.id;
      // console.log(transMaster.order, ' 🔥🔥🔥🔥🔥🔥🔥 ', tm?.invoice?.id)

      const dtoToEntity = await this.conversionService.toEntity<
        SslPrepareEntity,
        SslPrepareDto
      >(sslData);

      const prepareSslDto = this.sslPrepareRepository.create(dtoToEntity);
      await this.sslPrepareRepository.save(prepareSslDto);

      /********** ssl commerze init ********************/
      const settings = {
        isSandboxMode: Boolean(this.configService.get('PAYMENT_STORE_SANDBOX')),
        store_id: this.configService.get('PAYMENT_STORE_ID'),
        store_passwd: this.configService.get('PAYMENT_STORE_PASSWORD'),
      };

      sslData['currency'] = this.configService.get('PAYMENT_STORE_CURRENCY');

      const sslcz = new SSLCommerz(settings);
      const transaction: SslResponseDto = await sslcz.init_transaction(sslData);
      transaction.status = transaction.status.toLowerCase();

      /********** ssl commerze end=========================== ********************/
      return Promise.resolve(transaction);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  success = async (id: string, paymentDto: OnlinePaymentActivityLogDto) => {
    if (!(await this.alreadyDone(paymentDto.id))) {
      try {
        const transMasterData = await this.transMasterService.findById(id);

        // console.log('🔥🔥🔥🔥 payment dto', paymentDto);

        const transMasterDataEntity = await this.conversionService.toEntity<
          TransMasterEntity,
          TransMasterDto
        >(transMasterData);
        this.changeInvoiceStatus(transMasterDataEntity);
        // this.generateShopInvoice(transMasterDataEntity);
        // this.generateMerchantInvoice(transMasterDataEntity);

        const dtoToEntity = await this.conversionService.toEntity<
          OnlinePaymentActivityLogEntity,
          OnlinePaymentActivityLogDto
        >(paymentDto);
        // console.log('🔥🔥🔥🔥',{ paymentDto });
        const paymentSuccessResponse =
          this.onlinePaymentActivityLogRepository.create(dtoToEntity);
        // store the successful online payment activity log
        await this.onlinePaymentActivityLogRepository.save(
          paymentSuccessResponse,
        );
        // update the invoice from unpaid to paid by invoice id
        await this.invoiceRepository.update(
          { id: paymentDto.value_b },
          { status: InvoiceStatus.PAID },
        );
        console.log('🔥🔥🔥🔥', paymentDto.value_c);
        // update the order from pending to confirm by order id
        await this.orderRepository.update(
          { id: paymentDto.value_c },
          { status: OrderStatus.Confirmed },
        );
        // return the payment success response
        return this.conversionService.toDto<
          OnlinePaymentActivityLogEntity,
          OnlinePaymentActivityLogDto
        >(paymentSuccessResponse);
      } catch (error) {
        throw new SystemException(error);
      }
    }
  };
  promotionSuccess = async (
    id: string,
    paymentDto: OnlinePaymentActivityLogDto,
  ) => {
    try {
      console.log(paymentDto.online_payment_activity_log);

      const transMasterData = await this.transMasterService.findById(id);

      const transMasterDataEntity = await this.conversionService.toEntity<
        TransMasterEntity,
        TransMasterDto
      >(transMasterData);
      transMasterDataEntity.isPaid = Bool.Yes;
      await this.transMasterRepository.save(transMasterDataEntity);

      const dtoToEntity = await this.conversionService.toEntity<
        OnlinePaymentActivityLogEntity,
        OnlinePaymentActivityLogDto
      >(paymentDto);
      const paymentSuccessResponse =
        this.onlinePaymentActivityLogRepository.create(dtoToEntity);
      // await this.onlinePaymentActivityLogRepository.save(
      //   paymentSuccessResponse,
      // );
      // update the invoice from unpaid to paid by invoice id
      await this.promotionInvoiceRepository.update(
        { id: paymentDto.value_b },
        { paymentStatus: InvoiceStatus.PAID },
      );
      console.log('🔥🔥🔥🔥', paymentDto.value_c);

      await this.promotionRepository.update(
        { id: paymentDto.value_d },
        {
          promotionStatus: PromotionStatus.CONFIRM,
        },
      );
      // update the order from pending to confirm by order id
      // await this.orderRepository.update(
      //   { id: paymentDto.value_c },
      //   { status: OrderStatus.Confirmed },
      // );
      // return the payment success response
      return this.conversionService.toDto<
        OnlinePaymentActivityLogEntity,
        OnlinePaymentActivityLogDto
      >(paymentSuccessResponse);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  changeInvoiceStatus = async (transMasterDataEntity: TransMasterEntity) => {
    const invoice = transMasterDataEntity.invoice;
    invoice.status = InvoiceStatus.PAID;
    invoice.paymentMethod = PaymentMethodEnum.Online;
    await this.invoiceRepository.save(invoice);
    const merchantInvoices = await this.merchantInvoiceRepository.find({
      where: {
        invoice: invoice.id,
        ...isActive,
      },
    });
    for (const merchantInvoice of merchantInvoices) {
      merchantInvoice.status = InvoiceStatus.PAID;
      merchantInvoice.paymentMethod = PaymentMethodEnum.Online;
      await this.merchantInvoiceRepository.save(merchantInvoice);
    }
    const shopInvoices = await this.shopInvoiceRepository.find({
      where: {
        invoice: invoice.id,
        ...isActive,
      },
    });
    for (const shopInvoice of shopInvoices) {
      shopInvoice.status = InvoiceStatus.PAID;
      shopInvoice.paymentMethod = PaymentMethodEnum.Online;
      await this.shopInvoiceRepository.save(shopInvoice);
    }
  };

  failOrCancel = async (
    dto: OnlinePaymentActivityLogDto,
  ): Promise<OnlinePaymentActivityLogDto> => {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        OnlinePaymentActivityLogEntity,
        OnlinePaymentActivityLogDto
      >(dto);
      const paymentFailedResponse =
        this.onlinePaymentActivityLogRepository.create(dtoToEntity);
      // store the failed online payment activity log
      await this.onlinePaymentActivityLogRepository.save(paymentFailedResponse);
      // return the payment failed response
      return this.conversionService.toDto<
        OnlinePaymentActivityLogEntity,
        OnlinePaymentActivityLogDto
      >(paymentFailedResponse);
    } catch (error) {
      throw new SystemException(error);
    }
  };

  alreadyDone = async (id: string): Promise<boolean> => {
    const sslValidate = await this.onlinePaymentActivityLogRepository.findOne({
      id,
      ...isActive,
    });
    return await this.transMasterService.findByValID(sslValidate);
  };
}
