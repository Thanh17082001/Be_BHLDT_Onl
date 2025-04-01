import { UpdateScoreDto } from './dto/update-score.dto';
import { CreateScoreDto } from './dto/create-score.dto';

import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { Grade } from 'src/grade/entities/grade.entity';
import { GradeService } from 'src/grade/grade.service';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/role/role.enum';
import { School } from 'src/schools/entities/school.entity';
import { Score } from './entities/score.entity';
import { Class } from 'src/class/entities/class.entity';
import { TypeScore } from 'src/type-score/entities/type-score.entity';
import { Subject } from 'src/subjects/entities/subject.entity';
import { SchoolYear } from 'src/school-year/entities/school-year.entity';
import { Student } from 'src/student/entities/student.entity';

@Injectable()
export class ScoreService {
  constructor(
    @InjectRepository(Score) private repo: Repository<Score>,
    @InjectRepository(Class) private repoClass: Repository<Class>,
    @InjectRepository(School) private repoSchool: Repository<School>,
    @InjectRepository(TypeScore) private repoTypeScore: Repository<TypeScore>,
    @InjectRepository(Subject) private repoSubject: Repository<Subject>,
    @InjectRepository(SchoolYear) private repoSchoolYear: Repository<SchoolYear>,
    @InjectRepository(Student) private repoStudent: Repository<Student>,

  ) { }
  async create(createScoreDto: CreateScoreDto, user: User): Promise<Score> {
    createScoreDto.schoolId = user.school.id;
    const { name, score, studentId, coefficient, schoolYearId, subjectId, classId, typeScoreId } = createScoreDto;

    const school = await this.repoSchool.findOne({ where: { id: createScoreDto.schoolId } });
   
    const student: Student = await this.repoStudent.findOne({ where: { id: +studentId } });
    const subject: Subject = await this.repoSubject.findOne({ where: { id: +subjectId } });
    const schoolYear: SchoolYear = await this.repoSchoolYear.findOne({ where: { id: +schoolYearId } });
    const class1: Class = await this.repoClass.findOne({ where: { id: +classId } });
    const typeScore: TypeScore = await this.repoTypeScore.findOne({ where: { id: +typeScoreId } });



    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (!schoolYear) {
      throw new NotFoundException('SchoolYear not found');
    }
    if (!student) {
      throw new NotFoundException('student not found');
    }

    if (student?.isChange) {
      throw new BadRequestException('Students have already move up in class');
    }

    if (!class1) {
      throw new NotFoundException('class not found');
    }

    if (!typeScore) {
      throw new NotFoundException('Type score not found');
    }
    const newSubject = this.repo.create(
      {
        name,
        score,
        coefficient,
        student,
        subject,
        schoolYear,
        class: class1,
        typeScore,
        createdBy: user.isAdmin ? null : user,
        school: school ?? null
      }
    );
    return await this.repo.save(newSubject);
  }

