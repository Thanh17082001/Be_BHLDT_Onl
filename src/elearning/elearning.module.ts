import { Module } from '@nestjs/common';
import { ElearningService } from './elearning.service';
import { ElearningController } from './elearning.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Elearning } from './entities/elearning.entity';
import { SchoolsModule } from 'src/schools/schools.module';
import { Subject } from 'rxjs';
import { SubjectsModule } from 'src/subjects/subjects.module';
import { TopicsModule } from 'src/topics/topics.module';

@Module({
  imports:[TypeOrmModule.forFeature([Elearning]), SchoolsModule, SubjectsModule,TopicsModule], // Add your entities here
  controllers: [ElearningController],
  providers: [ElearningService],
  exports: [ElearningService, TypeOrmModule],
})
export class ElearningModule {}
