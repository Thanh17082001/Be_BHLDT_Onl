import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';
import { UpdateForumCommentDto } from './dto/update-forum-comment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ForumComment } from './entities/forum-comment.entity';
import { Repository } from 'typeorm';
import { Elearning } from 'src/elearning/entities/elearning.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ForumCommentService {
  constructor(
    @InjectRepository(ForumComment) private repo: Repository<ForumComment>,
    @InjectRepository(Elearning) private repoElearning: Repository<Elearning>,
  ) { }
  async create(createForumCommentDto: CreateForumCommentDto, user: User) {
    const { elearningId, content } = createForumCommentDto

    const elearning = await this.repoElearning.findOne({ where: { id: elearningId } })
    if (!elearning) throw new NotFoundException('Không tìm thấy Elearning')

    const comment = this.repo.create({
      content,
      elearning,
      createdBy: user,
    });
    return this.repo.save(comment);
  }
  async findByElearningId(elearningId: number) {
    return this.repo.find({
      where: { elearning: { id: elearningId } },
      relations: ['createdBy'],
      order: { id: 'DESC' },
    });
  }
  findAll() {
    return `This action returns all forumComment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} forumComment`;
  }

  update(id: number, updateForumCommentDto: UpdateForumCommentDto) {
    return `This action updates a #${id} forumComment`;
  }

  remove(id: number) {
    return `This action removes a #${id} forumComment`;
  }
}
