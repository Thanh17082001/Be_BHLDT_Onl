import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';

import * as sharp from 'sharp';
import * as pdfPoppler from 'pdf-poppler';
import * as path from 'path';
import { existsSync, statSync, unlinkSync, promises as fs } from 'fs';
import { File } from './entities/file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateImageDto } from 'src/image/dto/create-image.dto';
import { ImageService } from 'src/image/image.service';
import { Image } from 'src/image/entities/image.entity';
import { School } from 'src/schools/entities/school.entity';
import { FileType } from 'src/file-type/entities/file-type.entity';
import { Topic } from 'src/topics/entities/topic.entity';
import { Subject } from 'src/subjects/entities/subject.entity';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { Role } from 'src/role/role.enum';
import { User } from 'src/users/entities/user.entity';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { subscribe } from 'diagnostics_channel';



@Injectable()
export class FileService {
 constructor(
   @InjectRepository(File) private repo: Repository<File>,
   @InjectRepository(Image) private repoImage: Repository<Image>,
   @InjectRepository(School) private repoSchool: Repository<School>,
   @InjectRepository(FileType) private repoFileType: Repository<FileType>,
   @InjectRepository(Topic) private repoTopic: Repository<Topic>,
   @InjectRepository(Subject) private repoSubject: Repository<Subject>,
     ) {}

  async create(createFileDto: CreateFileDto, images: string[] = [], user) {
    console.log(createFileDto);
    createFileDto.createdBy = user;
    createFileDto.schoolId = user?.school?.id ?? 1;
    const school = await this.repoSchool.findOne({ where: { id: createFileDto.schoolId } });
    const fileType = await this.repoFileType.findOne({ where: { id: createFileDto.filetypeId } });
    const topic = await this.repoTopic.findOne({ where: { id: createFileDto.topicId } });
    const subject = await this.repoSubject.findOne({ where: { id: createFileDto.subjectId } });
    const file = await this.repo.findOne({ where: { id: createFileDto.parentId } });

    const fileCreate = this.repo.create(createFileDto)
    let resutlImages:Image[] = []
    if (images.length > 0) {
      for (let i = 0; i < images?.length; i++) {
        const imageDto: CreateImageDto = {
          name: createFileDto.name,
          fileId: fileCreate.id,
          path: images[i] || ''
        }
        const image = await this.repoImage.create(imageDto)
        resutlImages.push(image)
      }
    }
    const data = { ...fileCreate, images: resutlImages, school, fileType: fileType ?? null, topic: topic ?? null, subject: subject ?? null, parent: createFileDto.isFolder? file: null ,createedBy: user.isdAdmin? null: user };
    const fileTypeEntity = await this.repo.save(data);
    return fileTypeEntity;
  }

