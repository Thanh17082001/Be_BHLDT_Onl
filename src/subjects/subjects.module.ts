import { Module } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { GradeModule } from 'src/grade/grade.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subject]), GradeModule],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports:[TypeOrmModule, SubjectsService]
})
export class SubjectsModule {}
