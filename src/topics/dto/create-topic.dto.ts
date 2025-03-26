import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsDateString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator'

export class CreateTopicDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    subjectId: number;

    @IsNumber()
    @IsNotEmpty()
    schoolId: number;
}
