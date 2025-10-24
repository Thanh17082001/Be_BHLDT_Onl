import { Injectable } from '@nestjs/common';
import { CreateElearningVersionDto } from './dto/create-elearning-version.dto';
import { UpdateElearningVersionDto } from './dto/update-elearning-version.dto';

@Injectable()
export class ElearningVersionService {
  create(createElearningVersionDto: CreateElearningVersionDto) {
    return 'This action adds a new elearningVersion';
  }

  findAll() {
    return `This action returns all elearningVersion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} elearningVersion`;
  }

  update(id: number, updateElearningVersionDto: UpdateElearningVersionDto) {
    return `This action updates a #${id} elearningVersion`;
  }

  remove(id: number) {
    return `This action removes a #${id} elearningVersion`;
  }
}
