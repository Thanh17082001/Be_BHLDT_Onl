import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { Subject } from './entities/subject.entity';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly examplesService: SubjectsService) { }

  @Post()
  create(@Body() createSubjectDto: CreateSubjectDto) {
    return this.examplesService.create(createSubjectDto);
  }

  @Get()
  async findAll(@Query() pageOptionDto: PageOptionsDto, @Query() query: Partial<Subject>) {
    return this.examplesService.findAll(pageOptionDto, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examplesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSubjectDto: UpdateSubjectDto) {
    return this.examplesService.update(+id, updateSubjectDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examplesService.remove(+id);
  }
}

