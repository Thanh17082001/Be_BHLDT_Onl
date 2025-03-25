import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserUtil } from 'src/common/bryct/config.bryct';
import { School } from 'src/schools/entities/school.entity';
import { Grade } from 'src/grade/entities/grade.entity';
import { Subject } from 'src/subjects/entities/subject.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @InjectRepository(School) private schoolRepository: Repository<School>,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,

    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) {}
  async create(
    createUserDto: CreateUserDto
  ) {

    const { fullName, username, password, schoolId, gradeIds, subjectIds } = createUserDto;


    // Tìm trường học
    const school = await this.schoolRepository.findOne({ where: { id: schoolId } });
    if (!school) {
      throw new Error('School not found');
    }

    // Tìm danh sách lớp theo `classIds`
    const grades = await this.gradeRepository.findByIds(gradeIds);
    if (grades.length !== gradeIds.length) {
      throw new Error('Some classes not found');
    }

    // Tìm danh sách môn học theo `subjectIds`
    const subjects = await this.subjectRepository.findByIds(subjectIds);
    if (subjects.length !== subjectIds.length) {
      throw new Error('Some subjects not found');
    }


    const user = await this.repo.save({
      fullname: fullName,
      username,
      password: UserUtil.hashPassword(password),
      school,
      grades,
      subjects,
    });
    return user
  }

  async findAll(pageOptions: PageOptionsDto, query: Partial<User>): Promise<PageDto<User>> {
    const queryBuilder = this.repo.createQueryBuilder('user');
    const { page, limit, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'limit', 'skip', 'order', 'search']
    if (!!query && Object.keys(query).length > 0) {
      const arrayQuery: string[] = Object.keys(query);
      arrayQuery.forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: query[key] });
        }
      });
    }

    //search document
    if (search) {
      queryBuilder.andWhere(`LOWER(unaccent(user.name)) ILIKE LOWER(unaccent(:search))`, {
        search: `%${search}%`,
      });
    }


    queryBuilder.orderBy(`user.createdAt`, order)
      .skip(skip)
      .take(limit);

    const itemCount = await queryBuilder.getCount();
    const pageMetaDto = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });
    const { entities } = await queryBuilder.getRawAndEntities();

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(username: string): Promise<User> {
    console.log(username,'thienhahaha');
    const user = await this.repo.findOne({ where: { username }});
    if (!user) {
      throw new HttpException('Not found', 404);
    }
    return user;
  }

  

  async remove(id: number) {
    const user = this.repo.findOne({ where: { id } });
    if(!user){
      throw new NotFoundException('Không tìm thấy tài nguyên');
    }
    await this.repo.delete(id);
    return new ItemDto(await this.repo.delete(id));
  }
}
