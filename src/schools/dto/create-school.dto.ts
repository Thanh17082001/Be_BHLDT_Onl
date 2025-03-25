import { ApiProperty, OmitType } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { SchoolType } from "../entities/school.entity";
import { BaseDto } from "src/common/dto/base.dto";

export class CreateSchoolDto extends OmitType(BaseDto ,[] as const) {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ enum: SchoolType })
    @IsString()
    @IsNotEmpty()
    schoolType: SchoolType;

}
