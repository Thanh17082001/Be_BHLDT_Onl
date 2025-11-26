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
import { ElearningVersion } from 'src/elearning-version/entities/elearning-version.entity';
import { AutosaveElearningDto } from './dto/autosave-elearning. copy';
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
    @InjectRepository(ElearningVersion) private repoElearningVersion: Repository<ElearningVersion>,
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
    const { title, subjectId, topicId, content } = createElearningDto;
    console.log(
      title, subjectId, topicId, content
    )
    //Lấy school từ user (nếu có)
    const school = user?.school
      ? await this.repoSchool.findOne({ where: { id: user.school.id } })
      : null;

    //Kiểm tra subject
    const subject = await this.repoSubject.findOne({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('Không tìm thấy môn học');

    //Tạo bản ghi Elearning mới
    const newElearning = this.repo.create({
      title,
      subject,
      topic: topicId ?? null,
      createdBy: user,
      school,
      currentversion: 1, // phiên bản đầu tiên
    });

    //Lưu Elearning trước để có ID
    const savedElearning = await this.repo.save(newElearning);

    //Tạo phiên bản đầu tiên (ElearningVersion)
    const firstVersion = this.repoElearningVersion.create({
      content,
      elearning: savedElearning,
      createdBy: user,
    });

    await this.repoElearningVersion.save(firstVersion);

    //Trả về kết quả (có thể load luôn versions nếu muốn)
    return await this.repo.findOne({
      where: { id: savedElearning.id },
      relations: ['elearningversions', 'subject', 'school', 'createdBy'],
    });
  }


  // async findAll(
  //   pageOptions: PageOptionsDto,
  //   query: Partial<Elearning>,
  //   user: User,
  // ): Promise<PageDto<Elearning>> {
  //   try {
  //     const { take, skip, order, search } = pageOptions;
  //     const pagination: string[] = ['page', 'take', 'skip', 'order', 'search'];

  //     // ⚡ Subquery: Lấy ID bản ghi mới nhất của mỗi nhóm draftGroupId
  //     const subQuery = this.repo
  //       .createQueryBuilder('latest')
  //       .select('MAX(latest.id)', 'id')
  //       .where('latest.draftGroupId IS NOT NULL')
  //       .andWhere('latest.deletedAt IS NULL')
  //       .groupBy('latest.draftGroupId');

  //     const latestIds = await subQuery.getRawMany();
  //     console.log('🧩 LATEST IDS RESULT:', latestIds.map(i => i.id));

  //     // ⚙️ Query chính
  //     const queryBuilder = this.repo
  //       .createQueryBuilder('elearning')
  //       .leftJoinAndSelect('elearning.school', 'school')
  //       .leftJoinAndSelect('elearning.createdBy', 'createdBy')
  //       .leftJoinAndSelect('elearning.subject', 'subject')
  //       .leftJoinAndSelect('elearning.comments', 'comments')
  //       .leftJoinAndSelect('comments.createdBy', 'commentUser');

  //     // 🎯 Áp dụng subquery: chỉ giữ bản mới nhất theo draftGroupId
  //     if (latestIds.length > 0) {
  //       const ids = latestIds.map(i => i.id);
  //       queryBuilder.andWhere(
  //         new Brackets((qb) => {
  //           qb.where('elearning.id IN (:...ids)', { ids })
  //             .orWhere('elearning.draftGroupId IS NULL');
  //         }),
  //       );
  //     } else {
  //       // Nếu không có nhóm nào có draftGroupId, thì lấy tất cả
  //       queryBuilder.andWhere('elearning.draftGroupId IS NULL');
  //     }

  //     // 🎯 Lọc theo quyền người dùng
  //     if (user) {
  //       const schoolTypesQuery = schoolTypes(user);
  //       queryBuilder.andWhere(
  //         new Brackets((qb) => {
  //           if (user.role === Role.TEACHER) {
  //             qb.where(
  //               new Brackets((q) => {
  //                 q.orWhere('elearning.created_by = :created_by', { created_by: user.id });
  //                 q.orWhere(
  //                   '(createdBy.role = :adminRole AND school.id = :schoolId)',
  //                   { adminRole: Role.ADMIN, schoolId: user.school.id },
  //                 );
  //               }),
  //             );
  //           } else if (user.role === Role.PRINCIPAL) {
  //             qb.where('school.id = :schoolId', { schoolId: user.school.id }).orWhere(
  //               '(school.isAdmin = :isAdmin AND school.schoolType IN (:...schoolTypesQuery))',
  //               { isAdmin: true, schoolTypesQuery },
  //             );
  //           } else if (user.role === Role.ADMIN) {
  //             qb.where('1=1'); // ✅ Admin được phép xem tất cả
  //           }
  //         }),
  //       );
  //     }

  //     // 🎯 Lọc theo query params
  //     if (query && Object.keys(query).length > 0) {
  //       Object.keys(query).forEach((key) => {
  //         if (key && !pagination.includes(key)) {
  //           queryBuilder.andWhere(`elearning.${key} = :${key}`, {
  //             [key]: query[key],
  //           });
  //         }
  //       });
  //     }

  //     // 🎯 Tìm kiếm theo tiêu đề
  //     if (search) {
  //       queryBuilder.andWhere(
  //         `LOWER(unaccent(elearning.title)) ILIKE LOWER(unaccent(:search))`,
  //         { search: `%${search}%` },
  //       );
  //     }

  //     // ⚙️ Phân trang và sắp xếp
  //     queryBuilder.orderBy('elearning.createdAt', order).skip(skip).take(take);

  //     const [entities, itemCount] = await queryBuilder.getManyAndCount();

  //     console.log(`✅ Hiển thị ${entities.length}/${itemCount} bản ghi`);

  //     return new PageDto(
  //       entities,
  //       new PageMetaDto({ pageOptionsDto: pageOptions, itemCount }),
  //     );
  //   } catch (error) {
  //     console.error('🔥 Error in findAll:', error);
  //     throw error;
  //   }
  // }

  async findAll(
    pageOptions: PageOptionsDto,
    query: any,
    user: User,
  ): Promise<PageDto<Elearning>> {
    try {
      const { take, skip, order, search } = pageOptions;
      const paginationKeys: string[] = ['page', 'take', 'skip', 'order', 'search'];

      const queryBuilder = this.repo
        .createQueryBuilder('elearning')
        .leftJoinAndSelect('elearning.school', 'school')
        .leftJoinAndSelect('elearning.createdBy', 'createdBy')
        .leftJoinAndSelect('elearning.subject', 'subject')
        .leftJoinAndSelect('subject.grade', 'grade')
        .leftJoinAndSelect('elearning.comments', 'comments')
        .leftJoinAndSelect('comments.createdBy', 'commentUser')
        .leftJoin('elearning.elearningversions', 'versions')
        .addSelect([
          'versions.id',
          'versions.createdBy',
          'versions.createdAt',
        ]);

      // 🎯 Lọc theo quyền người dùng
      if (user) {
        const schoolTypesQuery = schoolTypes(user); // mảng schoolType của user

        queryBuilder.andWhere(
          new Brackets((qb) => {
            if (user.role === Role.TEACHER) {
              // Teacher: bài do chính họ tạo OR admin cùng cấp trường
              qb.where(
                new Brackets((q) => {
                  q.orWhere('elearning.created_by = :userId', { userId: user.id });
                  q.orWhere(
                    'createdBy.role = :adminRole AND school.schoolType = :schoolType',
                    { adminRole: Role.ADMIN, schoolType: user.school.schoolType },
                  );
                }),
              );
            } else if (user.role === Role.PRINCIPAL) {
              // Principal: tất cả bài trong trường OR admin cùng cấp trường
              qb.where(
                new Brackets((q) => {
                  q.orWhere('school.id = :schoolId', { schoolId: user.school.id });
                  q.orWhere(
                    'createdBy.role = :adminRole AND school.schoolType = :schoolType',
                    { adminRole: Role.ADMIN, schoolType: user.school.schoolType },
                  );
                }),
              );
            } else if (user.role === Role.ADMIN) {
              qb.where('1=1'); // Admin được xem tất cả
            }
          }),
        );
      }
      if (query.gradeId) {
        queryBuilder.andWhere('grade.id = :gradeId', {
          gradeId: Number(query.gradeId),
        });
      }
      // 🎯 Lọc theo query params (title, subjectId, v.v)
      if (query && Object.keys(query).length > 0) {
        Object.keys(query).forEach((key) => {
          if (key && key !== 'gradeId' && !paginationKeys.includes(key)) {
            queryBuilder.andWhere(`elearning.${key} = :${key}`, {
              [key]: query[key],
            });
          }
        });
      }

      // 🎯 Tìm kiếm theo tiêu đề
      if (search) {
        queryBuilder.andWhere(
          `LOWER(unaccent(elearning.title)) ILIKE LOWER(unaccent(:search))`,
          { search: `%${search}%` },
        );
      }

      // ⚙️ Phân trang và sắp xếp
      queryBuilder.orderBy('elearning.createdAt', order).skip(skip).take(take);

      // ✅ Lấy kết quả
      const [entities, itemCount] = await queryBuilder.getManyAndCount();

      console.log(`✅ Hiển thị ${entities.length}/${itemCount} bản ghi`);

      return new PageDto(
        entities,
        new PageMetaDto({ pageOptionsDto: pageOptions, itemCount }),
      );
    } catch (error) {
      console.error('🔥 Error in findAll:', error);
      throw error;
    }
  }


  async findOne(id: number): Promise<ItemDto<Elearning>> {
    // 🔍 Lấy Elearning và toàn bộ các version
    const elearning = await this.repo
      .createQueryBuilder('elearning')
      .leftJoinAndSelect('elearning.createdBy', 'createdBy')
      .leftJoinAndSelect('elearning.subject', 'subject')
      .leftJoinAndSelect('elearning.school', 'school')
      .leftJoinAndSelect('elearning.elearningversions', 'versions')
      .leftJoinAndSelect('versions.createdBy', 'versionCreatedBy')
      .where('elearning.id = :id', { id })
      .getOne();

    if (!elearning) {
      throw new HttpException('Không tìm thấy bài học', 404);
    }

    // 🧩 Nếu có version
    if (elearning.elearningversions && elearning.elearningversions.length > 0) {
      // Sắp xếp version theo createdAt giảm dần
      elearning.elearningversions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // ✅ Bản mới nhất (đầy đủ content)
      const latestVersion = elearning.elearningversions[0];

      // 🧹 Các bản cũ: loại bỏ trường content
      const oldVersions = elearning.elearningversions.slice(1).map((v) => {
        const { content, ...rest } = v;
        return rest;
      });

      // Gán lại dữ liệu version
      // (elearning as any).latestVersion = latestVersion;
      (elearning as any).elearningversions = [latestVersion, ...oldVersions];
    } else {
      (elearning as any).latestVersion = null;
    }

    return new ItemDto(elearning);
  }


  // async update(id: number, updateElearningDto: UpdateElearningDto) {
  //   const { content, title, subjectId, topicId } = updateElearningDto;


  //   const example: Elearning = await this.repo.findOne({ where: { id }, relations: ['createdBy', 'school'] });

  //   if (!example) {
  //     throw new NotFoundException(`Elearning with ID ${id} not found`);
  //   }

  //   const subject = await this.repoSubject.findOne({
  //     where: { id: subjectId },
  //   });

  //   this.repo.merge(example, { content, title, subject, topic: topicId });
  //   console.log(example);

  //   await this.repo.update(id, example);

  //   return new ItemDto(example);
  // }

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

  async sendToEmail(file: Express.Multer.File, email: string, userName: string, user:User) {
    if (!file) throw new NotFoundException('Không có file được gửi lên');
    if (!email) throw new NotFoundException('Không có email người nhận');
    if (!userName) throw new NotFoundException('Không có userName');

    const safeFilename = file.originalname.replace(/[^\w\d._-]/g, '_');

    // 1️⃣ Gửi mail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hoangconghieu1903@gmail.com',
        pass: 'ulsxqjtkonzpvnqi',
      },
    });

    await transporter.sendMail({
      from: `"Hệ thống Elearning" <hoangconghieu1903@gmail.com>`,
      to: email,
      subject: `Tài liệu Elearning từ ${user?.fullname}`,
      text: 'Đính kèm là file Elearning bạn nhận được.',
      attachments: [
        {
          filename: safeFilename,
          content: file.buffer,
        },
      ],
    });

    return { message: 'Đã gửi email thành công' };
  }
  // Hàm build HTML từ Elearning content
  private buildElearningHTML(title: string, content: any): string {
    let html = `<html><head><meta charset="UTF-8"><title>${title}</title></head><body>`;
    html += `<h2>${title}</h2>`;

    for (const key of Object.keys(content)) {
      const page = content[key];
      const canvas = this.cleanCanvasJson(page.canvasJSON);

      html += `<div style="position:relative; width:${page.canvasSize.width}px; height:${page.canvasSize.height}px; background:${canvas.background || '#fff'}; margin-bottom:20px; border:1px solid #ccc;">`;

      for (const obj of canvas.objects) {
        switch (obj.type) {
          case 'Textbox':
            html += `<div style="position:absolute; left:${obj.left}px; top:${obj.top}px; font-size:${obj.fontSize}px; color:${obj.fill}; font-family:${obj.fontFamily};">${obj.text}</div>`;
            break;
          case 'Rect':
            html += `<div style="position:absolute; left:${obj.left}px; top:${obj.top}px; width:${obj.width}px; height:${obj.height}px; background:${obj.fill};"></div>`;
            break;
          case 'Image':
            if (obj.src) {
              // Đảm bảo src là base64 hoặc URL hợp lệ
              html += `<img src="${obj.src}" style="position:absolute; left:${obj.left}px; top:${obj.top}px; width:${obj.width}px; height:${obj.height}px;" />`;
            }
            break;
        }
      }

      html += `</div>`; // close page
    }

    html += `</body></html>`;
    return html;
  }

  // Hàm cleanCanvasJson giữ nguyên
  private cleanCanvasJson(json: any) {
    if (!json || !json.objects) return json;
    json.objects = json.objects.filter((obj: any) => {
      if (obj.type === 'FabricTable') {
        console.warn('⚠ Loại bỏ FabricTable vì Node không hỗ trợ.');
        return false;
      }
      return true;
    });
    return json;
  }


  async autoSave(createElearningDto: AutosaveElearningDto, user: User) {
    const { elearningId, content } = createElearningDto;

    // 1️⃣ Kiểm tra Elearning gốc
    const elearning = await this.repo.findOne({
      where: { id: elearningId },
      relations: ['createdBy', 'school', 'subject'],
    });
    if (!elearning) {
      throw new NotFoundException('Không tìm thấy Elearning gốc');
    }
    // Kiểm tra quyền sửa
    if (!user.isAdmin) {
      if (user.id !== elearning.createdBy.id) {
        throw new ForbiddenException('Không có quyền sửa')
      }
    }


    // Tạo mới ElearningVersion
    const newVersion = this.repoElearningVersion.create({
      content,
      elearning: elearning,
      createdBy: user,
    });
    await this.repoElearningVersion.save(newVersion);

    // 3️⃣ Lấy danh sách version hiện tại (sau khi thêm)
    const versions = await this.repoElearningVersion.find({
      where: { elearning: { id: elearning.id } }, relations: ['createdBy'],
      order: { createdAt: 'ASC' }, // cũ đến mới
    });

    // 4️⃣ Nếu nhiều hơn 5 bản → xóa bản cũ nhất
    if (versions.length > 5) {
      const oldest = versions[0];
      await this.repoElearningVersion.remove(oldest);
    }

    // 5️⃣ Cập nhật currentVersionId trong Elearning
    elearning.currentversion = newVersion.id;
    await this.repo.save(elearning);

    // 6️⃣ Trả về Elearning + các version (ẩn content)
    const result = await this.repo.findOne({
      where: { id: elearning.id },
      relations: ['elearningversions', 'createdBy', 'subject', 'school'],
      order: { elearningversions: { createdAt: 'DESC' } },
    });

    // 7️⃣ Xóa content ở tất cả các version trước khi trả ra
    if (result?.elearningversions?.length) {
      result.elearningversions.forEach((v) => {
        v.content = undefined;
      });
    }

    return result;
  }

  async findElearningVersionsByElearningID(elearningId: number) {
    return await this.repoElearningVersion
      .createQueryBuilder('version')
      .leftJoinAndSelect('version.createdBy', 'createdBy')
      .where('version.elearningId = :elearningId', { elearningId })
      .select([
        'version.id',
        // 'version.title',
        'version.createdAt',
        // 'version.updatedAt',
        // 'version.createdBy',
        // 'createdBy.id',
        // 'createdBy.fullName',
        // 'createdBy.email',
      ])
      .orderBy('version.createdAt', 'DESC')
      .getMany();
  }


}
