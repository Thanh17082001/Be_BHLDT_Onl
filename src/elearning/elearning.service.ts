import { CreateElearningDto } from './dto/create-elearning.dto';
import { UpdateElearningDto } from './dto/update-elearning.dto';



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
import { GradeService } from 'src/grade/grade.service';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/role/role.enum';
import { School } from 'src/schools/entities/school.entity';
import { schoolTypes } from 'src/common/constant/type-school-query';
import { Question } from 'src/question/entities/question.entity';
import { Elearning } from './entities/elearning.entity';
import { Subject } from 'src/subjects/entities/subject.entity';
import { Topic } from 'src/topics/entities/topic.entity';
import { join } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import PDFDocument = require('pdfkit');
import * as fabric from 'fabric/node';
import { JSDOM } from 'jsdom';
const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = window;
(global as any).document = window.document;
(global as any).HTMLCanvasElement = window.HTMLCanvasElement;
(global as any).HTMLImageElement = window.HTMLImageElement;


@Injectable()
export class ElearningService {
  constructor(
    @InjectRepository(Elearning) private repo: Repository<Elearning>,
    @InjectRepository(School) private repoSchool: Repository<School>,
    @InjectRepository(Subject) private repoSubject: Repository<Subject>,
    @InjectRepository(Topic) private repoTopic: Repository<Topic>,
    @InjectRepository(User) private repoUser: Repository<User>,
  ) { }
  // async create(
  //   createElearningDto: CreateElearningDto,
  //   user: User,
  // ): Promise<Elearning> {
  //   const { content, title, subjectId, topicId } = createElearningDto;
  //   console.log(content, title, subjectId, topicId)
  //   createElearningDto.schoolId = user?.school?.id;
  //   const school = await this.repoSchool.findOne({
  //     where: { id: createElearningDto.schoolId },
  //   });
  //   const subject = await this.repoSubject.findOne({
  //     where: { id: subjectId },
  //   });

  //   if (!subject) {
  //     throw new NotFoundException(`Không tìm thấy môn học`);
  //   }


  //   const newElearning = this.repo.create({
  //     content,
  //     title,
  //     subject: subject,
  //     topic: topicId,
  //     createdBy: user,
  //     school: school,
  //   });
  //   return await this.repo.save(newElearning);
  // }

