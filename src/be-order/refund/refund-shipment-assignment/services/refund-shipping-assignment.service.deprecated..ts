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
  RefundApprovalEntity,
  RefundShippingType,
  Bool,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class RefundShippingAssignmentService
  implements GeneralService<RefundShipmentAssignmentDto>
{
  constructor(
    @InjectRepository(RefundShipmentAssignmentEntity)
    private readonly refundShipmentAssignmentRepository: Repository<RefundShipmentAssignmentEntity>,
    @InjectRepository(RefundApprovalEntity)
    private readonly RefundApprovalEntityRepository: Repository<RefundApprovalEntity>,
    @InjectRepository(TransporterEntity)
    private readonly transporterRepository: Repository<TransporterEntity>,
    @InjectRepository(CustomerRefundRequestEntity)
    private readonly refundRequestReposetory: Repository<CustomerRefundRequestEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
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
      }

      const returnRequest = await this.refundRequestReposetory.findOne({
        where: { ...isActive, id: dto.refundRequestId },
      });
      returnRequest.assignStatus = 1;
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
      const saveDto = await this.getBrnad(id);

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

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getBrnad(id);

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
      const brand = await this.getBrnad(id);
      return this.conversionService.toDto<
        RefundShipmentAssignmentEntity,
        RefundShipmentAssignmentDto
      >(brand);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/

  async getRefundApprovalData(id: string): Promise<RefundApprovalEntity> {
    const approvalData = await this.RefundApprovalEntityRepository.findOne({
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
  async getBrnad(id: string): Promise<RefundShipmentAssignmentEntity> {
    const brand = await this.refundShipmentAssignmentRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(brand, 'ShippingAssignment Not Found!!');
    return brand;
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
  /*********************** End checking relations of post *********************/
}
