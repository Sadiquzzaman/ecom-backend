import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AssignStatus,
  BankDetailsEntity,
  ConversionService,
  CreateMerchantWithdrawalRequestDto,
  CustomerRefundRequestEntity,
  ExceptionService,
  isActive,
  MerchantEntity,
  MerchantWithdrawalDto,
  MerchantWithdrawalEntity,
  MerchantWithdrawalParamDto,
  MerchantWithdrawalStatus,
  PermissionService,
  RequestService,
  ShopInvoiceEntity,
  SystemException,
  UpdateMerchantWithdrawalDto,
  UserEntity,
  UserResponseDto,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';
@Injectable()
export class MerchantWithdrawalService {
  constructor(
    @InjectRepository(MerchantWithdrawalEntity)
    private readonly merchantWithdrawalRepository: Repository<MerchantWithdrawalEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ShopInvoiceEntity)
    private readonly shopInvoiceReposetory: Repository<ShopInvoiceEntity>,
    @InjectRepository(CustomerRefundRequestEntity)
    private readonly refundRequestRepository: Repository<CustomerRefundRequestEntity>,
    @InjectRepository(BankDetailsEntity)
    private readonly bankDetailsRepository: Repository<BankDetailsEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly requestService: RequestService,
    private readonly permissionService: PermissionService,
  ) {}

  async create(
    dto: CreateMerchantWithdrawalRequestDto,
  ): Promise<MerchantWithdrawalDto> {
    try {
      const userSession: UserResponseDto =
        await this.requestService.userSession();
      const availableAmount = await this.getAvailableBalanceData(
        userSession.MerchantId,
      );

      console.log(availableAmount);

      if (availableAmount < 500 || Number(dto.requestedAmount) < 500) {
        throw new Error('not allowed to withdraw the amount below 500 BDT');
      }
      if (Number(dto.requestedAmount) > availableAmount) {
        throw new Error('withdrawal requested amount not available');
      }

      const merchantWithdrawalReq = this.requestService.forCreate(
        new MerchantWithdrawalEntity(),
      );
      merchantWithdrawalReq.amount = Number(dto.requestedAmount);
      merchantWithdrawalReq.requestedBy = await this.getMerchantByUserId(
        merchantWithdrawalReq.createdBy,
      );
      merchantWithdrawalReq.bankDetails = await this.getBankDetailsById(
        dto.bankDetailsId,
      );

      const data = await this.merchantWithdrawalRepository.create(
        merchantWithdrawalReq,
      );
      const saveData = await this.merchantWithdrawalRepository.save(data);
      return this.conversionService.toDto<
        MerchantWithdrawalEntity,
        MerchantWithdrawalDto
      >(saveData);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    merchantWithdrawalParamDto: MerchantWithdrawalParamDto,
  ): Promise<[MerchantWithdrawalDto[], number]> {
    const userSession: UserResponseDto =
      await this.requestService.userSession();
    const merchantId = userSession.MerchantId;

    const query = this.merchantWithdrawalRepository
      .createQueryBuilder('withdrawal')
      .select()
      .leftJoinAndSelect('withdrawal.requestedBy', 'merchant')
      .leftJoinAndSelect('withdrawal.actionBy', 'action_user')
      .leftJoinAndSelect('merchant.user', 'user')
      .leftJoinAndSelect('withdrawal.bankDetails', 'bankDetails')
      .leftJoinAndSelect('bankDetails.banks', 'bank')
      .andWhere('withdrawal.requestedBy = :id', {
        id: merchantId,
      });

    if (merchantWithdrawalParamDto.withdrawalStatus) {
      query.andWhere('withdrawal.withdrawalStatus = :withdrawal_status', {
        withdrawal_status: merchantWithdrawalParamDto.withdrawalStatus,
      });
    }

    if (merchantWithdrawalParamDto.fromDate) {
      query.andWhere('DATE(withdrawal.createAt) >=  :startDate', {
        startDate: merchantWithdrawalParamDto.fromDate,
      });
    }

    if (merchantWithdrawalParamDto.toDate) {
      query.andWhere('DATE(withdrawal.createAt) <= :endDate', {
        endDate: merchantWithdrawalParamDto.toDate,
      });
    }

    sort === 'createdAt'
      ? (sort = 'withdrawal.createdAt')
      : (sort = 'withdrawal.updatedAt');

    query
      .orderBy(sort, order)
      .skip((page - 1) * limit)
      .take(limit);

    const data = await query.getManyAndCount();

    return this.conversionService.toPagination<
      MerchantWithdrawalEntity,
      MerchantWithdrawalDto
    >(data);
  }

  async getMerchantByUserId(userId: string): Promise<MerchantEntity> {
    try {
      console.log(userId);

      const user = await this.userRepository.findOne(
        {
          id: userId,
          ...isActive,
        },
        { relations: ['merchant'] },
      );

      if (!user.merchant) {
        throw new Error('merchant not found');
      }

      return Promise.resolve(user.merchant);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: UpdateMerchantWithdrawalDto) {
    const data = await this.merchantWithdrawalRepository.findOne({
      where: {
        id: id,
        withdrawalStatus: MerchantWithdrawalStatus.PENDING || 0,
        ...isActive,
      },
    });
    const modifiedData = this.requestService.forUpdate(data);

    modifiedData.withdrawalStatus = MerchantWithdrawalStatus.CANCELLED;
    modifiedData.actionBy = await this.getUserById(modifiedData.updatedBy);
    modifiedData.actionAt = modifiedData.updatedAt;
    const saveCancelledData = await this.merchantWithdrawalRepository.create(
      modifiedData,
    );
    await this.merchantWithdrawalRepository.save(saveCancelledData);
    return this.conversionService.toDto<
      MerchantWithdrawalEntity,
      MerchantWithdrawalDto
    >(saveCancelledData);
  }

  async getAvailableBalanceData(merchant: string): Promise<any> {
    const userSession: UserResponseDto =
      await this.requestService.userSession();
    const merchantId = merchant || userSession.MerchantId;

    const availableData: {
      availableBalance: number;
      totalSale: number;
      totalRefund: number;
      totalWithdrawal: number;
      totalPendingWithdrawal: number;
    } = {
      availableBalance: 0,
      totalSale: 0,
      totalRefund: 0,
      totalWithdrawal: 0,
      totalPendingWithdrawal: 0,
    };

    if (!merchantId) {
      return availableData;
    }

    const date = new Date();
    date.setDate(date.getDate() - 7);
    // console.log(date);

    const query = this.shopInvoiceReposetory
      .createQueryBuilder('shop_invoices')
      .leftJoin('shop_invoices.merchant', 'merchant')
      .leftJoin('shop_invoices.deliveryAssignment', 'deliveryAssignment')
      .where('merchant.id = :id', { id: merchantId });
    // .andWhere('DATE(deliveryAssignment.deliveredAt) <=  :date', {
    //   date: date,
    // });

    const refundQuery = this.refundRequestRepository
      .createQueryBuilder('refund_request')
      .leftJoin('refund_request.invoice', 'invoice')
      .leftJoin('invoice.shopInvoice', 'shopInvoice')
      .leftJoin('shopInvoice.merchant', 'merchant')
      .where('merchant.id = :id', { id: merchantId })
      .andWhere('refund_request.assignStatus = :status', {
        status: AssignStatus.Closed,
      });
    // .andWhere('DATE(refund_request.updatedAt) <=  :date', {
    //   date: date,
    // });

    const withdrawalQuery = this.merchantWithdrawalRepository
      .createQueryBuilder('merchant_withdrawl')
      .leftJoin('merchant_withdrawl.requestedBy', 'requestedBy')
      .where(
        'merchant_withdrawl.withdrawalStatus BETWEEN :pending AND :approved',
        {
          pending: 0,
          approved: 1,
        },
      )
      // .where('merchant_withdrawl.withdrawalStatus = :status', {
      //   status: MerchantWithdrawalStatus.APPROVED,
      // })
      // .orWhere('merchant_withdrawl.withdrawalStatus = :status', {
      //   status: MerchantWithdrawalStatus.PENDING,
      // })
      .andWhere('requestedBy.id = :id', { id: merchantId });

    const shopInvoices = await query.getMany();

    const refundRequests = await refundQuery.getMany();

    const withdrawalRequests = await withdrawalQuery.getMany();

    console.log('ttttttttttttttttttttttt', withdrawalRequests);

    // Process Shop invlices
    shopInvoices.forEach((shopInvoice) => {
      let totalDeduction: number = 0;
      totalDeduction =
        shopInvoice.commission +
        shopInvoice.totalShippingCost +
        shopInvoice.totalAdditionalShippingCost;

      let shopAmount = shopInvoice.invoiceTotal - totalDeduction;

      availableData.totalSale += shopAmount;
    });

    // Porcess Refund Requests
    refundRequests.forEach((refundRequest) => {
      availableData.totalRefund += Number(refundRequest.totalRefundableAmount);
    });

    // Process Refund Requests
    withdrawalRequests.forEach((withdrawalRequest) => {
      if (
        withdrawalRequest.withdrawalStatus === MerchantWithdrawalStatus.APPROVED
      ) {
        availableData.totalWithdrawal += Number(withdrawalRequest.paidAmount);
      } else {
        // Pending Requests
        availableData.totalPendingWithdrawal += Number(
          withdrawalRequest.amount,
        );
      }
    });

    availableData.availableBalance =
      availableData.totalSale -
      (availableData.totalWithdrawal +
        availableData.totalPendingWithdrawal +
        availableData.totalRefund);

    return availableData;
  }

  async getBankDetailsById(bankDetailId: string): Promise<BankDetailsEntity> {
    try {
      const bankData = await this.bankDetailsRepository.findOne({
        id: bankDetailId,
        ...isActive,
      });

      if (!bankData) {
        throw new Error('bank detail not found');
      }

      return bankData;
    } catch (err) {
      throw new SystemException(err);
    }
  }

  async getUserById(id: string): Promise<UserEntity> {
    try {
      const user = await this.userRepository.findOne(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new SystemException(error);
    }
  }
}
