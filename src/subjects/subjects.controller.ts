import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

import { Controller, Get, Post, Body, Put, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { Subject } from './entities/subject.entity';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { User } from 'src/users/entities/user.entity';
import { RolesGuard } from 'src/role/role.guard';

@Controller('subject')
@UseGuards(RolesGuard)

export class SubjectsController {
  constructor(private readonly examplesService: SubjectsService) { }

  @Post()
  @Roles(Role.TEACHER)
  create(@Body() createSubjectDto: CreateSubjectDto, @Req() request: Request) {
    const user: User = request['user'] ?? null;
    return this.examplesService.create(createSubjectDto, user);
  }

  @Get()
  @Roles(Role.TEACHER)
  async findAll(@Query() pageOptionDto: PageOptionsDto, @Query() query: Partial<Subject>, @Req() request: Request) {
    const user = request['user'] ?? null;
    return this.examplesService.findAll(pageOptionDto, query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examplesService.findOne(+id);
  }

  @Put(':id')
  @Roles(Role.TEACHER)
  update(@Param('id') id: string, @Body() updateSubjectDto: UpdateSubjectDto) {
    return this.examplesService.update(+id, updateSubjectDto);
  }

  @Delete(':id')
  @Roles(Role.TEACHER)

  remove(@Param('id') id: string) {
    return this.examplesService.remove(+id);
  }
}

