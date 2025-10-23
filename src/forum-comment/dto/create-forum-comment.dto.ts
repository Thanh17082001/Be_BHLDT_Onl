import { ApiProperty, OmitType } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { BaseDto } from "src/common/dto/base.dto";

export class CreateForumCommentDto extends OmitType(BaseDto, [] as const) {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    elearningId: number;
}
