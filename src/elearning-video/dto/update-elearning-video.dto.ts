import { PartialType } from '@nestjs/swagger';
import { CreateElearningVideoDto } from './create-elearning-video.dto';

export class UpdateElearningVideoDto extends PartialType(CreateElearningVideoDto) {}
