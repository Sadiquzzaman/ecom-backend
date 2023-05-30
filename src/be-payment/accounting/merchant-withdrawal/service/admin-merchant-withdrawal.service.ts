import { Injectable, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminGuard,
  ConversionService,
  ExceptionService,
  isActive,
  MerchantWithdrawalDto,
  MerchantWithdrawalEntity,
  MerchantWithdrawalParamDto,
  MerchantWithdrawalStatus,
  PermissionService,
  RequestService,
  SystemException,
  UpdateMerchantWithdrawalDto,
  UserEntity,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';
@UseGuards(new AdminGuard())
@Injectable()
export class AdminMerchantWithdrawalService {
  constructor(
    @InjectRepository(MerchantWithdrawalEntity)
    private readonly merchantWithdrawalRepository: Repository<MerchantWithdrawalEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly requestService: RequestService,
    private readonly permissionService: PermissionService,
  ) {}

  async pagination(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    merchantWithdrawalParam: MerchantWithdrawalParamDto,
  ): Promise<[MerchantWithdrawalDto[], number]> {
    const query = this.merchantWithdrawalRepository
      .createQueryBuilder('withdrawal')
      .leftJoinAndSelect('withdrawal.requestedBy', 'merchant')
      .leftJoinAndSelect('withdrawal.actionBy', 'action_user')
      .leftJoinAndSelect('merchant.user', 'user')
      .leftJoinAndSelect('withdrawal.bankDetails', 'bankDetails')
      .leftJoinAndSelect('bankDetails.banks', 'bank')
      .select();

    if (merchantWithdrawalParam.withdrawalStatus) {
      query.andWhere('withdrawal.withdrawalStatus = :withdrawalStatus', {
        withdrawalStatus: merchantWithdrawalParam.withdrawalStatus,
      });
    }
    if (merchantWithdrawalParam.paymentStatus) {
      query.andWhere('withdrawal.paymentStatus = :paymentStatus', {
        paymentStatus: merchantWithdrawalParam.paymentStatus,
      });
    }
    if (merchantWithdrawalParam.merchantID) {
      query.andWhere('withdrawal.requestedBy = :id', {
        id: merchantWithdrawalParam.merchantID,
      });
    }
    if (merchantWithdrawalParam.fromDate) {
      query.andWhere('DATE(withdrawal.createAt) >=  :startDate', {
        startDate: merchantWithdrawalParam.fromDate,
      });
    }
    if (merchantWithdrawalParam.toDate) {
      query.andWhere('DATE(withdrawal.createAt) <= :endDate', {
        endDate: merchantWithdrawalParam.toDate,
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

  async update(id: string, dto: UpdateMerchantWithdrawalDto) {
    const data = await this.merchantWithdrawalRepository.findOne({
      where: {
        id: id,
        withdrawalStatus: MerchantWithdrawalStatus.PENDING || 0,
        ...isActive,
      },
    });
    const modifiedData = this.requestService.forUpdate(data);

    switch (dto.withdrawalStatus) {
      case MerchantWithdrawalStatus.APPROVED:
        modifiedData.withdrawalStatus = MerchantWithdrawalStatus.APPROVED;
        modifiedData.paidAmount = dto.paidAmount;
        modifiedData.attachedDocument = dto.attachedDocument;
        modifiedData.transactionId = dto.transactionId;
        modifiedData.actionBy = await this.getUserById(modifiedData.updatedBy);
        modifiedData.actionAt = modifiedData.updatedAt;
        modifiedData.remarks = dto.remarks;
        const saveApprovedData = await this.merchantWithdrawalRepository.create(modifiedData);
        await this.merchantWithdrawalRepository.save(saveApprovedData);
        return this.conversionService.toDto<
          MerchantWithdrawalEntity,
          MerchantWithdrawalDto
        >(saveApprovedData);
      case MerchantWithdrawalStatus.REJECTED:
        modifiedData.withdrawalStatus = MerchantWithdrawalStatus.REJECTED;
        modifiedData.rejectReason = dto.rejectReason;
        modifiedData.actionBy = await this.getUserById(modifiedData.updatedBy);
        modifiedData.actionAt = modifiedData.updatedAt;
        const data = this.merchantWithdrawalRepository.create(modifiedData);
        const saveRejectedData = await this.merchantWithdrawalRepository.save(data);
        return this.conversionService.toDto<
          MerchantWithdrawalEntity,
          MerchantWithdrawalDto
        >(saveRejectedData);
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
