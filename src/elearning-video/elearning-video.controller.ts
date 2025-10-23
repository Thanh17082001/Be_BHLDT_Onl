import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ElearningVideoService } from './elearning-video.service';
import { CreateElearningVideoDto } from './dto/create-elearning-video.dto';
import { UpdateElearningVideoDto } from './dto/update-elearning-video.dto';
import { User } from 'src/users/entities/user.entity';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions, storage } from 'src/config/multer';
import { Public } from 'src/auth/auth.decorator';

@Controller('elearning-video')
export class ElearningVideoController {
  constructor(private readonly elearningVideoService: ElearningVideoService) { }

  @Post()
  @ApiOperation({ summary: 'Upload file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    type: CreateElearningVideoDto,
  })
  @UseInterceptors(FileInterceptor('file', { storage: storage('elearning', true), ...multerOptions }))
  create(@UploadedFile() file: Express.Multer.File, @Body() createElearningVideoDto: CreateElearningVideoDto, @Req() request: Request) {
    const user: User = request['user'] ?? null;
    if (file.mimetype == 'video/mp4') {
      createElearningVideoDto.minetype = 'video'
      createElearningVideoDto.path = `public/elearning/video/${file.filename}`;

    }
    else {
      createElearningVideoDto.minetype = 'image'
      createElearningVideoDto.path = `public/elearning/image/${file.filename}`;

    }
    console.log('tieas;lkda;slkd');
    return this.elearningVideoService.create(createElearningVideoDto, user);
  }


  @Patch(':id')
  update(@Param('id') id: string, @Body() updateElearningVideoDto: UpdateElearningVideoDto) {
    return this.elearningVideoService.update(+id, updateElearningVideoDto);
  }

  @Delete()
  remove(@Query('path') path: string) {
    return this.elearningVideoService.remove(path);
  }
}
