import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

import { HttpException, Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { Grade } from './entities/grade.entity';
import { User } from 'src/users/entities/user.entity';
import { SchoolType } from 'src/schools/entities/school.entity';

@Injectable()
export class GradeService {
  constructor(
    @InjectRepository(Grade) private repo: Repository<Grade>,
  ) { }
  async create(createGradeDto: CreateGradeDto): Promise<Grade> {
    const { name } = createGradeDto;
    if (await this.repo.findOne({ where: { name } })) {
      throw new HttpException('Tên đã tồn tại', 409);
    }
    const newUser = this.repo.create({ name   });
    return await this.repo.save(newUser);
  }

  async findAll(pageOptions: PageOptionsDto, query: Partial<Grade>, user:User): Promise<PageDto<Grade>> {
    const queryBuilder = this.repo.createQueryBuilder('grade').leftJoinAndSelect('grade.school', 'school');;
    const { page, take, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'take', 'skip', 'order', 'search']
    if (!!query && Object.keys(query).length > 0) {
      const arrayQuery: string[] = Object.keys(query);
      arrayQuery.forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`grade.${key} = :${key}`, { [key]: query[key] });
        }
      });
    }

    if (!user?.isAdmin) {
      // Nếu user thuộc trường tiểu học, chỉ lấy lớp từ 1 đến 5
      if (user.school.schoolType === SchoolType['Tiểu học']) {
        queryBuilder.andWhere(`grade.name BETWEEN :min AND :max`, {
          min: '1',
          max: '5',
        });
      }

      else if (user.school.schoolType === SchoolType['THCS']) {
        queryBuilder.andWhere(`grade.name BETWEEN :min AND :max`, {
          min: '6',
          max: '9',
        });
      }

      else if (user.school.schoolType === SchoolType['THPT']) {
        queryBuilder.andWhere(`grade.name BETWEEN :min AND :max`, {
          min: '10',
          max: '12',
        });
      }

      else if (user.school.schoolType === SchoolType['TH&THCS']) {
        queryBuilder.andWhere(`grade.name BETWEEN :min AND :max`, {
          min: '1',
          max: '9',
        });
      }

      else if (user.school.schoolType === SchoolType['THCS&THPT']) {
        queryBuilder.andWhere(`grade.name BETWEEN :min AND :max`, {
          min: '6',
          max: '12',
        });
      }
    }

    //search document
    if (search) {
      queryBuilder.andWhere(`LOWER(unaccent(grade.name)) ILIKE LOWER(unaccent(:search))`, {
        search: `%${search}%`,
      });
    }


    queryBuilder.orderBy(`grade.createdAt`, order)
      .skip(skip)
      .take(take);

    const itemCount = await queryBuilder.getCount();
    const pageMetaDto = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });
    const { entities } = await queryBuilder.getRawAndEntities();

    console.log(entities);

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(id: number): Promise<ItemDto<Grade>> {

    const example = await this.repo.findOne({ where: { id } });
    if (!example) {
      throw new HttpException('Not found', 404);
    }
    return new ItemDto(example);
  }

  async findOrCreateByNames(names: string[], schoolId: number): Promise<number[]> {
    
    // Lấy danh sách các khối 
    const existingGrades = await this.repo.find({
      where: {
        name: In(names),
      },
      select: ['id', 'name'],
    });



    // Tạo Map để kiểm tra trùng lặp nhanh hơn
    const existingMap = new Map(existingGrades.map(grade => [grade.name, grade.id]));

    // Lọc ra những khối chưa tồn tại theo tên (không phân biệt hoa thường)
    const newNames = names.filter(name => !existingMap.has(name));




    let newIds: number[] = [];
    if (newNames.length > 0) {
      // Tạo khối mới
      console.log('đây');
      const newGrades = newNames.map(name => this.repo.create({
        name,
      }));

      const savedGrades = await this.repo.save(newGrades);

      // Thêm ID của khối mới vào danh sách trả về
      newIds = savedGrades.map(grade => grade.id);
    }

    // Trả về danh sách ID của tất cả khối đã có và mới tạo
    return [...Array.from(existingMap.values()), ...newIds];
  }

  async findByIds(gradeIds: number[]): Promise<Grade[]> {
    return this.repo.find({ where: { id: In(gradeIds) } });
  }

  async update(id: number, updateGradeDto: UpdateGradeDto) {
    const { name } = updateGradeDto;
    const exampleExits: Grade = await this.repo.findOne({ where: { name, id: Not(id) } });
    if (exampleExits) {
      throw new HttpException('Tên đã tồn tại', 409);
    }

    const example: Grade = await this.repo.findOne({ where: { id } });

    if (!example) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    Object.assign(example, updateGradeDto)

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

