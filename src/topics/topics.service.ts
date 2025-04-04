import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

import { BadRequestException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { Topic } from './entities/topic.entity';
import { Subject } from 'src/subjects/entities/subject.entity';
import { User } from 'src/users/entities/user.entity';
import { School } from 'src/schools/entities/school.entity';
import { Role } from 'src/role/role.enum';
import { schoolTypes } from 'src/common/constant/type-school-query';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic) private repo: Repository<Topic>,
    @InjectRepository(Subject) private repoSubject: Repository<Subject>,
    @InjectRepository(School) private repoSchool: Repository<Subject>,

  ) { }
  async create(createTopicDto: CreateTopicDto, user: User): Promise<Topic> {
    console.log(user?.school?.id);
    const school = await this.repoSchool.findOne({ where: { id: user?.school?.id  ?? -1 } });
    const topic: Topic = await this.repo.findOne({ where: { name: createTopicDto.name }, relations: ['subject'] })
    const subject: Subject = await this.repoSubject.findOne({
      where: {
        id: createTopicDto.subjectId
      },
      relations: ['topics'],
    })
    if (topic && topic?.subject?.id == createTopicDto.subjectId) {
      throw new BadRequestException('Chủ đề đã tồn tại')
    }
    if (!subject) {
      throw new NotFoundException('Môn học không tồn tại')
    }

    const cls = this.repo.create({ name: createTopicDto.name, subject, school, createdBy:user });
    // if (!subject.topics) {,
    //   subject.topics = [];
    // }
    // subject.topics.push(cls)

    const newTopic = await this.repo.save({ name: createTopicDto.name, subject, school, createdBy: user });
    // await this.repoSubject.save(subject);
    return newTopic;
  }

  async findAll(pageOptions: PageOptionsDto, query: Partial<Topic>, user: User): Promise<PageDto<Topic>> {

    const queryBuilder = this.repo.createQueryBuilder('topic').leftJoinAndSelect('topic.subject', 'subject')
      .leftJoinAndSelect('topic.school', 'school').leftJoinAndSelect('topic.createdBy', 'createdBy').leftJoinAndSelect('school.users', 'users'); // Lấy danh sách giáo viên phụ trách môn học
    const { page, take, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'take', 'skip', 'order', 'search']

    //phân quyền dữ liệu
    if (user) {
      const schoolTypesQuery = schoolTypes(user);
      if (user.role === Role.TEACHER) {
        const subjectIds = user.subjects?.map((subject) => subject.id) || [];

        if (subjectIds.length > 0) {
          queryBuilder.andWhere(
            'subject.id IN (:...subjectIds) OR (school.isAdmin = :isAdmin AND school.schoolType IN (:...schoolTypesQuery))',
            {
              subjectIds,
              isAdmin: true,
              schoolTypesQuery,
            },
          );
        }
      } else if (user.role === Role.PRINCIPAL) {
        queryBuilder.andWhere(
          '(school.id = :schoolId OR (school.isAdmin = :isAdmin AND school.schoolType IN (:...schoolTypesQuery)))',
          {
            schoolId: user.school.id,
            isAdmin: true, // Thêm điều kiện isAdmin = true
            schoolTypesQuery,
          },
        );
      }
      // admin
      else {
        queryBuilder.andWhere(`school.schoolType IN (:...schoolTypesQuery)`, {
          schoolTypesQuery,
        });
      }
    }


    if (!!query && Object.keys(query).length > 0) {
      const arrayQuery: string[] = Object.keys(query);
      arrayQuery.forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`topic.${key} = :${key}`, { [key]: query[key] });
        }
      });
    }

    
    //search document
    if (search) {
      queryBuilder.andWhere(`LOWER(unaccent(topic.name)) ILIKE LOWER(unaccent(:search))`, {
        search: `%${search}%`,
      });
    }


    queryBuilder.orderBy(`topic.subject`, 'ASC')
      .skip(skip)
      .take(take);

    const itemCount = await queryBuilder.getCount();
    const pageMetaDto = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });
    const { entities } = await queryBuilder.getRawAndEntities();

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(id: number): Promise<ItemDto<Topic>> {

    const example = await this.repo.findOne({ where: { id } });
    if (!example) {
      throw new HttpException('Not found', 404);
    }
    return new ItemDto(example);
  }

  async update(id: number, updateTopicDto: UpdateTopicDto, user:User) {
    const { name,subjectId } = updateTopicDto;
    const exampleExits: Topic = await this.repo.findOne({ where: { name, id: Not(id) } });
    if (exampleExits) {
      throw new HttpException('Tên đã tồn tại', 409);
    }

    const example: Topic = await this.repo.findOne({ where: { id } });

    if (!example) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    const isOwner = example?.createdBy?.id === user.id;
    const isSameSchoolType = example?.school?.schoolType === user.school?.schoolType;

    if (!user.isAdmin && !isOwner) {
      throw new ForbiddenException('Không có quyền ');
    }

    if (user.isAdmin && !isSameSchoolType) {
      throw new ForbiddenException('Không có quyền');
    }

    if (example?.createdBy.id !== user.id) {
      throw new ForbiddenException('Không có quyền');
    }

    if (example?.createdBy?.id !== user.id) {
      console.log(user);
      throw new ForbiddenException('Không có quyền');
    }

    const subject: Subject = await this.repoSubject.findOne({
      where: {
        id:subjectId
      },
    })

    Object.assign(example, { subject ,name})

    await this.repo.update(id, example)

    return new ItemDto(example);;
  }

  async remove(id: number, user:User) {
    const resource = await this.repo.findOne({ where: { id }, relations:[ 'createdBy','school'] });
    if (!resource) {
      throw new NotFoundException('Không tìm thấy tài nguyên');
    }
    const isOwner = resource?.createdBy?.id === user.id;
    const isSameSchoolType = resource?.school?.schoolType === user.school?.schoolType;

    if (!user.isAdmin && !isOwner) {
      throw new ForbiddenException('Không có quyền ');
    }

    if (user.isAdmin && !isSameSchoolType) {
      throw new ForbiddenException('Không có quyền');
    }

    if (resource?.createdBy.id !== user.id) {
      throw new ForbiddenException('Không có quyền');
    }

    if (resource?.createdBy?.id !== user.id) {
      console.log(user);
      throw new ForbiddenException('Không có quyền');
    }
    await this.repo.delete(id);
    return new ItemDto(await this.repo.delete(id));
  }
}
