import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversionService,
  DateRangeParamDto,
  isActive,
  PromotionSlotDto,
  PromotionsSlotEntity,
  SystemException
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class PromotionsSlotService {
  constructor(
    @InjectRepository(PromotionsSlotEntity)
    private readonly promoSlotRepository: Repository<PromotionsSlotEntity>,
    private readonly conversionService: ConversionService,
  ) {}

  async create(dto: PromotionSlotDto): Promise<PromotionSlotDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        PromotionsSlotEntity,
        PromotionSlotDto
      >(dto);
      const data = this.promoSlotRepository.create(dtoToEntity);
      const saveData = await this.promoSlotRepository.save(data);
      return this.conversionService.toDto<
        PromotionsSlotEntity,
        PromotionSlotDto
      >(saveData);
    } catch (error) {
      throw new SystemException(error);
    }
  }
  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: 'ASC' | 'DESC',
    dateRange: DateRangeParamDto,
  ): Promise<[PromotionSlotDto[], number]> {
    try {
      const query = this.promoSlotRepository
        .createQueryBuilder('q')
        .select()
        .where('q.isActive = :isActive', { ...isActive });

      sort === 'createdAt' ? (sort = 'q.createdAt') : (sort = 'q.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);

      const slotData = await query.getManyAndCount();
      return this.conversionService.toPagination<
        PromotionsSlotEntity,
        PromotionSlotDto
      >(slotData);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: PromotionSlotDto): Promise<PromotionSlotDto> {
    try {
      const data = await this.promoSlotRepository.findOne(id);
      const updatedData = Object.assign(data, dto);
      const saveUpdate = await this.promoSlotRepository.save(updatedData);
      return this.conversionService.toDto<
        PromotionsSlotEntity,
        PromotionSlotDto
      >(saveUpdate);
    } catch (error) {
      throw new SystemException(error);
    }
  }
}
