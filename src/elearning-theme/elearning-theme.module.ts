import { Module } from '@nestjs/common';
import { ElearningThemeService } from './elearning-theme.service';
import { ElearningThemeController } from './elearning-theme.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolsModule } from 'src/schools/schools.module';
import { ElearningTheme } from './entities/elearning-theme.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ElearningTheme]), SchoolsModule],
  controllers: [ElearningThemeController],
  providers: [ElearningThemeService],
  exports: [ElearningThemeService,TypeOrmModule],
})
export class ElearningThemeModule {}
