import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { School } from './entities/school.entity';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) { }

  @Post()
  create(@Body() createSchoolDto: CreateSchoolDto) {
    console.log(createSchoolDto);
    return this.schoolsService.create(createSchoolDto);
  }

  @Get()
  async findAll(@Query() pageOptionDto: PageOptionsDto, @Query() query: Partial<School>) {
    return this.schoolsService.findAll(pageOptionDto, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolsService.update(+id, updateSchoolDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schoolsService.remove(+id);
  }
}