  async findAll(
      pageOptions: PageOptionsDto,
      query: Partial<File>,
      user: User
    ): Promise<PageDto<File>> {
    const queryBuilder = this.repo.createQueryBuilder('file')
      .leftJoinAndSelect('file.fileType', 'fileType') 
        .leftJoinAndSelect('file.subject', 'subject')
        .leftJoinAndSelect('file.topic', 'topic')
        .leftJoinAndSelect('file.images', 'images')
        .leftJoinAndSelect('file.school', 'school') // Lấy thông tin trường
      .leftJoinAndSelect('school.users', 'users')
      .leftJoinAndSelect('users.subjects', 'userSubjects'); 
      ; // Lấy danh sách giáo viên phụ trách môn học
  
      const { page, take, skip, order, search } = pageOptions;
      const pagination: string[] = ['page', 'take', 'skip', 'order', 'search'];
  
      // 🎯 Lọc theo điều kiện tìm kiếm (bỏ qua các tham số phân trang)
      if (!!query && Object.keys(query).length > 0) {
        Object.keys(query).forEach((key) => {
          if (key !== undefined && key !== null && !pagination.includes(key)) {
            
              queryBuilder.andWhere(`file.${key} = :${key}`, { [key]: query[key] })
          }
        });
      }
  
    if (user) {
      // 🎯 Phân quyền dữ liệu
      if (user?.role === Role.TEACHER) {
        const subjectIds = user.subjects?.map((subject) => subject.id) || [];

        queryBuilder.andWhere(
          '(users.id = :userId OR file.created_by = :userId OR file.created_by IS NULL) ' +
          'AND (school.id = :schoolId OR school.id IS NULL)',
          {
            userId: user.id,
            schoolId: user.school.id,
          }
        );

        if (subjectIds.length > 0) {
          console.log(subjectIds);
          queryBuilder.andWhere('file.subject_id IN (:...subjectIds)', {
            subjectIds,
          });
        }
      } else if (user.role === Role.PRINCIPAL) {
        queryBuilder.andWhere('(school.id = :schoolId OR school.id IS NULL)', {
          schoolId: user.school.id
        });
      }
      }
  
      // 🎯 Tìm kiếm theo tên môn học (bỏ dấu)
      if (search) {
        queryBuilder.andWhere(`LOWER(unaccent("subject".name)) ILIKE LOWER(unaccent(:search))`, {
          search: `%${search}%`,
        });
      }
  
      // 🎯 Phân trang và sắp xếp
      queryBuilder.orderBy('subject.createdAt', order).skip(skip).take(take);
  
      const itemCount = await queryBuilder.getCount();
      const { entities } = await queryBuilder.getRawAndEntities();
  
      return new PageDto(entities, new PageMetaDto({ pageOptionsDto: pageOptions, itemCount }));
    }

  findOne(id: number) {
    return `This action returns a #${id} file`;
  }

  update(id: number, updateFileDto: UpdateFileDto) {
    return `This action updates a #${id} file`;
  }

  async remove(id: number) {
      const resource = await this.repo.findOne({ where: { id }, relations: ['images'] });
      if (!resource) {
        throw new NotFoundException('Không tìm thấy tài nguyên');
    }
    
    const oldImagePath = path.join(__dirname, '..', '..', resource.path);
    if (existsSync(oldImagePath)) {
      unlinkSync(oldImagePath);
      for (let i = 0; i < resource?.images?.length; i++) {
        const priviewImageOld = path.join(__dirname, '..', '..', resource.path);
        const imageConvertOld = path.join(__dirname, '..', '..', resource.images[i].path);

        if (existsSync(priviewImageOld)) {
          await this.repoImage.delete(resource.images[i].id);
          unlinkSync(priviewImageOld);
        }

        if (existsSync(imageConvertOld)) {
          unlinkSync(imageConvertOld);
        }
      }
    }
      return new ItemDto(await this.repo.delete(id));
    }

  async resizeImage(buffer: Buffer, linkFile: string): Promise<string> {
    try {
      await sharp(buffer)
        .resize(800) // Thay đổi kích thước (nếu cần)
        .jpeg({ quality: 70 }) // Định dạng và chất lượng ảnh
        .toFile(linkFile);
      return linkFile;
    } catch (error) {
      console.log(error.message);
    }
  }

  async convertPdfToImages(pdfPath: string): Promise<Array<string>> {
    try {
      const outputDir = path.join(__dirname, '../../public/images-convert');
      // const outputFiles: string[] = [];

      // Đảm bảo thư mục đầu ra tồn tại
      await fs.mkdir(outputDir, { recursive: true });
      const existingFiles = new Set(await fs.readdir(outputDir));

      // Thiết lập tùy chọn cho việc chuyển đổi
      const options = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
        page: null, // Chuyển đổi tất cả các trang
      };
      // Chuyển đổi PDF thành hình ảnh
      await pdfPoppler.convert(pdfPath, options);
      // Lấy danh sách các tệp đã chuyển đổi
      const newFiles = await fs.readdir(outputDir);
      const outputFiles: string[] = newFiles.filter(file => file.endsWith('.png') && !existingFiles.has(file)).map(file => `public/images-convert/${file}`);

      
      return outputFiles;
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      throw new Error(error);
    }
  }
}
