import { PartialType } from '@nestjs/swagger';
import { CreateElearningThemeDto } from './create-elearning-theme.dto';

export class UpdateElearningThemeDto extends PartialType(CreateElearningThemeDto) {}
