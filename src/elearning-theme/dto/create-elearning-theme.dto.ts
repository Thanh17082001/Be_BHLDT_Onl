import { ApiProperty, OmitType } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { BaseDto } from "src/common/dto/base.dto";

export class CreateElearningThemeDto extends OmitType(BaseDto, [] as const) {
    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    content: string;

    @ApiProperty({ required: false })
    @IsOptional()
    path?: string = '';

    @ApiProperty()
    file?: Express.Multer.File
}
