import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversionService,
  CreateShipmentDto,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  ShipmentDto,
  ShipmentEntity,
  ShipmentGroupEntity,
  SystemException,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class ShipmentService implements GeneralService<ShipmentDto> {
  constructor(
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepository: Repository<ShipmentEntity>,
    @InjectRepository(ShipmentGroupEntity)
    private readonly shipmentGroupRepository: Repository<ShipmentGroupEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
  ) {}

  async findAll(): Promise<ShipmentDto[]> {
    try {
      const shipments = await this.shipmentRepository.find({
        where: { ...isActive },
        relations: ['shipmentGroup'],
      });
      return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
        shipments,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(dto: ShipmentDto): Promise<ShipmentDto[]> {
    try {
      const shipments = await this.shipmentRepository.find({
        where: {
          ...dto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
        shipments,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
    id: string,
  ): Promise<[ShipmentDto[], number]> {
    try {
      const shipments = await this.shipmentRepository.findAndCount({
        where: { ...isActive, shipmentGroup: id },

        skip: (page - 1) * limit,
        take: limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
      });

      return this.conversionService.toPagination<ShipmentEntity, ShipmentDto>(
        shipments,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByShipmentGroup(id: string): Promise<ShipmentDto[]> {
    try {
      const shipmentGroup = await this.getShipmentGroup(id);

      const shipmentGroups = await this.shipmentRepository.find({
        where: {
          shipmentGroup,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
        shipmentGroups,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  creates = async (dto: CreateShipmentDto): Promise<ShipmentDto[]> => {
    try {
      const shipments: ShipmentEntity[] = [];
      const shipmentGroup = await this.getShipmentGroup(dto.shipmentGroupID);
      for (const shipmentValue of dto.shipmentValue) {
        const dtoToEntity = await this.conversionService.toEntity<
          ShipmentEntity,
          ShipmentDto
        >(dto);
        dtoToEntity.value = shipmentValue.value;
        dtoToEntity.price = shipmentValue.price;
        dtoToEntity.description = shipmentValue.description;
        console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥', dtoToEntity);
        const shipment = this.shipmentRepository.create(dtoToEntity);
        shipment.shipmentGroup = shipmentGroup;
        shipments.push(await this.shipmentRepository.save(shipment));
      }

      return this.conversionService.toDtos<ShipmentEntity, ShipmentDto>(
        shipments,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  };

  create = async (dto: CreateShipmentDto): Promise<ShipmentDto> => {
    return;
  };

  async update(id: string, dto: CreateShipmentDto): Promise<ShipmentDto> {
    try {
      const shipment = await this.getShipment(id);

      if (dto.shipmentGroupID)
        shipment.shipmentGroup = await this.getShipmentGroup(
          dto.shipmentGroupID,
        );

      console.log('🔥🔥🔥🔥', shipment.shipmentGroup);

      const dtoToEntity = await this.conversionService.toEntity<
        ShipmentEntity,
        ShipmentDto
      >({ ...shipment, ...dto });

      for (const shipment of dto.shipmentValue) {
        dtoToEntity.value = shipment.value;
        dtoToEntity.price = shipment.price;
        dtoToEntity.description = shipment.description;
        dtoToEntity.shipmentGroup.id = dto.shipmentGroupID;
      }

      console.log('🔥🔥🔥🔥', dtoToEntity);

      const updatedShipment = await this.shipmentRepository.save(dtoToEntity, {
        reload: true,
      });
      return this.conversionService.toDto<ShipmentEntity, ShipmentDto>(
        updatedShipment,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<any> {
    try {
      const saveDto = await this.getShipment(id);

      const deleted = await this.shipmentRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string, relation = true): Promise<ShipmentDto> {
    try {
      const shipment = await this.shipmentRepository.findOne({
        where: {
          id,
          ...isActive,
        },
        relations: relation ? ['shipmentGroup'] : [],
      });
      return this.conversionService.toDto<ShipmentEntity, ShipmentDto>(
        shipment,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** relations *************************/
  async getShipment(id: string): Promise<ShipmentEntity> {
    const shipment = await this.shipmentRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(shipment, 'ShipmentGrp Not Found!!');
    return shipment;
  }

  //  Get All Shipment Data
  async getAllShipment(): Promise<ShipmentEntity[]> {
    const shipment = await this.shipmentRepository.find({
      where: {
        ...isActive,
      },
    });
    return shipment;
  }

  async getShipmentGroup(id: string): Promise<ShipmentGroupEntity> {
    const shipmentGrp = await this.shipmentGroupRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(
      shipmentGrp,
      'ShipmentGrp Group Not Found!!',
    );
    return shipmentGrp;
  }
}
