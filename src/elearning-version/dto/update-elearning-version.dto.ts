import { PartialType } from '@nestjs/swagger';
import { CreateElearningVersionDto } from './create-elearning-version.dto';

export class UpdateElearningVersionDto extends PartialType(CreateElearningVersionDto) {}
