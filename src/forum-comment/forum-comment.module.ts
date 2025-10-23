import { Module } from '@nestjs/common';
import { ForumCommentService } from './forum-comment.service';
import { ForumCommentController } from './forum-comment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumComment } from './entities/forum-comment.entity';
import { Elearning } from 'src/elearning/entities/elearning.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ForumComment, Elearning])],
  controllers: [ForumCommentController],
  providers: [ForumCommentService],
})
export class ForumCommentModule {}
