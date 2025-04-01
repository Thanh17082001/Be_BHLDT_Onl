import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
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
import { Class } from './entities/class.entity';
import { SchoolYear } from 'src/school-year/entities/school-year.entity';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Class) private repo: Repository<Class>,
    @InjectRepository(Grade) private repoGrade: Repository<Grade>,
    @InjectRepository(School) private repoSchool: Repository<School>,
    @InjectRepository(SchoolYear) private repoSchoolYear: Repository<SchoolYear>,
    private gradeService: GradeService,

  ) { }
  async create(createClassDto: CreateClassDto, user: User): Promise<Class> {
    createClassDto.schoolId = user.school.id;
    const school = await this.repoSchool.findOne({ where: { id: createClassDto.schoolId } });
    const schoolYear = await this.repoSchoolYear.findOne({ where: { id: createClassDto.schoolYearId } });
    const { name, gradeId } = createClassDto;
    if (await this.repo.findOne({ where: { name, school: { id: createClassDto.schoolId } } })) {
      throw new HttpException('Tên đã tồn tại', 409);
    }
    const grade: Grade = await this.repoGrade.findOne({ where: { id: gradeId } });
    if (!grade) {
      throw new HttpException('Lớp không tồn tại', 409);
    }
    const newClass = this.repo.create({ ...createClassDto, name: name, grade, createdBy: user.isAdmin ? null : user, school: school ?? null, schoolYear });
    return await this.repo.save(newClass);
  }

  async findAll(
    pageOptions: PageOptionsDto,
    query: Partial<Class>,
    user: User
  ): Promise<PageDto<Class>> {
    const queryBuilder = this.repo.createQueryBuilder('class')
      .leftJoinAndSelect('class.grade', 'grade')
      .leftJoinAndSelect('class.school', 'school') // Lấy thông tin trường
      .leftJoinAndSelect('class.schoolYear', 'schoolYear') // Lấy thông tin người tạo
      .leftJoinAndSelect('school.users', 'users'); // Lấy danh sách giáo viên phụ trách môn học

    const { page, take, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'take', 'skip', 'order', 'search'];

    // 🎯 Lọc theo điều kiện tìm kiếm (bỏ qua các tham số phân trang)
    if (!!query && Object.keys(query).length > 0) {
      Object.keys(query).forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`class.${key} = :${key}`, { [key]: query[key] });
        }
      });
    }

    // 🎯 Phân quyền dữ liệu
    if (user.role === Role.TEACHER) {
      queryBuilder.andWhere(
        '(users.id = :userId OR class.created_by = :userId OR class.created_by IS NULL) AND (school.id = :schoolId OR school.id IS NULL)',
        {
          userId: user.id,
          schoolId: user.school.id
        }
      );
    } else if (user.role === Role.PRINCIPAL) {
      queryBuilder.andWhere('(school.id = :schoolId OR school.id IS NULL)', {
        schoolId: user.school.id
      });
    }

    // 🎯 Tìm kiếm theo tên môn học (bỏ dấu)
    if (search) {
      queryBuilder.andWhere(`LOWER(unaccent("class".name)) ILIKE LOWER(unaccent(:search))`, {
        search: `%${search}%`,
      });
    }

    // 🎯 Phân trang và sắp xếp
    queryBuilder.orderBy('class.createdAt', order).skip(skip).take(take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    return new PageDto(entities, new PageMetaDto({ pageOptionsDto: pageOptions, itemCount }));
  }



  async findOne(id: number): Promise<ItemDto<Class>> {

    const example = await this.repo.findOne({ where: { id }, relations: ['grade', 'school', 'schoolYear'] });
    if (!example) {
      throw new HttpException('Not found', 404);
    }
    return new ItemDto(example);
  }

  async findOrCreateByNames(names: string[], gradeIds: number[], schoolId: number, user): Promise<number[]> {
    if (!gradeIds.length || !names.length) {
      return [];
    }

    // Lấy danh sách khối lớp hợp lệ
    const grades = await this.gradeService.findByIds(gradeIds);
    if (!grades.length) {
      throw new Error('Không tìm thấy khối lớp hợp lệ');
    }

    const school = await this.repoSchool.findOne({ where: { id: schoolId } });

    // Chuẩn hóa danh sách tên môn học theo `name + grade.name`
    const formattedNames = grades.flatMap(grade =>
      names.map(name => `${name} lớp ${grade.name}`)
    );


    // Lấy danh sách môn học đã tồn tại theo `name + grade.name`
    const existingClasss = await this.repo.find({
      where: formattedNames.map(fullName => ({
        name: fullName,
        school: { id: schoolId },
      })),
      relations: ['grade'],
      select: ['id', 'name', 'grade'],
    });

    // Tạo Map kiểm tra nhanh (key: `name + grade.name`)
    const existingMap = new Map(
      existingClasss.map(subject => [subject.name, subject.id])
    );


    // Tạo danh sách môn học mới nếu chưa có
    const newClasss = grades.flatMap(grade =>
      names
        .map(name => {
          const fullName = `${name} lớp ${grade.name}`;
          if (!existingMap.has(fullName)) {
            return this.repo.create({ name: fullName, grade, school, createdBy: user });
          }
          return null;
        })
        .filter(subject => subject !== null)
    );


    // Lưu môn học mới nếu có
    if (newClasss.length > 0) {
      const savedClasss = await this.repo.save(newClasss);
      return [...existingMap.values(), ...savedClasss.map(subject => subject.id)];
    }

    return [...existingMap.values()];
  }

  async update(id: number, updateClassDto: UpdateClassDto) {
    const { name, suffixes,gradeId,schoolYearId } = updateClassDto;
    const exampleExits: Class = await this.repo.findOne({ where: { name, id: Not(id) } });
    if (exampleExits) {
      throw new HttpException('Tên đã tồn tại', 409);
    }

    const example: Class = await this.repo.findOne({ where: { id } });

    if (!example) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }
    const grade: Grade = await this.repoGrade.findOne({ where: { id: updateClassDto.gradeId } });
    const schoolYear = await this.repoSchoolYear.findOne({ where: { id: schoolYearId } });

    if (!grade) {
      throw new HttpException('Lớp không tồn tại', 409);
    }
    Object.assign(example, { name, suffixes, grade, schoolYear })

    await this.repo.update(id, example)

    return new ItemDto(example);;
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
