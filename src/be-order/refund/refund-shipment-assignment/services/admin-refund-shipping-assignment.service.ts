import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversionService,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  SystemException,
  RefundShipmentAssignmentEntity,
  RefundShipmentAssignmentDto,
  CreateRefundShipmentAssignmentDto,
  TransporterEntity,
  CustomerRefundRequestEntity,
  ShippingStatus,
  PermissionService,
  ShipmentAssignmentDeliveryStatusDto,
  RefundShipmentAssignmentStatusDto,
  RefundApprovalEntity,
  RefundShippingType,
  Bool,
} from '@simec/ecom-common';
import { AssignStatus } from '@simec/ecom-common/dist/enum/assign-status.enum';
import { Repository } from 'typeorm';

@Injectable()
export class AdminRefundShippingAssignmentService
  implements GeneralService<RefundShipmentAssignmentDto>
{
  constructor(
    @InjectRepository(RefundShipmentAssignmentEntity)
    private readonly refundShipmentAssignmentRepository: Repository<RefundShipmentAssignmentEntity>,
    @InjectRepository(TransporterEntity)
    private readonly transporterRepository: Repository<TransporterEntity>,
    @InjectRepository(CustomerRefundRequestEntity)
    private readonly refundRequestReposetory: Repository<CustomerRefundRequestEntity>,

    @InjectRepository(RefundApprovalEntity)
    private readonly refundApprovalReposetory: Repository<RefundApprovalEntity>,

    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private permissionService: PermissionService,
  ) {}

  async findAll(): Promise<RefundShipmentAssignmentDto[]> {
    try {
      const allShippingAssignments =
        await this.refundShipmentAssignmentRepository.find({
          where: { ...isActive },
        });
      return this.conversionService.toDtos<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(allShippingAssignments);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(
    refundReasonDto: RefundShipmentAssignmentDto,
  ): Promise<RefundShipmentAssignmentDto[]> {
    try {
      const allShippingAssignments =
        await this.refundShipmentAssignmentRepository.find({
          where: {
            ...refundReasonDto,
            ...isActive,
          },
        });
      return this.conversionService.toDtos<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(allShippingAssignments);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
  ): Promise<[RefundShipmentAssignmentDto[], number]> {
    try {
      const allShippingAssignments =
        await this.refundShipmentAssignmentRepository.findAndCount({
          where: { ...isActive },
          skip: (page - 1) * limit,
          take: limit,
          order: {
            [sort !== 'undefined' ? sort : 'updatedAt']:
              sort !== 'undefined' ? order : 'DESC',
          },
        });

      return this.conversionService.toPagination<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(allShippingAssignments);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  // async create(
  //   dto: CreateRefundShipmentAssignmentDto,
  // ): Promise<RefundShipmentAssignmentDto> {
  //   try {
  //     const dtoToEntity = await this.conversionService.toEntity<
  //       RefundShipmentAssignmentEntity,
  //       RefundShipmentAssignmentDto
  //     >(dto);

  //     const refundShipping =
  //       this.refundShipmentAssignmentRepository.create(dtoToEntity);
  //     const transporter = await this.getTransporterByID(dto.transporterId);
  //     const refundRequest = await this.getRefundRequestByID(
  //       dto.refundRequestId,
  //     );
  //     refundShipping.assignedAt = new Date();
  //     refundShipping.transporter = transporter;
  //     refundShipping.refundRequest = refundRequest;
  //     refundShipping.order = refundRequest.order;
  //     refundShipping.customer = refundRequest.order.user.customer;
  //     refundShipping.expectedPickupDate = dto.expectedPickUpDate;
  //     // console.log('refundRequest', refundRequest);
  //     await this.refundShipmentAssignmentRepository.save(refundShipping);

  //     // Update Status On master
  //     refundRequest.assignStatus = AssignStatus.Assigned;
  //     await this.refundRequestReposetory.save(refundRequest);
  //     return this.conversionService.toDto<
  //       RefundShipmentAssignmentEntity,
  //       RefundShipmentAssignmentDto
  //     >(refundShipping);
  //   } catch (error) {
  //     throw new SystemException(error);
  //   }
  // }

  async create(
    dto: CreateRefundShipmentAssignmentDto,
  ): Promise<RefundShipmentAssignmentDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(dto);

      dtoToEntity.shippingType = RefundShippingType.COLLECT_FROM_CUSTOMER;
      dtoToEntity.status = ShippingStatus.ASSIGNED;
      dtoToEntity.expectedPickupDate = dto.expectedPickUpDate;

      const returnRequest = await this.refundRequestReposetory.findOne({
        where: { ...isActive, id: dto.refundRequestId },
      });

      if (dto.refundApprovalId) {
        // Process Approved Data Assignment
        const refundApprovalData = await this.getRefundApprovalData(
          dto.refundApprovalId,
        );

        if (!refundApprovalData) {
          throw new SystemException('Invalid Approval Data');
        }

        dtoToEntity.refundApproval = refundApprovalData;
        if (refundApprovalData.isApproved == Bool.No) {
          dtoToEntity.shippingType = RefundShippingType.RETURN_TO_CUSTOMER;
        } else {
          dtoToEntity.shippingType = RefundShippingType.RETURN_TO_SHOP;
        }

        refundApprovalData.assignStatus = AssignStatus.Assigned;
        // refundApprovalData.save();
        await this.refundApprovalReposetory.save(refundApprovalData);
      } else {
        returnRequest.assignStatus = AssignStatus.Assigned;
      }

      await this.refundRequestReposetory.save(returnRequest);

      const refundShipping =
        this.refundShipmentAssignmentRepository.create(dtoToEntity);
      const transporter = await this.getTransporterByID(dto.transporterId);
      const refundRequest = await this.getRefundRequestByID(
        dto.refundRequestId,
      );
      refundShipping.assignedAt = new Date();
      refundShipping.transporter = transporter;
      refundShipping.refundRequest = refundRequest;
      refundShipping.order = refundRequest.order;
      refundShipping.customer = refundRequest.order.user.customer;
      // console.log('refundRequest', refundRequest);
      await this.refundShipmentAssignmentRepository.save(refundShipping);

      return this.conversionService.toDto<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(refundShipping);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(
    id: string,
    dto: RefundShipmentAssignmentDto,
  ): Promise<RefundShipmentAssignmentDto> {
    try {
      const saveDto = await this.getRefundAssignment(id);

      const dtoToEntity = await this.conversionService.toEntity<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >({ ...saveDto, ...dto });

      const updatedShippingAssignment =
        await this.refundShipmentAssignmentRepository.save(dtoToEntity, {
          reload: true,
        });
      return this.conversionService.toDto<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(updatedShippingAssignment);
    } catch (error) {
      throw new SystemException(error);
    }
  }
  async updateStatus(
    id: string,
    dto: RefundShipmentAssignmentStatusDto,
  ): Promise<RefundShipmentAssignmentDto> {
    try {
      const saveDto = await this.getRefundAssignment(id);
      saveDto.status = dto.status;
      if (dto.status === ShippingStatus.PICKED) {
        saveDto.pickedAt = new Date();
      } else {
        saveDto.receivedAt = new Date();
      }

      const updatedShippingAssignment =
        await this.refundShipmentAssignmentRepository.save(saveDto, {
          reload: true,
        });
      return this.conversionService.toDto<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(updatedShippingAssignment);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async getAssignedRefundRequestsForAdmin(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    statusDto: ShipmentAssignmentDeliveryStatusDto,
  ): Promise<[RefundShipmentAssignmentDto[], number]> {
    try {
      console.log('🔥🔥🔥🔥', statusDto);
      const query = this.refundShipmentAssignmentRepository.createQueryBuilder(
        'refund-delivery-assignment',
      );
      query
        .leftJoinAndSelect(
          'refund-delivery-assignment.transporter',
          'transporter',
        )
        .leftJoinAndSelect(
          'refund-delivery-assignment.refundRequest',
          'refundRequests',
        )

        .leftJoinAndSelect(
          'refundRequests.refundRequestDetails',
          'refundRequestDetails',
        )
        .leftJoinAndSelect('refund-delivery-assignment.customer', 'customers')
        .leftJoinAndSelect('customers.user', 'users')
        .leftJoinAndSelect('transporter.user', 'user')
        .leftJoinAndSelect('refund-delivery-assignment.order', 'orders')
        .leftJoinAndSelect('orders.shippingAddress', 'shippingAddress')
        .where('refund-delivery-assignment.status = :status', {
          status: statusDto.shippingStatus,
        });
      // if (statusDto.assignStatus) {
      //   query.andWhere('refundRequests.assignStatus = :assignStatus', {
      //     assignStatus: statusDto.assignStatus,
      //   });
      // }
      if (statusDto.customerId) {
        query.andWhere('customers.id = :id', { id: statusDto.customerId });
        console.log(statusDto.customerId);
      }
      if (statusDto.transporterId) {
        query.andWhere('transporter.id = :id', { id: statusDto.transporterId });
      }
      if (statusDto.fromDate) {
        query.andWhere(
          'DATE(refund-delivery-assignment.expectedPickupDate) >=  :startDate',
          {
            startDate: statusDto.fromDate,
          },
        );
      }
      if (statusDto.toDate) {
        query.andWhere(
          'DATE(refund-delivery-assignment.expectedPickupDate) <= :endDate',
          {
            endDate: statusDto.toDate,
          },
        );
      }

      if (statusDto.refundApprovalBool === 'false') {
        if (statusDto.assignStatus) {
          query.andWhere('refundRequests.assignStatus = :assignStatus', {
            assignStatus: statusDto.assignStatus,
          });
        }
        query.andWhere('refund-delivery-assignment.refundApproval IS NULL');
      } else if (statusDto.refundApprovalBool === 'true') {
        query.andWhere('refund-delivery-assignment.refundApproval IS NOT NULL');
        query.leftJoinAndSelect(
          'refund-delivery-assignment.refundApproval',
          'refundApproval',
        );
        if (statusDto.assignStatus) {
          query.andWhere('refundApproval.assignStatus = :assignStatus', {
            assignStatus: statusDto.assignStatus,
          });
        }
        query.leftJoinAndSelect('refundApproval.shop', 'shop');
      }

      sort === 'createdAt'
        ? (sort = 'refund-delivery-assignment.createdAt')
        : (sort = 'refund-delivery-assignment.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);

      const confirmedOrderList = await query.getManyAndCount();

      return this.conversionService.toPagination<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(confirmedOrderList);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getRefundAssignment(id);

      const deleted = await this.refundShipmentAssignmentRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string): Promise<RefundShipmentAssignmentDto> {
    try {
      const brand = await this.getRefundAssignment(id);
      return this.conversionService.toDto<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(brand);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/

  async getRefundAssignment(
    id: string,
  ): Promise<RefundShipmentAssignmentEntity> {
    const assignment = await this.refundShipmentAssignmentRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(assignment, 'Refund Assignment Not Found!!');
    return assignment;
  }

  async getTransporterByID(id: String): Promise<TransporterEntity> {
    const transporter = await this.transporterRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });

    this.exceptionService.notFound(transporter, 'Transporter Not Found!!');
    return transporter;
  }

  async getRefundRequestByID(id: String): Promise<CustomerRefundRequestEntity> {
    const query = this.refundRequestReposetory
      .createQueryBuilder('refund_request')
      .leftJoinAndSelect('refund_request.order', 'order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('user.customer', 'customer')
      .where('refund_request.id = :id', { id: id });

    const refundRequest = await query.getOne();

    this.exceptionService.notFound(refundRequest, 'Request Not Found!!');
    return refundRequest;
  }

  async getRefundApprovalData(id: string): Promise<RefundApprovalEntity> {
    const approvalData = await this.refundApprovalReposetory.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(
      approvalData,
      'Refund approval data not found!!',
    );
    return approvalData;
  }
  /*********************** End checking relations of post *********************/
}
