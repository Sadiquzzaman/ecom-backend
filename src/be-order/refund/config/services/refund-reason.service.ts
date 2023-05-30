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
  RefundReasonEntity,
  RefundReasonDto,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class RefundReasonService implements GeneralService<RefundReasonDto> {
  constructor(
    @InjectRepository(RefundReasonEntity)
    private readonly refundReasonRepository: Repository<RefundReasonEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
  ) {}

  async findAll(): Promise<RefundReasonDto[]> {
    try {
      const allBrands = await this.refundReasonRepository.find({
        where: { ...isActive },
      });
      return this.conversionService.toDtos<RefundReasonEntity, RefundReasonDto>(
        allBrands,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(
    refundReasonDto: RefundReasonDto,
  ): Promise<RefundReasonDto[]> {
    try {
      const allBrands = await this.refundReasonRepository.find({
        where: {
          ...refundReasonDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<RefundReasonEntity, RefundReasonDto>(
        allBrands,
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
  ): Promise<[RefundReasonDto[], number]> {
    try {
      const allBrands = await this.refundReasonRepository.findAndCount({
        where: { ...isActive },
        skip: (page - 1) * limit,
        take: limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
      });

      return this.conversionService.toPagination<
        RefundReasonEntity,
        RefundReasonDto
      >(allBrands);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async create(dto: RefundReasonDto): Promise<RefundReasonDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        RefundReasonEntity,
        RefundReasonDto
      >(dto);

      const brand = this.refundReasonRepository.create(dtoToEntity);
      await this.refundReasonRepository.save(brand);
      return this.conversionService.toDto<RefundReasonEntity, RefundReasonDto>(
        brand,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: RefundReasonDto): Promise<RefundReasonDto> {
    try {
      const saveDto = await this.getBrnad(id);

      const dtoToEntity = await this.conversionService.toEntity<
        RefundReasonEntity,
        RefundReasonDto
      >({ ...saveDto, ...dto });

      const updatedBrand = await this.refundReasonRepository.save(dtoToEntity, {
        reload: true,
      });
      return this.conversionService.toDto<RefundReasonEntity, RefundReasonDto>(
        updatedBrand,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getBrnad(id);

      const deleted = await this.refundReasonRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string): Promise<RefundReasonDto> {
    try {
      const brand = await this.getBrnad(id);
      return this.conversionService.toDto<RefundReasonEntity, RefundReasonDto>(
        brand,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/

  async getBrnad(id: string): Promise<RefundReasonEntity> {
    const brand = await this.refundReasonRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(brand, 'Brand Not Found!!');
    return brand;
  }
  /*********************** End checking relations of post *********************/
}
