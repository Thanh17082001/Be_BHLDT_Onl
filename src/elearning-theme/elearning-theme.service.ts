import { CreateElearningThemeDto } from './dto/create-elearning-theme.dto';
import { UpdateElearningThemeDto } from './dto/update-elearning-theme.dto';

import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/role/role.enum';
import { School } from 'src/schools/entities/school.entity';
import { schoolTypes } from 'src/common/constant/type-school-query';

import * as path from 'path';
import { existsSync, statSync, unlinkSync, promises as fs } from 'fs';
import { ElearningTheme } from './entities/elearning-theme.entity';

@Injectable()
export class ElearningThemeService {
  constructor(
    @InjectRepository(ElearningTheme) private repo: Repository<ElearningTheme>,
    @InjectRepository(School) private repoSchool: Repository<School>,
  ) { }
  async create(
    createElearningThemeDto: CreateElearningThemeDto,
    user: User,
  ): Promise<ElearningTheme> {
    const { title,content,path, } = createElearningThemeDto;

    createElearningThemeDto.schoolId = user?.school?.id;
    const school = await this.repoSchool.findOne({
      where: { id: createElearningThemeDto.schoolId },
    });
   
    const newElearningTheme = this.repo.create({
      title, 
      content,
      path,
      createdBy: user,
      school: school,
    });
    return await this.repo.save(newElearningTheme);
  }

  async findAll(
    pageOptions: PageOptionsDto,
    query: Partial<ElearningTheme>,
    user: User,
  ): Promise<PageDto<ElearningTheme>> {
    const queryBuilder = this.repo
      .createQueryBuilder('elearningTheme')
      .leftJoinAndSelect('elearningTheme.school', 'school') // Lấy thông tin trường
      .leftJoinAndSelect('school.users', 'users')
      .leftJoinAndSelect('elearningTheme.createdBy', 'createdBy'); // Lấy danh sách giáo viên phụ trách môn học

    const { page, take, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'take', 'skip', 'order', 'search'];
    console.log(query, 'query');
    if (user) {
      const schoolTypesQuery = schoolTypes(user);
      queryBuilder.andWhere(
        new Brackets((qb) => {
          if (user.role === Role.TEACHER) {
            console.log('sssss');
            qb.where('elearningTheme.createdBy = :userId', { userId: user.id }) // bản ghi do giáo viên tạo
              .orWhere(
                new Brackets((subQb) => {
                  subQb.where('school.isAdmin = :isAdmin', { isAdmin: true })
                    .andWhere('school.schoolType IN (:...schoolTypes)', {
                      schoolTypes: schoolTypesQuery,
                    });
                }),
              );
          } else if (user.role === Role.PRINCIPAL) {
            qb.where('school.id = :schoolId', { schoolId: user.school.id })
              .orWhere(
                '(school.isAdmin = :isAdmin AND school.schoolType IN (:...schoolTypesQuery))',
                {
                  isAdmin: true,
                  schoolTypesQuery,
                },
              );
          } else if (user.role === Role.ADMIN) {
            console.log('đến đâyy r');
            qb.where('school.schoolType IN (:...schoolTypes)', {
              schoolTypes: schoolTypesQuery,
            });
          }
        }),
      );

    }


    // 🎯 Lọc theo điều kiện tìm kiếm (bỏ qua các tham số phân trang)
    if (!!query && Object.keys(query).length > 0) {
      Object.keys(query).forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`elearningTheme.${key} = :${key}`, {
            [key]: query[key],
          });
        }
      });
    }


    // 🎯 Tìm kiếm theo tên môn học (bỏ dấu)
    if (search) {
      queryBuilder.andWhere(
        `LOWER(unaccent("elearningTheme".name)) ILIKE LOWER(unaccent(:search))`,
        {
          search: `%${search}%`,
        },
      );
    }

    // 🎯 Phân trang và sắp xếp
    queryBuilder.orderBy('elearningTheme.createdAt', order).skip(skip).take(take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    return new PageDto(
      entities,
      new PageMetaDto({ pageOptionsDto: pageOptions, itemCount }),
    );
  }

  async findOne(id: number): Promise<ItemDto<ElearningTheme>> {
      const example = await this.repo.findOne({ where: { id } });
      if (!example) {
        throw new HttpException('Not found', 404);
      }
      return new ItemDto(example);
    }

  

  async update(id: number, updateElearningThemeDto: UpdateElearningThemeDto) {
    const { title, content, path } = updateElearningThemeDto;


    const example: ElearningTheme = await this.repo.findOne({ where: { id } });

    if (!example) {
      throw new NotFoundException(`ElearningTheme with ID ${id} not found`);
    }

   


    this.repo.merge(example, { title, content, path });

    await this.repo.update(id, example);

    return new ItemDto(example);
  }

  async remove(id: number, user:User) {
    const example: ElearningTheme = await this.repo.findOne({
      where: { id },
    });

    const filePath = path.join(__dirname, '..', '..', 'public', example.path);

    // Kiểm tra và xóa file
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath); // Xoá đồng bộ
      } catch (err) {
        console.error('Lỗi khi xoá file:', err);
        // Tuỳ chọn: throw new InternalServerErrorException('Không thể xoá file vật lý');
      }
    }

    if (!example) {
      throw new NotFoundException('Không tìm thấy tài nguyên');
    }

    await this.repo.delete(id);
    return new ItemDto(await this.repo.delete(id));
  }
}
