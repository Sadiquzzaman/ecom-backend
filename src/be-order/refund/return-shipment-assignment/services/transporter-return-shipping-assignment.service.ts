import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversionService,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  RefundApprovalDto,
  RefundApprovalEntity,
  ShipmentAssignmentDeliveryStatusDto,
  SystemException,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class TransporterReturnShippingAssignmentService
  implements GeneralService<RefundApprovalDto>
{
  constructor(
    @InjectRepository(RefundApprovalEntity)
    private readonly refundApprovalRepository: Repository<RefundApprovalEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
  ) {}

  async findAll(): Promise<RefundApprovalDto[]> {
    try {
      const allRefundApprovals = await this.refundApprovalRepository.find({
        where: { ...isActive },
      });
      return this.conversionService.toDtos<
        RefundApprovalEntity,
        RefundApprovalDto
      >(allRefundApprovals);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(
    refundApprovalDto: RefundApprovalDto,
  ): Promise<RefundApprovalDto[]> {
    try {
      const allRefundApprovals = await this.refundApprovalRepository.find({
        where: {
          ...refundApprovalDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<
        RefundApprovalEntity,
        RefundApprovalDto
      >(allRefundApprovals);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    statusDto: ShipmentAssignmentDeliveryStatusDto,
  ): Promise<[RefundApprovalDto[], number]> {
    try {
      const query =
        this.refundApprovalRepository.createQueryBuilder('refund_approval');

      query
        .leftJoinAndSelect('refund_approval.refundRequest', 'refundRequests')

        .leftJoinAndSelect(
          'refundRequests.refundRequestDetails',
          'refundRequestDetails',
        )
        .leftJoinAndSelect('refund_approval.customer', 'customers')
        .leftJoinAndSelect('customers.user', 'users')
        .leftJoinAndSelect('refund_approval.order', 'orders')
        .leftJoinAndSelect('orders.shippingAddress', 'shippingAddress')
        .where('refund_approval.isActive = :isActive', {
          isActive: 1,
        })
        .andWhere('refund_approval.assignStatus = :assignStatus', {
          assignStatus: statusDto.assignStatus,
        });

      if (statusDto.customerId) {
        query.andWhere('customers.id = :id', { id: statusDto.customerId });
        console.log(statusDto.customerId);
      }
      if (statusDto.transporterId) {
        query.andWhere('transporter.id = :id', { id: statusDto.transporterId });
      }
      if (statusDto.fromDate) {
        query.andWhere(
          'DATE(refund_approval.expectedPickupDate) >=  :startDate',
          {
            startDate: statusDto.fromDate,
          },
        );
      }
      if (statusDto.toDate) {
        query.andWhere('DATE(refund_approval.expectedPickupDate) <= :endDate', {
          endDate: statusDto.toDate,
        });
      }

      sort === 'createdAt'
        ? (sort = 'refund_approval.createdAt')
        : (sort = 'refund_approval.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);

      const allRefundApprovals = await query.getManyAndCount();

      return this.conversionService.toPagination<
        RefundApprovalEntity,
        RefundApprovalDto
      >(allRefundApprovals);
    } catch (error) {
      throw new SystemException(error);
    }
  }
  async create(dto: RefundApprovalDto): Promise<RefundApprovalDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        RefundApprovalEntity,
        RefundApprovalDto
      >(dto);

      const refundApproval = this.refundApprovalRepository.create(dtoToEntity);
      await this.refundApprovalRepository.save(refundApproval);
      return this.conversionService.toDto<
        RefundApprovalEntity,
        RefundApprovalDto
      >(refundApproval);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: RefundApprovalDto): Promise<RefundApprovalDto> {
    try {
      const saveDto = await this.getBrnad(id);

      const dtoToEntity = await this.conversionService.toEntity<
        RefundApprovalEntity,
        RefundApprovalDto
      >({ ...saveDto, ...dto });

      const updatedRefundApproval = await this.refundApprovalRepository.save(
        dtoToEntity,
        {
          reload: true,
        },
      );
      return this.conversionService.toDto<
        RefundApprovalEntity,
        RefundApprovalDto
      >(updatedRefundApproval);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getBrnad(id);

      const deleted = await this.refundApprovalRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string): Promise<RefundApprovalDto> {
    try {
      const refundApproval = await this.getBrnad(id);
      return this.conversionService.toDto<
        RefundApprovalEntity,
        RefundApprovalDto
      >(refundApproval);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/

  async getBrnad(id: string): Promise<RefundApprovalEntity> {
    const refundApproval = await this.refundApprovalRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(
      refundApproval,
      'Refund Approval Not Found!!',
    );
    return refundApproval;
  }
  /*********************** End checking relations of post *********************/
}
