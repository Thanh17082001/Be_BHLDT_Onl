import { CreateElearningVideoDto } from './dto/create-elearning-video.dto';
import { UpdateElearningVideoDto } from './dto/update-elearning-video.dto';




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

import { ElearningVideo } from './entities/elearning-video.entity';
import { Elearning } from 'src/elearning/entities/elearning.entity';
import * as path from 'path';
import { existsSync, statSync, unlinkSync, promises as fs } from 'fs';

@Injectable()
export class ElearningVideoService {
  constructor(
    @InjectRepository(ElearningVideo) private repo: Repository<ElearningVideo>,
    @InjectRepository(School) private repoSchool: Repository<School>,
    @InjectRepository(Elearning) private repoElearning: Repository<Elearning>,
  ) { }
  async create(
    createElearningVideoDto: CreateElearningVideoDto,
    user: User,
  ): Promise<ElearningVideo> {
    const { name, schoolId, path ,elearning_id, page, minetype} = createElearningVideoDto;

    createElearningVideoDto.schoolId = user?.school?.id;
    const school = await this.repoSchool.findOne({
      where: { id: schoolId },
    });
    const elearning = await this.repoElearning.findOne({
      where: { id: elearning_id },
    });
  
    if (!elearning) {
      throw new NotFoundException(`Không tìm thấy bài giảng điện tử`);
    }

    const newElearningVideo = this.repo.create({
      name,
      path,
      elearning,
      page,
      minetype,
      createdBy: user,
      school: school,
    });
    return await this.repo.save(newElearningVideo);
  }

  

  async update(id: number, updateElearningVideoDto: UpdateElearningVideoDto) {
    const { name, path, elearning_id, page } = updateElearningVideoDto;


    const example: ElearningVideo = await this.repo.findOne({ where: { id } });

    if (!example) {
      throw new NotFoundException(`ElearningVideo with ID ${id} not found`);
    }

    const elearning = await this.repoElearning.findOne({
      where: { id: elearning_id },
    });


    this.repo.merge(example, { name, path, elearning, page });

    await this.repo.update(id, example);

    return new ItemDto(example);
  }

  async remove(path2: string) {
    const result = await this.repo.delete({ path: path2 });
    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy tài nguyên');
    }

    const filePath = path.join(__dirname, '..', '..', 'public', path2);

    // Kiểm tra và xóa file
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath); // Xoá đồng bộ
      } catch (err) {
        console.error('Lỗi khi xoá file:', err);
        // Tuỳ chọn: throw new InternalServerErrorException('Không thể xoá file vật lý');
      }
    }

    return new ItemDto({ message: 'Xóa thành công', affected: result.affected });
  }
}
