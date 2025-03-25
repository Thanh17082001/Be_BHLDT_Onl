import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { Subject } from './entities/subject.entity';
import { Grade } from 'src/grade/entities/grade.entity';
import { GradeService } from 'src/grade/grade.service';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject) private repo: Repository<Subject>,
    @InjectRepository(Grade) private repoGrade: Repository<Grade>,
    private gradeService: GradeService,

  ) { }
  async create(createSubjectDto: CreateSubjectDto): Promise<Subject> {
    const { name,gradeId } = createSubjectDto;
    if (await this.repo.findOne({ where: { name } })) {
      throw new HttpException('Tên đã tồn tại', 409);
    }
    const grade:Grade = await this.repoGrade.findOne({ where: { id: gradeId } });
    if (!grade) {
      throw new HttpException('Lớp không tồn tại', 409);
    }
    const newSubject = this.repo.create({ ...createSubjectDto, name:`${name} ${grade.name}`, grade });
    return await this.repo.save(newSubject);
  }

  async findAll(pageOptions: PageOptionsDto, query: Partial<Subject>): Promise<PageDto<Subject>> {
    const queryBuilder = this.repo.createQueryBuilder('subject').leftJoinAndSelect('subject.grade', 'grade');;
    const { page, limit, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'limit', 'skip', 'order', 'search']
    if (!!query && Object.keys(query).length > 0) {
      const arrayQuery: string[] = Object.keys(query);
      arrayQuery.forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`subject.${key} = :${key}`, { [key]: query[key] });
        }
      });
    }

    //search document
    if (search) {
      queryBuilder.andWhere(`LOWER(unaccent("subject".name)) ILIKE LOWER(unaccent(:search))`, {
        search: `%${search}%`,
      });
    }


    queryBuilder.orderBy(`subject.createdAt`, order)
      .skip(skip)
      .take(limit);

    const itemCount = await queryBuilder.getCount();
    const pageMetaDto = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });
    const { entities } = await queryBuilder.getRawAndEntities();

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(id: number): Promise<ItemDto<Subject>> {

    const example = await this.repo.findOne({ where: { id } });
    if (!example) {
      throw new HttpException('Not found', 404);
    }
    return new ItemDto(example);
  }

  async findOrCreateByNames(names: string[], gradeIds: number[]): Promise<number[]> {
    if (!gradeIds.length || !names.length) {
      return [];
    }

    // Lấy danh sách khối lớp hợp lệ
    const grades = await this.gradeService.findByIds(gradeIds);
    if (!grades.length) {
      throw new Error('Không tìm thấy khối lớp hợp lệ');
    }

    // Chuẩn hóa danh sách tên môn học theo `name + grade.name`
    const formattedNames = grades.flatMap(grade =>
      names.map(name => `${name} lớp ${grade.name}`)
    );


    // Lấy danh sách môn học đã tồn tại theo `name + grade.name`
    const existingSubjects = await this.repo.find({
      where: formattedNames.map(fullName => ({
        name: fullName,
      })),
      relations: ['grade'],
      select: ['id', 'name', 'grade'],
    });

    // Tạo Map kiểm tra nhanh (key: `name + grade.name`)
    const existingMap = new Map(
      existingSubjects.map(subject => [subject.name, subject.id])
    );


    // Tạo danh sách môn học mới nếu chưa có
    const newSubjects = grades.flatMap(grade =>
      names
        .map(name => {
          const fullName = `${name} lớp ${grade.name}`;
          if (!existingMap.has(fullName)) {
            return this.repo.create({ name: fullName, grade });
          }
          return null;
        })
        .filter(subject => subject !== null)
    );

    console.log(newSubjects, '❌ Môn học chưa tồn tại');

    // Lưu môn học mới nếu có
    if (newSubjects.length > 0) {
      const savedSubjects = await this.repo.save(newSubjects);
      return [...existingMap.values(), ...savedSubjects.map(subject => subject.id)];
    }

    return [...existingMap.values()];
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto) {
    const { name } = updateSubjectDto;
    const exampleExits: Subject = await this.repo.findOne({ where: { name, id: Not(id) } });
    if (exampleExits) {
      throw new HttpException('Tên đã tồn tại', 409);
    }

    const example: Subject = await this.repo.findOne({ where: { id } });

    if (!example) {
      throw new NotFoundException(`Subject with ID ${id} not found`);
    }

    Object.assign(example, updateSubjectDto)

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
