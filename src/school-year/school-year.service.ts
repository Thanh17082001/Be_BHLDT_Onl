import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { SchoolYear } from './entities/school-year.entity';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { User } from 'src/users/entities/user.entity';
import { School } from 'src/schools/entities/school.entity';
import { Role } from 'src/role/role.enum';

@Injectable()
export class SchoolYearService {
  constructor(
    @InjectRepository(SchoolYear) private repo: Repository<SchoolYear>,
    @InjectRepository(School) private repoSchool: Repository<School>,
  ) {}
  async create(createSchoolYearDto: CreateSchoolYearDto, user: User): Promise<SchoolYear> {
    createSchoolYearDto.schoolId = user.school.id;
    const school = await this.repoSchool.findOne({ where: { id: createSchoolYearDto.schoolId } });
    let { name, endYear, startYear } = createSchoolYearDto;
    if (!name) {
      name = `${startYear} - ${endYear}`;
    }
    if (endYear < startYear) {
      throw new BadRequestException('Năm học không hợp lệ');
    }
    if (await this.repo.findOne({where:{name, school: { id: createSchoolYearDto.schoolId }} })) {
      throw new HttpException('Tên đã tồn tại',409);
    }
    const newUser = this.repo.create({ startYear,endYear ,name , createdBy: user, school: school ?? null });
    return await this.repo.save(newUser);
  }

  async findAll(pageOptions: PageOptionsDto, query: Partial<SchoolYear>, user:User): Promise<PageDto<SchoolYear>> {
    const queryBuilder = this.repo.createQueryBuilder('school-year').leftJoinAndSelect('school-year.school', 'school').leftJoinAndSelect('school-year.createdBy', 'users');;
    const { page, take, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'take', 'skip', 'order', 'search']
    if (!!query && Object.keys(query).length > 0) {
      const arrayQuery: string[] = Object.keys(query);
      arrayQuery.forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`school-year.${key} = :${key}`, { [key]: query[key] });
        }
      });
    }

    // 🎯 Phân quyền dữ liệu
        if (user.role === Role.TEACHER) {
          console.log('đaa');
          // Giáo viên lấy các môn thuộc trường của họ + các môn họ phụ trách
          queryBuilder.andWhere('(users.id = :userId)', {
            userId: user.id
          });
        } else if (user.role === Role.PRINCIPAL) {
          // Hiệu trưởng lấy các môn của trường họ quản lý
          queryBuilder.andWhere('school.id = :schoolId', { schoolId: user.school.id });
        }

    //search document
    if (search) {
      queryBuilder.andWhere(`LOWER(unaccent(school-year.name)) ILIKE LOWER(unaccent(:search))`, {
        search: `%${search}%`,
      });
    }


    queryBuilder.orderBy(`school-year.createdAt`, order)
      .skip(skip)
      .take(take);

    const itemCount = await queryBuilder.getCount();
    const pageMetaDto = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });
    const { entities } = await queryBuilder.getRawAndEntities();

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(id: number): Promise<ItemDto<SchoolYear>> {

    const schoolyear = await this.repo.findOne({where:{id}});
    if (!schoolyear) {
      throw new HttpException('Not found', 404);
    }
    return new ItemDto(schoolyear);
  }

  async update(id: number, updateSchoolYearDto: UpdateSchoolYearDto) {
    const { name } = updateSchoolYearDto;
    const schoolyearExits:SchoolYear = await this.repo.findOne({where:{name,id: Not(id)}});
    if (schoolyearExits){
      throw new HttpException('Tên đã tồn tại',409);
    }

    const schoolyear:SchoolYear = await this.repo.findOne({ where: { id } });

    if (!schoolyear) {
      throw new NotFoundException(`SchoolYear with ID ${id} not found`);
    }

    if (updateSchoolYearDto.endYear < updateSchoolYearDto.startYear) {
      throw new BadRequestException('Năm học không hợp lệ');
    }
    await this.repo.update(id, {startYear:updateSchoolYearDto.startYear,endYear:updateSchoolYearDto.endYear,name:name})

    return new ItemDto(schoolyear);;
  }

  async remove(id: number) {
    const schoolyear = this.repo.findOne({ where: { id } });
    if(!schoolyear){
      throw new NotFoundException('Không tìm thấy tài nguyên');
    }
    await this.repo.delete(id);
    return new ItemDto(await this.repo.delete(id));
  }
}
