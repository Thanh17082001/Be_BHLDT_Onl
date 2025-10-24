import { Module } from '@nestjs/common';
import { ElearningService } from './elearning.service';
import { ElearningController } from './elearning.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Elearning } from './entities/elearning.entity';
import { SchoolsModule } from 'src/schools/schools.module';
import { Subject } from 'rxjs';
import { SubjectsModule } from 'src/subjects/subjects.module';
import { TopicsModule } from 'src/topics/topics.module';
import { UsersModule } from 'src/users/users.module';
import { ForumComment } from 'src/forum-comment/entities/forum-comment.entity';
import { ElearningVersion } from 'src/elearning-version/entities/elearning-version.entity';
import { ElearningVersionModule } from 'src/elearning-version/elearning-version.module';

@Module({
  imports:[TypeOrmModule.forFeature([Elearning, ForumComment, ElearningVersion]), SchoolsModule, SubjectsModule,TopicsModule, UsersModule, ElearningVersionModule], // Add your entities here
  controllers: [ElearningController],
  providers: [ElearningService],
  exports: [ElearningService, TypeOrmModule],
})
export class ElearningModule {}
