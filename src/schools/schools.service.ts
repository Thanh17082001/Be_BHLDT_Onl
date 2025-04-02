import { GradeInSchoolType } from './../common/constant/type-school';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { School, SchoolType } from './entities/school.entity';
import { Grade } from 'src/grade/entities/grade.entity';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/role/role.enum';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School) private repo: Repository<School>,
    @InjectRepository(Grade) private gradeRepo: Repository<Grade>,
  ) {}
  async create(createSchoolDto: CreateSchoolDto, user:User): Promise<School> {
    const { name, schoolType } = createSchoolDto;
    
    let grades: Grade[] = [];
    const nameGrades = GradeInSchoolType[schoolType];
    for (let i = 0; i < nameGrades.length; i++){
      let grade = await this.gradeRepo.findOne({ where: { name: nameGrades[i] } });
      if (!grade) {
        grade = this.gradeRepo.create({ name: nameGrades[i] });
        await this.gradeRepo.save(grade);
      }
      grades.push(grade);
    }
     
    if (await this.repo.findOne({where:{name, schoolType} })) {
      throw new HttpException('Trường đã tồn tại',409);
    }
    const newUser = await this.repo.create({...createSchoolDto, grades, createdBy:user});
    return await this.repo.save(newUser);
  }

  async findAll(pageOptions: PageOptionsDto, query: Partial<School>, user:User): Promise<PageDto<School>> {
    const queryBuilder = this.repo.createQueryBuilder('school').leftJoinAndSelect('school.grades', 'grade');;
    const { page, take, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'take', 'skip', 'order', 'search']
    if (!!query && Object.keys(query).length > 0) {
      const arrayQuery: string[] = Object.keys(query);
      arrayQuery.forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`school.${key} = :${key}`, { [key]: query[key] });
        }
      });
    }

    // 🟢 Nếu không phải admin, chỉ lấy trường của user
    if (user.role !== Role.ADMIN) {
      queryBuilder.andWhere('school.id = :schoolId', { schoolId: user.school.id });
    }

    //search document
    if (search) {
      queryBuilder.andWhere(`LOWER(unaccent(School.name)) ILIKE LOWER(unaccent(:search))`, {
        search: `%${search}%`,
      });
    }


    queryBuilder.orderBy(`school.createdAt`, order)
      .skip(skip)
      .take(take);

    const itemCount = await queryBuilder.getCount();
    const pageMetaDto = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });
    const { entities } = await queryBuilder.getRawAndEntities();

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(id: number): Promise<ItemDto<School>> {

    const School = await this.repo.findOne({where:{id}});
    if (!School) {
      throw new HttpException('Not found', 404);
    }
    return new ItemDto(School);
  }

  async findByTypeSchoolIsAdmin(schoolType: string): Promise<School> {

    const School = await this.repo.findOne({ where: { schoolType, isAdmin:true } });
    if (!School) {
      throw new HttpException('Not found', 404);
    }
    return School;
  }

  async findOrCreateByName(name: string, typeSchool: string): Promise<number> {
    let school = await this.repo.findOne({
      where: { name: name, schoolType: typeSchool },
      select: ['id'],
    });


    if (!school) {

      const nameGrades = GradeInSchoolType[typeSchool];
      let grades: Grade[] = [];
      for (let i = 0; i < nameGrades.length; i++) {
        let grade = await this.gradeRepo.findOne({ where: { name: nameGrades[i] } });
        if (!grade) {
          grade = this.gradeRepo.create({ name: nameGrades[i] });
          await this.gradeRepo.save(grade);
        }
        grades.push(grade);
      }
      // Tạo mới nếu không tìm thấy
      school = this.repo.create({ name: name, schoolType: typeSchool });
      await this.repo.save(school);
    }

    return school.id; // Trả về id của trường đã tìm thấy hoặc mới tạo
  }

  findAlltype(): ItemDto<SchoolType> {
    return new ItemDto(Object.assign(SchoolType));
  }

  async update(id: number, updateSchoolDto: UpdateSchoolDto) {
    const { name } = updateSchoolDto;
    const SchoolExits:School = await this.repo.findOne({where:{name,id: Not(id)}});
    if (SchoolExits){
      throw new HttpException('Tên đã tồn tại',409);
    }

    const School:School = await this.repo.findOne({ where: { id } });

    if (!School) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }



    Object.assign(School, updateSchoolDto)

    await this.repo.update(id, School)

    return new ItemDto(School);;
  }

  async remove(id: number) {
    const School = this.repo.findOne({ where: { id } });
    if(!School){
      throw new NotFoundException('Không tìm thấy tài nguyên');
    }
    await this.repo.delete(id);
    return new ItemDto(await this.repo.delete(id));
  }
}
