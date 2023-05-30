import { plainToClass } from 'class-transformer';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AttributeDto,
  AttributeEntity,
  AttributeGroupEntity,
  ConversionService,
  CreateAttributeDto,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  SystemException,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class AttributeService implements GeneralService<AttributeDto> {
  constructor(
    @InjectRepository(AttributeEntity)
    private readonly attributeRepository: Repository<AttributeEntity>,
    @InjectRepository(AttributeGroupEntity)
    private readonly attributeGroupRepository: Repository<AttributeGroupEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
  ) {}

  async findAll(): Promise<AttributeDto[]> {
    try {
      const attributes = await this.attributeRepository.find({
        where: { ...isActive },
        relations: ['attributeGroup'],
      });
      //return this.plainToClass(AttributeEntity,AttributeDto)
      return this.conversionService.toDtos<AttributeEntity, AttributeDto>(
        attributes,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(dto: AttributeDto): Promise<AttributeDto[]> {
    try {
      const attributes = await this.attributeRepository.find({
        where: {
          ...dto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<AttributeEntity, AttributeDto>(
        attributes,
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
  ): Promise<[AttributeDto[], number]> {
    try {
      const attributes = await this.attributeRepository.findAndCount({
        where: { ...isActive, attributeGroup: id },

        skip: (page - 1) * limit,
        take: limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
      });

      return this.conversionService.toPagination<AttributeEntity, AttributeDto>(
        attributes,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByAttributeGroup(id: string): Promise<AttributeDto[]> {
    try {
      const attributeGroup = await this.getAttributeGroup(id);

      const attributeGroups = await this.attributeRepository.find({
        where: {
          attributeGroup,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<AttributeEntity, AttributeDto>(
        attributeGroups,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  creates = async (dto: CreateAttributeDto): Promise<AttributeDto[]> => {
    try {
      const attributes: AttributeEntity[] = [];
      const attributeGroup = await this.getAttributeGroup(dto.attributeGroupID);
      for (const attributeValue of dto.attributeValue) {
        const dtoToEntity = await this.conversionService.toEntity<
          AttributeEntity,
          AttributeDto
        >(dto);
        dtoToEntity.name = attributeValue.name;
        dtoToEntity.description = attributeValue.description;
        console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥', dtoToEntity);
        const attribute = this.attributeRepository.create(dtoToEntity);
        attribute.attributeGroup = attributeGroup;
        attributes.push(await this.attributeRepository.save(attribute));
      }

      return this.conversionService.toDtos<AttributeEntity, AttributeDto>(
        attributes,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  };

  create = async (dto: CreateAttributeDto): Promise<AttributeDto> => {
    try {
      const attributeGroup = await this.getAttributeGroup(dto.attributeGroupID);
      const attributeValue = dto.attributeValue[0];
      const dtoToEntity = await this.conversionService.toEntity<
        AttributeEntity,
        AttributeDto
      >(dto);

      dtoToEntity.name = attributeValue.name;
      dtoToEntity.description = attributeValue.description;
      console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥', dtoToEntity);
      const attributeCreate = this.attributeRepository.create(dtoToEntity);
      attributeCreate.attributeGroup = attributeGroup;
      const attribute = await this.attributeRepository.save(attributeCreate);
      return this.conversionService.toDto<AttributeEntity, AttributeDto>(
        attribute,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  };

  async update(id: string, dto: CreateAttributeDto): Promise<AttributeDto> {
    try {
      const attribute = await this.getAttribute(id);

      if (dto.attributeGroupID)
        attribute.attributeGroup = await this.getAttributeGroup(
          dto.attributeGroupID,
        );

      console.log('🔥🔥🔥🔥', attribute.attributeGroup);

      const dtoToEntity = await this.conversionService.toEntity<
        AttributeEntity,
        AttributeDto
      >({ ...attribute, ...dto });

      for (const attribute of dto.attributeValue) {
        dtoToEntity.name = attribute.name;
        dtoToEntity.description = attribute.description;
        dtoToEntity.attributeGroup.id = dto.attributeGroupID;
      }

      console.log('🔥🔥🔥🔥', dtoToEntity);

      const updatedAttribute = await this.attributeRepository.save(
        dtoToEntity,
        {
          reload: true,
        },
      );
      return this.conversionService.toDto<AttributeEntity, AttributeDto>(
        updatedAttribute,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<any> {
    try {
      const saveDto = await this.getAttribute(id);

      const deleted = await this.attributeRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string, relation = true): Promise<AttributeDto> {
    try {
      const attribute = await this.attributeRepository.findOne({
        where: {
          id,
          ...isActive,
        },
        relations: relation ? ['attributeGroup', 'productAttributes'] : [],
      });
      return this.conversionService.toDto<AttributeEntity, AttributeDto>(
        attribute,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** relations *************************/
  async getAttribute(id: string): Promise<AttributeEntity> {
    const attribute = await this.attributeRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(attribute, 'Attribute Not Found!!');
    return attribute;
  }

  async getAttributeGroup(id: string): Promise<AttributeGroupEntity> {
    const attributeGrp = await this.attributeGroupRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(attributeGrp, 'Attribute Group Not Found!!');
    return attributeGrp;
  }
}
