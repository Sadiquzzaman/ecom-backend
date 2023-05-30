import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversionService,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  StaticPageDto,
  StaticPageEntity,
  SystemException,
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class StaticPageService implements GeneralService<StaticPageDto> {
  constructor(
    @InjectRepository(StaticPageEntity)
    private readonly staticPageRepository: Repository<StaticPageEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
  ) {}

  async findAll(): Promise<StaticPageDto[]> {
    try {
      const allConfigurations = await this.staticPageRepository.find({
        where: { ...isActive },
      });
      return this.conversionService.toDtos<StaticPageEntity, StaticPageDto>(
        allConfigurations,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(
    configurationDto: StaticPageDto,
  ): Promise<StaticPageDto[]> {
    try {
      const allConfigurations = await this.staticPageRepository.find({
        where: {
          ...configurationDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<StaticPageEntity, StaticPageDto>(
        allConfigurations,
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
  ): Promise<[StaticPageDto[], number]> {
    try {
      const allConfigurations = await this.staticPageRepository.findAndCount({
        where: { ...isActive },
        skip: (page - 1) * limit,
        take: limit,
        order: {
          [sort !== 'undefined' ? sort : 'updatedAt']:
            sort !== 'undefined' ? order : 'DESC',
        },
      });

      return this.conversionService.toPagination<
        StaticPageEntity,
        StaticPageDto
      >(allConfigurations);
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async create(dto: StaticPageDto): Promise<StaticPageDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        StaticPageEntity,
        StaticPageDto
      >(dto);

      const configuration = this.staticPageRepository.create(dtoToEntity);
      await this.staticPageRepository.save(configuration);
      return this.conversionService.toDto<StaticPageEntity, StaticPageDto>(
        configuration,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: StaticPageDto): Promise<StaticPageDto> {
    try {
      const saveDto = await this.getConfiguration(id);

      const dtoToEntity = await this.conversionService.toEntity<
        StaticPageEntity,
        StaticPageDto
      >({ ...saveDto, ...dto });

      const updatedConfiguration = await this.staticPageRepository.save(
        dtoToEntity,
        {
          reload: true,
        },
      );
      return this.conversionService.toDto<StaticPageEntity, StaticPageDto>(
        updatedConfiguration,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getConfiguration(id);

      const deleted = await this.staticPageRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(page: string): Promise<StaticPageDto> {
    try {
      const configuration = await this.getConfiguration(page);
      return this.conversionService.toDto<StaticPageEntity, StaticPageDto>(
        configuration,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/

  async findByPageName(id): Promise<StaticPageDto> {
    const configuration = await this.staticPageRepository.findOne({
      // where: {
      //   ...isActive,
      //   name:
      //     page == 'terms'
      //       ? 'Terms and Conditions'
      //       : page == 'about'
      //       ? 'About Us'
      //       : page == 'privacy'
      //       ? 'Privacy and Confidentiality'
      //       : 'Return and Refund Policy',
      // },
      where: {
        ...isActive,
        id: id,
      },
    });
    this.exceptionService.notFound(
      configuration,
      'sefsdef',
      // page == 'terms'
      //   ? 'Terms and Conditions Not Found!!'
      //   : page == 'about'
      //   ? 'About Us Not Found!!'
      //   : page == 'privacy'
      //   ? 'Privacy and Confidentiality Not Found!!'
      //   : 'Return and Refund Policy Not Found!!',
    );
    return configuration;
  }

  async getConfiguration(id: string): Promise<StaticPageEntity> {
    const configuration = await this.staticPageRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(configuration, 'Configuration Not Found!!');
    return configuration;
  }

  async findTermsAndConditionByTitle(): Promise<StaticPageDto> {
    const configuration = await this.staticPageRepository.findOne({
      where: {
        ...isActive,
        name: 'Terms and Conditions',
      },
    });
    console.log(configuration);
    this.exceptionService.notFound(
      configuration,
      'Terms and Conditions Not Found!!',
    );
    return configuration;
  }

  async findPrivacyPolicyByTitle(): Promise<StaticPageDto> {
    const configuration = await this.staticPageRepository.findOne({
      where: {
        ...isActive,
        name: 'Privacy and Confidentiality',
      },
    });
    console.log(configuration);
    this.exceptionService.notFound(
      configuration,
      'Privacy and Confidentiality Not Found!!',
    );
    return configuration;
  }

  async findReturnAndRefundbyTitle(): Promise<StaticPageDto> {
    const configuration = await this.staticPageRepository.findOne({
      where: {
        ...isActive,
        name: 'Return and Refund Policy',
      },
    });
    this.exceptionService.notFound(
      configuration,
      'Return and Refund Policy Not Found!!',
    );
    return configuration;
  }

  async findAboutUs(): Promise<StaticPageDto> {
    const configuration = await this.staticPageRepository.findOne({
      where: {
        ...isActive,
        name: 'About Us',
      },
    });
    this.exceptionService.notFound(configuration, 'About Us Not Found!!');
    return configuration;
  }
  /*********************** End checking relations of post *********************/
}
