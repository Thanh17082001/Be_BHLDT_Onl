import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { PageMetaDto } from './page.metadata.dto';

export class PageDto<T> {
    @IsArray()
    @ApiProperty({ isArray: true })
    readonly data: T[];

    @ApiProperty({ type: () => PageMetaDto })
    readonly meta: PageMetaDto;

    constructor(data: T[], meta: PageMetaDto) {
        this.data = data;
        this.meta = meta;
    }
}


export class ItemDto<T> {
    @IsArray()
    @ApiProperty()
    readonly data: T;


    constructor(data: T) {
        this.data = data;
    }
}
