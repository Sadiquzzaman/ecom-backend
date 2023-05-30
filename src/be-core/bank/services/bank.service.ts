import { Injectable, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BankDto,
  BankEntity,
  ConversionService,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  RequestService,
  SystemException,
  UserResponseDto,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class BankService implements GeneralService<BankDto> {
  constructor(
    @InjectRepository(BankEntity)
    private readonly bankRepository: Repository<BankEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
    private readonly requestService: RequestService,
  ) {}

  async findAll(): Promise<BankDto[]> {
    try {
      const allBanks = await this.bankRepository.find({
        where: { ...isActive },
      });
      return this.conversionService.toDtos<BankEntity, BankDto>(allBanks);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findAllBankForMerchant(): Promise<BankDto[]> {
    try {
      const userSession: UserResponseDto =
        await this.requestService.userSession();

      const query = await this.bankRepository.createQueryBuilder('banks');
      query
        .where({ ...isActive })
        .leftJoinAndSelect('banks.bankDetails', 'bankDetails')
        .leftJoinAndSelect('bankDetails.merchant', 'merchant')
        .andWhere('merchant.id = :id', { id: userSession.MerchantId });

      const allBanks = await query.getMany();
      return this.conversionService.toDtos<BankEntity, BankDto>(allBanks);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(bankDto: BankDto): Promise<BankDto[]> {
    try {
      const allBanks = await this.bankRepository.find({
        where: {
          ...bankDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<BankEntity, BankDto>(allBanks);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: string,
  ): Promise<[BankDto[], number]> {
    try {
      const query = await this.bankRepository.createQueryBuilder('banks');

      query
        .where({ ...isActive })
        .orderBy('banks.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [allBank, count] = await query.getManyAndCount();

      const allBanks = await this.conversionService.toDtos<BankEntity, BankDto>(
        allBank,
      );
      return [allBanks, count];
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async create(dto: BankDto): Promise<BankDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        BankEntity,
        BankDto
      >(dto);

      const bank = this.bankRepository.create(dtoToEntity);
      await this.bankRepository.save(bank);
      return this.conversionService.toDto<BankEntity, BankDto>(bank);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: BankDto): Promise<BankDto> {
    try {
      const saveDto = await this.getBrnad(id);

      const dtoToEntity = await this.conversionService.toEntity<
        BankEntity,
        BankDto
      >({ ...saveDto, ...dto });

      const updatedBank = await this.bankRepository.save(dtoToEntity, {
        reload: true,
      });
      return this.conversionService.toDto<BankEntity, BankDto>(updatedBank);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getBrnad(id);

      const deleted = await this.bankRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string): Promise<BankDto> {
    try {
      const bank = await this.getBrnad(id);
      return this.conversionService.toDto<BankEntity, BankDto>(bank);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/

  async getBrnad(id: string): Promise<BankEntity> {
    const bank = await this.bankRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(bank, 'Bank Not Found!!');
    return bank;
  }
  /*********************** End checking relations of post *********************/
}
