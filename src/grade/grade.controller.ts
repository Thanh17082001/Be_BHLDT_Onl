import { GradeService } from './grade.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';

import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { Grade } from './entities/grade.entity';

@Controller('grades')
export class GradeController {
  constructor(private readonly gradeService: GradeService) { }

  @Post()
  async create() {
    let createGradeDto: CreateGradeDto = new CreateGradeDto();
    let result = []
    const names: string[] = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    for(let i = 0; i < names.length; i++){
      createGradeDto.name = names[i];
      result.push(await this.gradeService.create(createGradeDto));
    }
    return result
  }

  @Get()
  async findAll(@Query() pageOptionDto: PageOptionsDto, @Query() query: Partial<Grade>) {
    return this.gradeService.findAll(pageOptionDto, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gradeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGradeDto: UpdateGradeDto) {
    return this.gradeService.update(+id, updateGradeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gradeService.remove(+id);
  }
}
