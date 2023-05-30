import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversionService,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  ShipmentGroupDto,
  ShipmentGroupEntity,
  SystemException,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class ShipmentGroupService implements GeneralService<ShipmentGroupDto> {
  constructor(
    @InjectRepository(ShipmentGroupEntity)
    private readonly shipmentGroupRepository: Repository<ShipmentGroupEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
  ) {}

  async findAll(): Promise<ShipmentGroupDto[]> {
    try {
      const shipmentGroups = await this.shipmentGroupRepository.find({
        where: { ...isActive },
        relations: ['shipments'],
      });
      return this.conversionService.toDtos<
        ShipmentGroupEntity,
        ShipmentGroupDto
      >(shipmentGroups);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(dto: ShipmentGroupDto): Promise<ShipmentGroupDto[]> {
    try {
      const shipments = await this.shipmentGroupRepository.find({
        where: {
          ...dto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<
        ShipmentGroupEntity,
        ShipmentGroupDto
      >(shipments);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
  ): Promise<[ShipmentGroupDto[], number]> {
    try {
      const shipments = await this.shipmentGroupRepository.findAndCount({
        where: { ...isActive },
        skip: (page - 1) * limit,
        take: limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
      });

      return this.conversionService.toPagination<
        ShipmentGroupEntity,
        ShipmentGroupDto
      >(shipments);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async create(dto: ShipmentGroupDto): Promise<ShipmentGroupDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        ShipmentGroupEntity,
        ShipmentGroupDto
      >(dto);

      const product = await this.shipmentGroupRepository.create(dtoToEntity);
      await this.shipmentGroupRepository.save(product);

      return this.conversionService.toDto<
        ShipmentGroupEntity,
        ShipmentGroupDto
      >(product);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: ShipmentGroupDto): Promise<ShipmentGroupDto> {
    try {
      const shipmentGrp = await this.getShipmentGroup(id);

      const dtoToEntity = await this.conversionService.toEntity<
        ShipmentGroupEntity,
        ShipmentGroupDto
      >({ ...shipmentGrp, ...dto });

      const updatedDto = await this.shipmentGroupRepository.save(dtoToEntity, {
        reload: true,
      });
      return this.conversionService.toDto<
        ShipmentGroupEntity,
        ShipmentGroupDto
      >(updatedDto);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<any> {
    try {
      const saveDto = await this.getShipmentGroup(id);

      const deleted = await this.shipmentGroupRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string, relation = true): Promise<ShipmentGroupDto> {
    try {
      const shipmentGroup = await this.shipmentGroupRepository.findOne({
        where: {
          id,
          ...isActive,
        },
        relations: relation ? ['shipments'] : [],
      });
      return this.conversionService.toDto<
        ShipmentGroupEntity,
        ShipmentGroupDto
      >(shipmentGroup);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** relations ****************/
  async getShipmentGroup(id: string): Promise<ShipmentGroupEntity> {
    const shipmentGroup = await this.shipmentGroupRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(shipmentGroup, 'Feature Not Found!!');
    return shipmentGroup;
  }
}
