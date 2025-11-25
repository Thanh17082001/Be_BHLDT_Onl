import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsDateString, IsOptional, Min, IsEmpty, MinLength, IsNotEmpty, IsNumber, IsArray } from 'class-validator'
export class CreateUserDto {
    @ApiProperty()
    @IsString()
    fullName: string;

    @ApiProperty()
    @IsString()
    username?: string;
    @ApiProperty()
    @IsString()
    password: string;


    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    schoolId: number;
    @ApiProperty()
    @IsArray()
    gradeIds: number[];
    @ApiProperty()
    @IsArray()
    subjectIds: number[];
    @ApiProperty({example: false})
    @IsOptional()
    isAdmin?: boolean = false;
    @ApiProperty()
    @IsOptional()
    role: string = 'Giáo viên';

}
