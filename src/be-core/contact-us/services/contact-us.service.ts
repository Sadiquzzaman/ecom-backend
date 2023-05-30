import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ContactUsDto,
  ContactUsEntity,
  ContactUsPaginationSearchDto,
  ConversionService,
  DeleteDto,
  ExceptionService,
  GeneralService,
  isActive,
  isInActive,
  SystemException
} from '@simec/ecom-common';
import { Repository } from 'typeorm';

@Injectable()
export class ContactUsService implements GeneralService<ContactUsDto> {
  constructor(
    @InjectRepository(ContactUsEntity)
    private readonly contactUsRepository: Repository<ContactUsEntity>,
    private readonly conversionService: ConversionService,
    private readonly exceptionService: ExceptionService,
  ) {}

  async findAll(): Promise<ContactUsDto[]> {
    try {
      const allContactUs = await this.contactUsRepository.find({
        where: { ...isActive },
      });
      return this.conversionService.toDtos<ContactUsEntity, ContactUsDto>(
        allContactUs,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findByObject(contactUsDto: ContactUsDto): Promise<ContactUsDto[]> {
    try {
      const allContactUs = await this.contactUsRepository.find({
        where: {
          ...contactUsDto,
          ...isActive,
        },
      });
      return this.conversionService.toDtos<ContactUsEntity, ContactUsDto>(
        allContactUs,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async pagination(
    page: number,
    limit: number,
    sort: string,
    order: 'ASC' | 'DESC',
    contactUsSearchFilterDto: ContactUsPaginationSearchDto,
  ): Promise<[ContactUsDto[], number]> {
    try {
      // const allContactUs = await this.contactUsRepository.findAndCount({
      //   where: { ...isActive },
      //   skip: (page - 1) * limit,
      //   take: limit,
      //   order: {
      //     [sort !== 'undefined' ? sort : 'updatedAt']:
      //       sort !== 'undefined' ? order : 'DESC',
      //   },
      // });

      const query = await this.contactUsRepository
        .createQueryBuilder('contact')
        .select();

      if (contactUsSearchFilterDto.fromDate) {
        query.andWhere('DATE(contact.createAt) >=  :startDate', {
          startDate: contactUsSearchFilterDto.fromDate,
        });
      }

      if (contactUsSearchFilterDto.toDate) {
        query.andWhere('DATE(contact.createAt) <= :endDate', {
          endDate: contactUsSearchFilterDto.toDate,
        });
      }

      if (contactUsSearchFilterDto.phone) {
        query.andWhere('lower(contact.phone) like :phone', {
          phone: `%${contactUsSearchFilterDto.phone.toLowerCase()}%`,
        });
      }

      if (contactUsSearchFilterDto.email) {
        query.andWhere('lower(contact.email) like :email', {
          email: `%${contactUsSearchFilterDto.email.toLowerCase()}%`,
        });
      }

      sort === 'createdAt'
        ? (sort = 'contact.createdAt')
        : (sort = 'contact.updatedAt');

      query
        .orderBy(sort, order)
        .skip((page - 1) * limit)
        .take(limit);

      const allContactUs = await query.getManyAndCount();

      return this.conversionService.toPagination<ContactUsEntity, ContactUsDto>(
        allContactUs,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async create(dto: ContactUsDto): Promise<ContactUsDto> {
    try {
      const dtoToEntity = await this.conversionService.toEntity<
        ContactUsEntity,
        ContactUsDto
      >(dto);

      const contactUs = this.contactUsRepository.create(dtoToEntity);
      await this.contactUsRepository.save(contactUs);

      return this.conversionService.toDto<ContactUsEntity, ContactUsDto>(
        contactUs,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async update(id: string, dto: ContactUsDto): Promise<ContactUsDto> {
    try {
      const saveDto = await this.getContactUs(id);

      const dtoToEntity = await this.conversionService.toEntity<
        ContactUsEntity,
        ContactUsDto
      >({ ...saveDto, ...dto });

      const updatedContactUs = await this.contactUsRepository.save(
        dtoToEntity,
        {
          reload: true,
        },
      );
      return this.conversionService.toDto<ContactUsEntity, ContactUsDto>(
        updatedContactUs,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async remove(id: string): Promise<DeleteDto> {
    try {
      const saveDto = await this.getContactUs(id);

      const deleted = await this.contactUsRepository.save({
        ...saveDto,
        ...isInActive,
      });
      return Promise.resolve(new DeleteDto(!!deleted));
    } catch (error) {
      throw new SystemException(error);
    }
  }

  async findById(id: string): Promise<ContactUsDto> {
    try {
      const contactUs = await this.getContactUs(id);
      return this.conversionService.toDto<ContactUsEntity, ContactUsDto>(
        contactUs,
      );
    } catch (error) {
      throw new SystemException(error);
    }
  }

  /********************** Start checking relations of post ********************/

  async getContactUs(id: string): Promise<ContactUsEntity> {
    const contactUs = await this.contactUsRepository.findOne({
      where: {
        id,
        ...isActive,
      },
    });
    this.exceptionService.notFound(contactUs, 'ContactUs Not Found!!');
    return contactUs;
  }
  /*********************** End checking relations of post *********************/
}
