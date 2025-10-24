import { Module } from '@nestjs/common';
import { ElearningVersionService } from './elearning-version.service';
import { ElearningVersionController } from './elearning-version.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElearningVersion } from './entities/elearning-version.entity';

@Module({
  imports:[TypeOrmModule.forFeature([ElearningVersion])],
  controllers: [ElearningVersionController],
  providers: [ElearningVersionService],
})
export class ElearningVersionModule {}
