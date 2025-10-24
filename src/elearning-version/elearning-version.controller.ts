import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ElearningVersionService } from './elearning-version.service';
import { CreateElearningVersionDto } from './dto/create-elearning-version.dto';
import { UpdateElearningVersionDto } from './dto/update-elearning-version.dto';

@Controller('elearning-version')
export class ElearningVersionController {
  constructor(private readonly elearningVersionService: ElearningVersionService) {}

  @Post()
  create(@Body() createElearningVersionDto: CreateElearningVersionDto) {
    return this.elearningVersionService.create(createElearningVersionDto);
  }

  @Get()
  findAll() {
    return this.elearningVersionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.elearningVersionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateElearningVersionDto: UpdateElearningVersionDto) {
    return this.elearningVersionService.update(+id, updateElearningVersionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.elearningVersionService.remove(+id);
  }
}
