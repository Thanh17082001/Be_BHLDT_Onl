import { Injectable } from '@nestjs/common';
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
    createFileDto.createdBy = user;
    createFileDto.schoolId = user?.school?.id ?? 1;
    const school = await this.repoSchool.findOne({ where: { id: createFileDto.schoolId } });
    const fileType = await this.repoFileType.findOne({ where: { id: createFileDto.filetypeId } });
    const topic = await this.repoTopic.findOne({ where: { id: createFileDto.topicId } });
    const subject = await this.repoSubject.findOne({ where: { id: createFileDto.subjectId } });

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
    const fileTypeEntity = await this.repo.save({ ...fileCreate ,images:resutlImages, school, fileType:fileType ?? null});
    return fileTypeEntity;
  }

  findAll() {
    return `This action returns all file`;
  }

  findOne(id: number) {
    return `This action returns a #${id} file`;
  }

  update(id: number, updateFileDto: UpdateFileDto) {
    return `This action updates a #${id} file`;
  }

  remove(id: number) {
    return `This action removes a #${id} file`;
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

  async convertPdfToImages(pdfPath: string): Promise<{ files: string[]; totalSizeMB: number }> {
    try {
      const outputDir = path.join(__dirname, '../../public/images-convert');
      const outputDir2 = path.join(__dirname, '../../public');
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
      const outputFiles = newFiles.filter(file => file.endsWith('.png') && !existingFiles.has(file)).map(file => `images-convert/${file}`);

      // Tính tổng dung lượng các file
      let totalSize = 0;
      for (const file of outputFiles) {
        const stats = await fs.stat(path.join(outputDir2, file));
        totalSize += stats.size; // Kích thước file tính theo byte
      }
      const totalSizeMB = totalSize / (1024 * 1024); // Chuyển sang MB
      return { files: outputFiles, totalSizeMB };
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      throw new Error(error);
    }
  }
}