  async find(query: any) {
    const queryBuilder = this.repo.createQueryBuilder('score')
      // .leftJoinAndSelect('score.student', 'student')
      // .leftJoinAndSelect('score.subject', 'subject')
      // .leftJoinAndSelect('score.schoolYear', 'schoolYear')
      // .leftJoinAndSelect('score.class', 'class')
      .leftJoinAndSelect('score.typeScore', 'typeScore') 
    
    const pagination: string[] = ['page', 'take', 'skip', 'order', 'search'];

    // 🎯 Lọc theo điều kiện tìm kiếm (bỏ qua các tham số phân trang)
    if (!!query && Object.keys(query).length > 0) {
      Object.keys(query).forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`score.${key} = :${key}`, { [key]: query[key] });
        }
      });
    }



    // 🎯 Phân trang và sắp xếp

    const { entities } = await queryBuilder.getRawAndEntities();
    return entities
  }

  async findAll(
    pageOptions: PageOptionsDto,
    query: Partial<Score>,
    user: User
  ): Promise<PageDto<Score>> {
    const queryBuilder = this.repo.createQueryBuilder('score')
    .leftJoinAndSelect('score.student', 'student')
      .leftJoinAndSelect('score.subject', 'subject')
      .leftJoinAndSelect('score.schoolYear', 'schoolYear')
      .leftJoinAndSelect('score.class', 'class')
      .leftJoinAndSelect('score.typeScore', 'typeScore')
      .leftJoinAndSelect('score.school', 'school') // Lấy thông tin trường
      .leftJoinAndSelect('school.users', 'users'); // Lấy danh sách giáo viên phụ trách môn học

    const { page, take, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'take', 'skip', 'order', 'search'];

    // 🎯 Lọc theo điều kiện tìm kiếm (bỏ qua các tham số phân trang)
    if (!!query && Object.keys(query).length > 0) {
      Object.keys(query).forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`score.${key} = :${key}`, { [key]: query[key] });
        }
      });
    }

    // 🎯 Phân quyền dữ liệu
    if (user.role === Role.TEACHER) {

      queryBuilder.andWhere(
        '(users.id = :userId OR score.created_by = :userId OR score.created_by IS NULL) AND (school.id = :schoolId OR school.id IS NULL)',
        {
          userId: user.id,
          schoolId: user.school.id
        }
      )
    } else if (user.role === Role.PRINCIPAL) {
      queryBuilder.andWhere('(school.id = :schoolId OR school.id IS NULL)', {
        schoolId: user.school.id
      });
    }

    // 🎯 Tìm kiếm theo tên môn học (bỏ dấu)
    if (search) {
      queryBuilder.andWhere(`LOWER(unaccent("score".name)) ILIKE LOWER(unaccent(:search))`, {
        search: `%${search}%`,
      });
    }

    // 🎯 Phân trang và sắp xếp
    queryBuilder.orderBy('score.createdAt', order).skip(skip).take(take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    return new PageDto(entities, new PageMetaDto({ pageOptionsDto: pageOptions, itemCount }));
  }



  async findOne(id: number): Promise<ItemDto<Score>> {

    const example = await this.repo.findOne({ where: { id } });
    if (!example) {
      throw new HttpException('Not found', 404);
    }
    return new ItemDto(example);
  }

  

  async update(id: number, updateScoreDto: Partial<UpdateScoreDto>): Promise<Score> {
    const score: Score = await this.repo.findOne({ where: { id: +id } });
    const student: Student = await this.repoStudent.findOne({ where: { id: +updateScoreDto.studentId } });
    const subject: Subject = await this.repoSubject.findOne({ where: { id: +updateScoreDto.subjectId } });
    const schoolYear: SchoolYear = await this.repoSchoolYear.findOne({ where: { id: +updateScoreDto.schoolYearId } });
    const class1: Class = await this.repoClass.findOne({ where: { id: +updateScoreDto.classId } });
    const typeScore: TypeScore = await this.repoTypeScore.findOne({ where: { id: +updateScoreDto.typeScoreId } });



    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (!schoolYear) {
      throw new NotFoundException('SchoolYear not found');
    }
    if (!score) {
      throw new NotFoundException('Score not found');
    }
    if (!student) {
      throw new NotFoundException('student not found');
    }
    if (student?.isChange) {
      throw new BadRequestException('Students have already move up in class');
    }
    if (!class1) {
      throw new NotFoundException('class not found');
    }

    if (!typeScore) {
      throw new NotFoundException('Type score not found');
    }

    const data = this.repo.merge(
      score,
      updateScoreDto,
    );
    return await this.repo.save(data);
  }

  async remove(id: number) {
    const example = this.repo.findOne({ where: { id } });
    if (!example) {
      throw new NotFoundException('Không tìm thấy tài nguyên');
    }
    await this.repo.delete(id);
    return new ItemDto(await this.repo.delete(id));
  }
}
