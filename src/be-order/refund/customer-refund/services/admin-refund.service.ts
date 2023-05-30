import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AssignStatus,
  ConversionService,
  CreateCustomerRefundRequestDto,
  CustomerRefudnRequestDetailDto,
  CustomerRefundRequestDetailEntity,
  CustomerRefundRequestDto,
  CustomerRefundRequestEntity,
  CustomerRefundRequestStatusDto,
  ExceptionService,
  isActive,
  OrderEntity,
  ProductAttributeEntity,
  ProductEntity,
  RefundApprovalDetailsEntity,
  RefundApprovalEntity,
  RefundReasonEntity,
  RefundRequestRejectDto,
  RefundStatus,
  RefundStep,
  RequestService,
  ShippingStatus,
  ShopInvoiceDetailsEntity,
  ShopInvoiceDto,
  ShopInvoiceEntity,
  SystemException,
  UpdateCustomerRefundRequestDto,
  UserResponseDto,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class AdminRefundService {
  constructor(
    @InjectRepository(ShopInvoiceEntity)
    private readonly shopInvoiceReposetory: Repository<ShopInvoiceEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ProductAttributeEntity)
    private readonly productAttributeRepository: Repository<ProductAttributeEntity>,
    @InjectRepository(RefundReasonEntity)
    private readonly refundReasonRepository: Repository<RefundReasonEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(CustomerRefundRequestEntity)
    private readonly refundRequestRepository: Repository<CustomerRefundRequestEntity>,
    @InjectRepository(CustomerRefundRequestDetailEntity)
    private readonly refundRequestDetailRepository: Repository<CustomerRefundRequestDetailEntity>,
    @InjectRepository(ShopInvoiceDetailsEntity)
    private readonly shopInvoiceDetailRepository: Repository<ShopInvoiceDetailsEntity>,

    @InjectRepository(RefundApprovalEntity)
    private readonly refundRequestApproval: Repository<RefundApprovalEntity>,
    @InjectRepository(RefundApprovalDetailsEntity)
    private readonly refundRequestApprovalDetails: Repository<RefundApprovalDetailsEntity>,

    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly requestService: RequestService,
  ) {}

  async create(createRefundRequest: CreateCustomerRefundRequestDto) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.invoice', 'invoices')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.id = :id', { id: createRefundRequest.orderID });

    const orderWithInvoice = await query.getOne();

    const refundRequest =
      this.requestService.forCreateEntity<CustomerRefundRequestEntity>(
        new CustomerRefundRequestEntity(),
      );
    refundRequest.invoice = orderWithInvoice.invoice;
    delete orderWithInvoice.invoice;
    refundRequest.order = orderWithInvoice;
    refundRequest.customer = orderWithInvoice.customer;
    refundRequest.description = createRefundRequest.additionalInformation;
    refundRequest.totalRefundableAmount = 0;
    // refundRequest.customer.id = refundRequest.createdBy;

    refundRequest.refundRequestDetails =
      new Array<CustomerRefundRequestDetailEntity>();
    let totalRefundableAmount = 0;
    for (const refundProduct of createRefundRequest.productRefundReason) {
      const refundDetail =
        this.requestService.forCreateEntity<CustomerRefundRequestDetailEntity>(
          new CustomerRefundRequestDetailEntity(),
        );
      refundDetail.product = await this.getProductById(refundProduct.productID);
      refundDetail.productAttribute = await this.getProductAttributeById(
        refundProduct.productAttributeID,
      );
      refundDetail.shopInvoiceDetail = await this.getShopInvoiceDetailById(
        refundProduct.shopInvoiceDetailID,
      );
      refundDetail.refundRequestQuantity = refundProduct.quantity;
      refundDetail.refundRequestDate = new Date();
      refundDetail.refundReason = refundProduct.refundReason;
      refundDetail.refundStatus = RefundStatus.REFUND_REQUEST;
      refundDetail.price = refundDetail.productAttribute.price;
      refundDetail.refundableAmount =
        refundDetail.productAttribute.price * refundProduct.quantity;
      totalRefundableAmount += refundDetail.refundableAmount;
      refundRequest.refundRequestDetails.push(refundDetail);
    }
    refundRequest.totalRefundableAmount = totalRefundableAmount;
    const data = await this.refundRequestRepository.create(refundRequest);
    return this.refundRequestRepository.save(data);
  }

  getProductById = async (id: string): Promise<ProductEntity> => {
    const product = await this.productRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });

    this.exceptionService.notFound(product, 'Product not found!!');
    return product;
  };

  getProductAttributeById = async (
    id: string,
  ): Promise<ProductAttributeEntity> => {
    const productAttribute = await this.productAttributeRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });

    this.exceptionService.notFound(
      productAttribute,
      'Product Attribute not found!!',
    );
    return productAttribute;
  };

  getShopInvoiceDetailById = async (
    id: string,
  ): Promise<ShopInvoiceDetailsEntity> => {
    const shopInvoiceDetail = await this.shopInvoiceDetailRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });

    this.exceptionService.notFound(
      shopInvoiceDetail,
      'Product Attribute not found!!',
    );
    return shopInvoiceDetail;
  };

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: 'ASC' | 'DESC',
    refundRequestStatus: CustomerRefundRequestStatusDto,
  ): Promise<[CustomerRefundRequestDto[], number]> {
    try {
      const query = await this.refundRequestRepository
        .createQueryBuilder('refundReq')
        .where('refundReq.isActive = :isActive', { ...isActive })
        .andWhere('refundReqDetails.isActive = :isActive', { ...isActive })
        .leftJoinAndSelect('refundReq.refundRequestDetails', 'refundReqDetails')
        .leftJoinAndSelect('refundReq.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'user')
        .leftJoinAndSelect('refundReqDetails.product', 'product')
        .leftJoinAndSelect('product.shop', 'shop')
        .leftJoinAndSelect(
          'refundReq.refundShippingAssignment',
          'refundShippingAssignment',
        )
        .andWhere('refundShippingAssignment.id IS NULL');

      if (refundRequestStatus.refundStatus) {
        query.andWhere('refundReqDetails.refundStatus = :refundReqStatus', {
          refundReqStatus: refundRequestStatus.refundStatus,
        });
      }
      if (refundRequestStatus.assignStatus) {
        query.andWhere('refundReq.assignStatus = :assignStatus', {
          assignStatus: refundRequestStatus.assignStatus,
        });
      }
      if (refundRequestStatus.customerID) {
        query.andWhere('refundReq.customer = :id', {
          id: refundRequestStatus.customerID,
        });
      }
      if (refundRequestStatus.fromDate) {
        query.andWhere('DATE(refundReq.createAt) >=  :startDate', {
          startDate: refundRequestStatus.fromDate,
        });
      }
      if (refundRequestStatus.toDate) {
        query.andWhere('DATE(refundReq.createAt) <= :endDate', {
          endDate: refundRequestStatus.toDate,
        });
      }

      sort === 'createdAt'
        ? (sort = 'refundReq.createdAt')
        : (sort = 'refundReq.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);

      const refundReqData = await query.getManyAndCount();

      return this.conversionService.toPagination<
        CustomerRefundRequestEntity,
        CustomerRefundRequestDto
      >(refundReqData);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async paginationForCustomer(
    page: number,
    limit: number,
    sort: string,
    order: 'ASC' | 'DESC',
    refundRequestStatus: CustomerRefundRequestStatusDto,
  ): Promise<[CustomerRefundRequestDto[], number]> {
    try {
      const userSession: UserResponseDto =
        await this.requestService.userSession();

      const query = await this.refundRequestRepository
        .createQueryBuilder('refundReq')
        .where('refundReq.isActive = :isActive', { ...isActive })
        .andWhere('refundReqDetails.isActive = :isActive', { ...isActive })
        .leftJoinAndSelect('refundReq.refundRequestDetails', 'refundReqDetails')
        .leftJoinAndSelect('refundReq.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'user')
        .leftJoinAndSelect('refundReqDetails.product', 'product')
        .leftJoinAndSelect('product.shop', 'shop')
        .andWhere('refundReq.customer = :customers', {
          customers: userSession.CustomerId,
        });

      if (refundRequestStatus.refundStatus) {
        query.andWhere('refundReqDetails.refundStatus = :refundReqStatus', {
          refundReqStatus: refundRequestStatus.refundStatus,
        });
      }
      if (refundRequestStatus.assignStatus) {
        query.andWhere('refundReq.assignStatus = :assignStatus', {
          assignStatus: refundRequestStatus.assignStatus,
        });
      }
      if (refundRequestStatus.customerID) {
        query.andWhere('refundReq.customer = :id', {
          id: refundRequestStatus.customerID,
        });
      }
      if (refundRequestStatus.fromDate) {
        query.andWhere('DATE(refundReq.createAt) >=  :startDate', {
          startDate: refundRequestStatus.fromDate,
        });
      }
      if (refundRequestStatus.toDate) {
        query.andWhere('DATE(refundReq.createAt) <= :endDate', {
          endDate: refundRequestStatus.toDate,
        });
      }

      sort === 'createdAt'
        ? (sort = 'refundReq.createdAt')
        : (sort = 'refundReq.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);
      const refundReqData = await query.getManyAndCount();

      return this.conversionService.toPagination<
        CustomerRefundRequestEntity,
        CustomerRefundRequestDto
      >(refundReqData);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(
    id: string,
    refundStatus: number,
  ): Promise<CustomerRefundRequestDto> {
    try {
      const query = await this.refundRequestRepository.createQueryBuilder(
        'refundReq',
      );

      query
        .where('refundReq.id = :refundReqId', { refundReqId: id })
        .leftJoinAndSelect(
          'refundReq.refundRequestDetails',
          'refundRequestDetail',
        )
        .leftJoinAndSelect('refundReq.order', 'orders')
        .leftJoinAndSelect('orders.shippingAddress', 'shippingAddress')
        .leftJoinAndSelect('orders.billingAddress', 'billingAddress')
        .leftJoinAndSelect('refundRequestDetail.product', 'products')
        .leftJoinAndSelect(
          'refundRequestDetail.productAttribute',
          'productAttributes',
        );
      if (refundStatus == 0) {
        query.andWhere('refundRequestDetail.refundStatus = :status ', {
          status: RefundStatus.REFUND_REQUEST,
        });
      }

      if (refundStatus == 1) {
        query.andWhere('refundRequestDetail.refundStatus = :status ', {
          status: RefundStatus.REFUND_PICKED,
        });
      }

      if (refundStatus == 2) {
        query.andWhere('refundRequestDetail.refundStatus = :status ', {
          status: RefundStatus.REFUND_APPROVED,
        });
      }

      // .andWhere('refundRequestDetail.refundStatus = :status ', {
      //   status: RefundStatus.REFUND_PICKED,
      // });

      const customerRefund = await query.getOne();
      return this.conversionService.toDto<
        CustomerRefundRequestEntity,
        CustomerRefundRequestDto
      >(customerRefund);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async updateRefundRequestStatus(
    id: String,
    dto: UpdateCustomerRefundRequestDto,
  ): Promise<CustomerRefundRequestDto> {
    try {
      const refundRequest = await this.refundRequestRepository.findOne({
        where: { ...isActive, id: id },
        relations: ['order', 'order.shippingAddress'],
      });

      refundRequest.assignStatus = dto.assignStatus;

      // await this.refundRequestRepository.save(refundRequest);

      const responseData: CustomerRefundRequestDto =
        new CustomerRefundRequestDto();
      responseData.refundRequestDetails =
        new Array<CustomerRefudnRequestDetailDto>();

      const requestDetailsData = new Array<CustomerRefundRequestDetailEntity>(); // Approved Data Set

      let totalRefundableAmount = 0;

      for (const refundProduct of dto.refundProductQuantity) {
        const data = await this.refundRequestDetailRepository.findOne({
          where: { ...isActive, id: refundProduct.refundRequestDetailId },
          relations: ['product', 'product.shop', 'productAttribute'],
        });

        if (!data) {
          throw new BadRequestException();
        }

        data.refundableAmount = data.price * refundProduct.quantity;
        totalRefundableAmount += data.refundableAmount;

        // Process by Status
        switch (dto.refundRequestStatus) {
          case RefundStatus.REFUND_PICKED:
            data.refundPickedQuantity = refundProduct.quantity;
            // data.refundPickedDate = new Date();
            data.refundStatus = RefundStatus.REFUND_PICKED;

            break;
          case RefundStatus.REFUND_APPROVED:
            data.refundApprovedQuantity = refundProduct.quantity;
            data.refundApprovedDate = new Date();
            data.refundStatus = RefundStatus.REFUND_APPROVED;
            // Proceess Approval data
            requestDetailsData.push(data);
            break;
          default:
            throw new BadRequestException();
        }

        const updateData = await this.refundRequestDetailRepository.save(data);

        refundRequest.totalRefundableAmount = totalRefundableAmount;
        await this.refundRequestRepository.save(refundRequest);

        const updateDataDto = await this.conversionService.toDto<
          CustomerRefundRequestDetailEntity,
          CustomerRefudnRequestDetailDto
        >(updateData);
        responseData.refundRequestDetails.push(updateDataDto);
      }
      if (requestDetailsData.length > 0) {
        await this.processRefundApprovalData(refundRequest, requestDetailsData);
      }
      // return;
      return responseData;
    } catch (error) {
      throw new SystemException(error);
    }
  }
  async rejectRefundRequest(
    id: String,
    dto: RefundRequestRejectDto,
  ): Promise<CustomerRefundRequestDto> {
    try {
      const responseData: CustomerRefundRequestDto =
        new CustomerRefundRequestDto();
      responseData.refundRequestDetails =
        new Array<CustomerRefudnRequestDetailDto>();

      const refundRequest = await this.refundRequestRepository.findOne({
        where: { ...isActive, id: id },
        relations: ['order', 'order.shippingAddress', 'refundRequestDetails'],
      });

      refundRequest.assignStatus = AssignStatus.Rejected;

      await this.refundRequestDetailRepository
        .createQueryBuilder()
        .update()
        .set({
          refundStatus: RefundStatus.REFUND_REJECTED,
        })
        .where('customer_refund_request_id = :id', { id: refundRequest.id })
        .execute();

      if (dto.step === RefundStep.APPROVE) {
        const refundApprovalDetailsData =
          new Array<RefundApprovalDetailsEntity>();
        const refundApprovedApproval: RefundApprovalEntity =
          new RefundApprovalEntity();

        const userSession: UserResponseDto =
          await this.requestService.userSession();
        refundApprovedApproval.createAt = new Date();
        refundApprovedApproval.createdBy = userSession.UserId;
        refundApprovedApproval.order = refundRequest.order;
        refundApprovedApproval.customer = refundRequest.customer;
        refundApprovedApproval.refundRequest = refundRequest;
        refundApprovedApproval.address = refundRequest.order.shippingAddress;
        refundApprovedApproval.isApproved = 0;
        refundApprovedApproval.assignStatus = AssignStatus.UnAssigned;

        for (const refundDetail of refundRequest.refundRequestDetails) {
          let refundApprovalDetails = new RefundApprovalDetailsEntity();

          refundApprovalDetails.product = refundDetail.product;
          refundApprovalDetails.productAttributes =
            refundDetail.productAttribute;
          refundApprovalDetails.refundReason = refundDetail.refundReason;
          refundApprovalDetails.quantity = refundDetail.refundPickedQuantity;
          refundApprovalDetailsData.push(refundApprovalDetails);
        }

        refundApprovedApproval.refundApprovalDetails =
          refundApprovalDetailsData;
        const updateData = await this.refundRequestApproval.save(
          refundApprovedApproval,
        );
      }

      let updatedRefundRequestData = await this.refundRequestRepository.save(
        refundRequest,
      );

      return this.conversionService.toDto<
        CustomerRefundRequestEntity,
        CustomerRefundRequestDto
      >(updatedRefundRequestData);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async processRefundApprovalData(
    refundRequest: CustomerRefundRequestEntity,
    refundRequestDetails: Array<CustomerRefundRequestDetailEntity>,
  ) {
    const shopWiseRefundDetails = [];
    for (const refundDetail of refundRequestDetails) {
      const existingShopdata = shopWiseRefundDetails.find(
        (shopCart) => shopCart.shopId === refundDetail.product.shop.id,
      );
      if (existingShopdata) {
        existingShopdata.refundDetails.push(refundDetail);
      } else {
        const existingShopdata = {
          shopId: refundDetail.product.shop.id,
          refundDetails: [refundDetail],
        };
        shopWiseRefundDetails.push(existingShopdata);
      }
    }

    console.log(shopWiseRefundDetails);

    // const refundApprovedApproval: RefundApprovalEntity =
    //   new RefundApprovalEntity();
    // const refundApprovalDetailsData = new Array<RefundApprovalDetailsEntity>();

    // const refundRejectedApproval: RefundApprovalEntity =
    //   new RefundApprovalEntity();
    // const refundRejectedDetailsData = new Array<RefundApprovalDetailsEntity>();

    const refundRejectedApproval: RefundApprovalEntity =
      new RefundApprovalEntity();
    const refundRejectedDetailsData = new Array<RefundApprovalDetailsEntity>();

    for (const shopWiseData of shopWiseRefundDetails) {
      const refundApprovedApproval: RefundApprovalEntity =
        new RefundApprovalEntity();
      const refundApprovalDetailsData =
        new Array<RefundApprovalDetailsEntity>();

      for (const refundDetail of shopWiseData.refundDetails) {
        if (refundDetail.refundApprovedQuantity != 0) {
          const userSession: UserResponseDto =
            await this.requestService.userSession();
          refundApprovedApproval.createAt = new Date();
          refundApprovedApproval.createdBy = userSession.UserId;
          refundApprovedApproval.order = refundRequest.order;
          refundApprovedApproval.customer = refundRequest.customer;
          refundApprovedApproval.refundRequest = refundRequest;
          refundApprovedApproval.shop = refundDetail.product.shop;
          refundApprovedApproval.address = refundRequest.order.shippingAddress;
          refundApprovedApproval.isApproved = 1;
          refundApprovedApproval.assignStatus = AssignStatus.UnAssigned;
          let refundApprovalDetails = new RefundApprovalDetailsEntity();
          refundApprovalDetails.product = refundDetail.product;
          refundApprovalDetails.productAttributes =
            refundDetail.productAttribute;
          refundApprovalDetails.refundReason = refundDetail.refundReason;
          refundApprovalDetails.quantity = refundDetail.refundApprovedQuantity;
          refundApprovalDetails.createAt = new Date();
          refundApprovalDetailsData.push(refundApprovalDetails);
        }

        if (
          refundDetail.refundPickedQuantity -
            refundDetail.refundApprovedQuantity !=
          0
        ) {
          const userSession: UserResponseDto =
            await this.requestService.userSession();
          refundRejectedApproval.createAt = new Date();
          refundRejectedApproval.createdBy = userSession.UserId;
          refundRejectedApproval.order = refundRequest.order;
          refundRejectedApproval.customer = refundRequest.customer;
          refundRejectedApproval.refundRequest = refundRequest;
          // refundRejectedApproval.shop = refundDetail.product.shop;
          refundRejectedApproval.address = refundRequest.order.shippingAddress;
          refundRejectedApproval.isApproved = 0;
          refundRejectedApproval.assignStatus = AssignStatus.UnAssigned;
          let refundApprovalDetails = new RefundApprovalDetailsEntity();
          refundApprovalDetails.product = refundDetail.product;
          refundApprovalDetails.productAttributes =
            refundDetail.productAttribute;
          refundApprovalDetails.refundReason = refundDetail.refundReason;
          refundApprovalDetails.quantity =
            refundDetail.refundPickedQuantity -
            refundDetail.refundApprovedQuantity;
          refundApprovalDetails.createAt = new Date();
          refundRejectedDetailsData.push(refundApprovalDetails);
        }
      }

      if (refundApprovalDetailsData.length) {
        refundApprovedApproval.refundApprovalDetails =
          refundApprovalDetailsData;
        const updateData = await this.refundRequestApproval.save(
          refundApprovedApproval,
        );
      }
    }

    if (refundRejectedDetailsData.length) {
      refundRejectedApproval.refundApprovalDetails = refundRejectedDetailsData;
      const updateData = await this.refundRequestApproval.save(
        refundRejectedApproval,
      );
    }
  }

  async getShopInvoicesOfAnOrder(id: string): Promise<ShopInvoiceDto[]> {
    try {
      const query =
        this.shopInvoiceReposetory.createQueryBuilder('shop_invoce');
      query
        .leftJoinAndSelect(
          'shop_invoce.shopInvoiceDetails',
          'shopInvoiceDetails',
        )
        .leftJoinAndSelect(
          'shopInvoiceDetails.refundRequestDetail',
          'refundRequestDetail',
        )
        .leftJoinAndSelect('shop_invoce.shop', 'shops')
        .leftJoinAndSelect('shopInvoiceDetails.product', 'products')
        .leftJoinAndSelect(
          'shopInvoiceDetails.productAttribute',
          'productAttributes',
        );

      if (id) {
        query.innerJoinAndSelect(
          'shop_invoce.order',
          'order',
          'order.id = :id',
          {
            id,
          },
        );
      }

      query
        .leftJoinAndSelect(
          'shop_invoce.deliveryAssignment',
          'deliveryAssignment',
        )
        .andWhere('deliveryAssignment.status = :status', {
          status: ShippingStatus.DELIVERED,
        })
        .andWhere('refundRequestDetail.id is NULL');

      query.orderBy('shop_invoce.updatedAt', 'DESC');

      const shopInvoice = await query.getMany();
      return this.conversionService.toDtos<ShopInvoiceEntity, ShopInvoiceDto>(
        shopInvoice,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }
}
