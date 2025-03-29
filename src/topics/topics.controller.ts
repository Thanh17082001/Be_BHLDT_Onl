import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

import { Controller, Get, Post, Body, Put, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { Topic } from './entities/topic.entity';
import { RolesGuard } from 'src/role/role.guard';

@Controller('topic')
@UseGuards(RolesGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) { }

  @Post()
  @Roles(Role.TEACHER)
  create(@Body() createTopicDto: CreateTopicDto, @Req() request: Request) {
    const user = request['user'] ?? null;

    return this.topicsService.create(createTopicDto, user);
  }

  @Get()
  @Roles(Role.TEACHER)
  async findAll(@Query() pageOptionDto: PageOptionsDto, @Query() query: Partial<Topic>, @Req() request: Request) {
    const user = request['user'] ?? null;
    return this.topicsService.findAll(pageOptionDto, query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.topicsService.findOne(+id);
  }

  @Put(':id')
  @Roles(Role.TEACHER)
  update(@Param('id') id: string, @Body() updateTopicDto: UpdateTopicDto) {
    return this.topicsService.update(+id, updateTopicDto);
  }

  @Delete(':id')
  @Roles(Role.TEACHER)
  remove(@Param('id') id: string) {
    return this.topicsService.remove(+id);
  }
}
