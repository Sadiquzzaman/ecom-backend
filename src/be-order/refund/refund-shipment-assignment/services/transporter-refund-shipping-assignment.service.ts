import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AssignStatus,
  Bool,
  ConversionService,
  CreateRefundShipmentAssignmentDto,
  CustomerRefundRequestEntity,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  PermissionService,
  RefundApprovalEntity,
  RefundShipmentAssignmentDto,
  RefundShipmentAssignmentEntity,
  RefundShipmentAssignmentStatusDto,
  RequestService,
  ShipmentAssignmentDeliveryStatusDto,
  ShippingStatus,
  SystemException,
  TransporterEntity,
  UserResponseDto,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class TransporterRefundShippingAssignmentService
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
    private requestService: RequestService,
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

  async create(
    dto: CreateRefundShipmentAssignmentDto,
  ): Promise<RefundShipmentAssignmentDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(dto);

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
      console.log(saveDto);

      if (saveDto.refundApproval) {
        let refundApprovalData = await this.getRefundApprovalData(
          saveDto.refundApproval.id,
        );
        if (dto.status === ShippingStatus.DELIVERED) {
          let refundReqData = await this.getRefundRequestByID(
            saveDto.refundRequest.id,
          );

          let refundAssignmentNotDeliverdCount =
            await this.getNotDeliveredApprovedAssignmentByRefundRequestId(
              refundReqData.id,
            );
          console.log(refundAssignmentNotDeliverdCount);

          if (refundAssignmentNotDeliverdCount === 0) {
            console.log('Will Be closed');

            refundReqData.assignStatus = AssignStatus.Closed;
            await this.refundRequestReposetory.save(refundReqData);
          }
        }
      }
      return this.conversionService.toDto<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(saveDto);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async getAssignedRefundRequestsForTransporter(
    page: number,
    limit: number,
    sort = 'updatedAt',
    order: 'ASC' | 'DESC' = 'DESC',
    statusDto: ShipmentAssignmentDeliveryStatusDto,
  ): Promise<[RefundShipmentAssignmentDto[], number]> {
    try {
      const userSession: UserResponseDto =
        await this.requestService.userSession();
      console.log(statusDto);

      const tranporter = await this.getTransporterByID(
        userSession.TransporterId,
      );

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
        })
        .andWhere('refund-delivery-assignment.transporter = :transporters', {
          transporters: tranporter.id,
        });

      if (statusDto.customerId) {
        query.andWhere('customers.id = :id', { id: statusDto.customerId });
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
        query.andWhere('refund-delivery-assignment.refundApproval IS NULL');
      } else if (statusDto.refundApprovalBool === 'true') {
        query.andWhere('refund-delivery-assignment.refundApproval IS NOT NULL');
        query.leftJoinAndSelect(
          'refund-delivery-assignment.refundApproval',
          'refundApproval',
        );
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
      relations: ['refundRequest', 'refundApproval'],
    });
    this.exceptionService.notFound(assignment, 'Refund Assignment Not Found!!');
    return assignment;
  }

  async getNotDeliveredApprovedAssignmentByRefundRequestId(
    id: string,
  ): Promise<number> {
    const query = this.refundShipmentAssignmentRepository
      .createQueryBuilder('refund_request_assignment')
      .leftJoinAndSelect(
        'refund_request_assignment.refundRequest',
        'refundRequest',
      )
      .where('refundRequest.id = :id', {
        id: id,
      })
      .andWhere('refund_request_assignment.refundApproval IS NOT NULL')
      .andWhere('refund_request_assignment.status != :status', {
        status: ShippingStatus.DELIVERED,
      });

    const count = await query.getCount();
    return count;
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
