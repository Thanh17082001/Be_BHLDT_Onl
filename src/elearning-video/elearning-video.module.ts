import { Module } from '@nestjs/common';
import { ElearningVideoService } from './elearning-video.service';
import { ElearningVideoController } from './elearning-video.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElearningVideo } from './entities/elearning-video.entity';
import { SchoolsModule } from 'src/schools/schools.module';
import { ElearningModule } from 'src/elearning/elearning.module';

@Module({
  imports: [TypeOrmModule.forFeature([ElearningVideo]), SchoolsModule, ElearningModule],
  controllers: [ElearningVideoController],
  providers: [ElearningVideoService],
  exports: [ElearningVideoService, TypeOrmModule],
})
export class ElearningVideoModule {}
