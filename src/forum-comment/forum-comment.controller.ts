import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ForumCommentService } from './forum-comment.service';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';
import { UpdateForumCommentDto } from './dto/update-forum-comment.dto';
import { RolesGuard } from 'src/role/role.guard';
import { User } from 'src/users/entities/user.entity';
import { Public } from 'src/auth/auth.decorator';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';

@Controller('forum-comment')
@UseGuards(RolesGuard)
export class ForumCommentController {
  constructor(private readonly forumCommentService: ForumCommentService) { }

  @Post()
  @Roles(Role.TEACHER)
  create(@Body() createForumCommentDto: CreateForumCommentDto, @Req() request: Request) {
    const user: User = request['user'] ?? null;
    return this.forumCommentService.create(createForumCommentDto, user);
  }
  @Get(':id')
  @Roles(Role.TEACHER)
  async findByElearningId(@Param('id') id: string) {
    return this.forumCommentService.findByElearningId(+id);
  }
  @Get()
  findAll() {
    return this.forumCommentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.forumCommentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateForumCommentDto: UpdateForumCommentDto) {
    return this.forumCommentService.update(+id, updateForumCommentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.forumCommentService.remove(+id);
  }
}
