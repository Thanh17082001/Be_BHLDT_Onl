import { ApiProperty, OmitType } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { BaseDto } from "src/common/dto/base.dto";

export class CreateElearningVideoDto extends OmitType(BaseDto, [] as const) {
    @ApiProperty()
    @IsString()
    name: string;

    path?: string = '';
    @ApiProperty()
    @IsString()
    elearning_id: number;
    @ApiProperty()

    @IsString()
    page: number;

    @ApiProperty({ type: 'string', format: 'binary', required: false })
    file?: any;

    linkFile: string;

    minetype: string = '';
}