  async create(
    createElearningDto: CreateElearningDto,
    user: User,
  ): Promise<Elearning> {
    const { content, title, subjectId, topicId, draftGroupId } = createElearningDto;

    // Lấy school và subject
    const school = await this.repoSchool.findOne({ where: { id: user?.school?.id } });
    const subject = await this.repoSubject.findOne({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('Không tìm thấy môn học');

    let finalDraftGroupId: number;

    if (draftGroupId) {
      // Nếu frontend gửi draftGroupId, dùng luôn
      finalDraftGroupId = draftGroupId;
    } else {
      // Nếu không, tự sinh draftGroupId mới không trùng
      // Lấy draftGroupId lớn nhất trong DB
      const lastDraft = await this.repo
        .createQueryBuilder('elearning')
        .select('MAX(elearning.draftGroupId)', 'max')
        .getRawOne();

      finalDraftGroupId = lastDraft?.max ? Number(lastDraft.max) + 1 : 1;
    }

    // Tạo bản ghi mới
    const newElearning = this.repo.create({
      content,
      title,
      subject,
      topic: topicId,
      createdBy: user,
      school,
      draftGroupId: finalDraftGroupId,
    });

    return await this.repo.save(newElearning);
  }


  async findAll(
    pageOptions: PageOptionsDto,
    query: Partial<Elearning>,
    user: User,
  ): Promise<PageDto<Elearning>> {
    try {
      const queryBuilder = this.repo
        .createQueryBuilder('elearning')
        .leftJoinAndSelect('elearning.school', 'school')
        .leftJoinAndSelect('elearning.createdBy', 'createdBy')
        .leftJoinAndSelect('elearning.subject', 'subject');

      const { page, take, skip, order, search } = pageOptions;
      const pagination: string[] = ['page', 'take', 'skip', 'order', 'search'];
      if (user) {
        const schoolTypesQuery = schoolTypes(user);
        queryBuilder.andWhere(
          new Brackets((qb) => {
            if (user.role === Role.TEACHER) {
              const subjectIds = user.subjects?.map((s) => s.id) || [];
              if (subjectIds.length > 0) {
                console.log(11111)
                qb.where(
                  new Brackets((q) =>
                    q
                      .where('subject.id IN (:...subjectIds)', { subjectIds })
                      .andWhere('elearning.created_by = :created_by', { created_by: user.id }),
                  ),
                );
              }
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
              qb.where('school.schoolType IN (:...schoolTypesQuery)', { schoolTypesQuery });
            }
          }),
        );
      }

      // 🎯 Lọc theo điều kiện tìm kiếm (bỏ qua các tham số phân trang)
      if (!!query && Object.keys(query).length > 0) {
        Object.keys(query).forEach((key) => {
          if (key && !pagination.includes(key)) {
            console.log(query);
            queryBuilder.andWhere(`elearning.${key} = :${key}`, {
              [key]: query[key],
            });
          }
        });
      }

      console.log(2222);

      // 🎯 Tìm kiếm theo tên môn học (bỏ dấu)
      if (search) {
        queryBuilder.andWhere(
          `LOWER(unaccent("elearning".name)) ILIKE LOWER(unaccent(:search))`,
          {
            search: `%${search}%`,
          },
        );
      }

      // 🎯 Phân trang và sắp xếp
      queryBuilder.orderBy('elearning.createdAt', order).skip(skip).take(take);

      const itemCount = await queryBuilder.getCount();
      const { entities } = await queryBuilder.getRawAndEntities();

      return new PageDto(
        entities,
        new PageMetaDto({ pageOptionsDto: pageOptions, itemCount }),
      );
    } catch (error) {
      console.log(error)
    }
  }

  async findOne(id: number): Promise<ItemDto<Elearning>> {
    const example = await this.repo.findOne({ where: { id } });
    if (!example) {
      throw new HttpException('Not found', 404);
    }
    return new ItemDto(example);
  }

  async update(id: number, updateElearningDto: UpdateElearningDto) {
    const { content, title, subjectId, topicId } = updateElearningDto;


    const example: Elearning = await this.repo.findOne({ where: { id }, relations: ['createdBy', 'school'] });

    if (!example) {
      throw new NotFoundException(`Elearning with ID ${id} not found`);
    }

    const subject = await this.repoSubject.findOne({
      where: { id: subjectId },
    });

    this.repo.merge(example, { content, title, subject, topic: topicId });
    console.log(example);

    await this.repo.update(id, example);

    return new ItemDto(example);
  }

  async remove(id: number, user: User) {
    const example: Elearning = await this.repo.findOne({
      where: { id },
      relations: ['createdBy', 'school'],
    });

    if (!example) {
      throw new NotFoundException('Không tìm thấy tài nguyên');
    }
    if (user.role !== Role.ADMIN) {
      if (example.createdBy.id !== user.id) {
        throw new ForbiddenException('Không có quyền xóa');
      }
    }
    await this.repo.delete(id);
    return new ItemDto(await this.repo.delete(id));
  }
  async sendToEmail(elearningId: number, email: string, userName: string) {
    // 1. Lấy Elearning gốc
    const elearning = await this.repo.findOne({
      where: { id: elearningId },
      relations: ['createdBy', 'school', 'subject'],
    });
    if (!elearning) throw new NotFoundException('Elearning not found');

    // 2. Lấy user
    const user = await this.repoUser.findOne({ where: { username: userName } });
    if (!user) throw new NotFoundException('User not found');

    // 3. Tạo thư mục PDF
    const pdfDir = join(__dirname, '../../public/pdf');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    // 4. Tạo file PDF
    const pdfPath = join(pdfDir, `elearning-${elearning.id}-${Date.now()}.pdf`);
    const doc = new PDFDocument({ autoFirstPage: false });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // 5. Chuyển content sang JSON
    const content =
      typeof elearning.content === 'string'
        ? JSON.parse(elearning.content)
        : elearning.content;

    // 6. Vẽ từng trang
    for (const key of Object.keys(content)) {
      const { canvasJSON } = content[key];
      const canvas = new fabric.StaticCanvas(null, { width: 900, height: 550 });

      await new Promise<void>((resolve) => {
        canvas.loadFromJSON(canvasJSON, () => {
          const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
          const imgBuffer = Buffer.from(dataUrl.split(',')[1], 'base64');
          doc.addPage({ size: [900, 550] });
          doc.image(imgBuffer, 0, 0, { width: 900, height: 550 });
          doc.text(`Trang ${key}`, 20, 20);
          resolve();
        });
      });
    }

    doc.end();
    await new Promise<void>((resolve) => {
      stream.on('finish', () => resolve());
    });

    // 7. Clone elearning
    const cloned = this.repo.create({
      title: `${elearning.title} - Bản sao`,
      content: elearning.content,
      school: elearning.school,
      subject: elearning.subject,
      topic: elearning.topic,
      createdBy: user,
    });
    await this.repo.save(cloned);

    // 8. Gửi mail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hoangconghieu1903@gmail.com',
        pass: 'ulsxqjtkonzpvnqi',
      },
    });

    await transporter.sendMail({
      from: `${email}`,
      to: email,
      subject: `Tài liệu Elearning: ${elearning.title}`,
      text: 'Đính kèm là file PDF nội dung bài học của bạn.',
      attachments: [{ filename: `${elearning.title}.pdf`, path: pdfPath }],
    });

    return { message: 'Đã gửi email thành công', pdfPath };
  }
  async autoSave(createElearningDto: CreateElearningDto, user: User): Promise<Elearning> {
    const { draftGroupId } = createElearningDto;

    // Nếu draftGroupId được gửi, lấy các bản nháp hiện tại
    let currentDrafts: Elearning[] = [];
    if (draftGroupId) {
      currentDrafts = await this.repo.find({
        where: { draftGroupId, createdBy: { id: user.id } },
        order: { createdAt: 'ASC' }, // sắp xếp từ cũ nhất đến mới nhất
      });
    }

    // Nếu đã có >=5 bản nháp, xóa bản cũ nhất
    if (currentDrafts.length >= 5) {
      await this.repo.remove(currentDrafts[0]);
    }

    // Tạo bản mới bằng hàm create
    const newDraft = await this.create(createElearningDto, user);

    return newDraft;
  }
}
