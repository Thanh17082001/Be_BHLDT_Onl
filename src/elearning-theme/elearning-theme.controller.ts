import { ElearningThemeService } from './elearning-theme.service';
import { CreateElearningThemeDto } from './dto/create-elearning-theme.dto';
import { UpdateElearningThemeDto } from './dto/update-elearning-theme.dto';



import { Controller, Get, Post, Body, Put, Param, Delete, Query, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { User } from 'src/users/entities/user.entity';
import { RolesGuard } from 'src/role/role.guard';
import { Public } from 'src/auth/auth.decorator';
import { ElearningTheme } from './entities/elearning-theme.entity';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions, storage } from 'src/config/multer';

@Controller('elearning-theme')
@UseGuards(RolesGuard)
@Roles(Role.TEACHER)

export class ElearningThemeController {
  constructor(private readonly elearningThemeService: ElearningThemeService) { }

 @Post()
      @ApiOperation({ summary: 'Upload file' })
       @ApiConsumes('multipart/form-data')
       @ApiBody({
         description: 'File upload',
         type: CreateElearningThemeDto,
       })
       @UseInterceptors(FileInterceptor('file', { storage: storage('elearning-theme', true), ...multerOptions }))
  create(@UploadedFile() file: Express.Multer.File,@Body() createElearningThemeDto: CreateElearningThemeDto, @Req() request: Request) {
   const user: User = request['user'] ?? null;
   createElearningThemeDto.path = `public/elearning-theme/${file.filename}`;
    return this.elearningThemeService.create(createElearningThemeDto, user);
  }

  @Get()
  // @Roles(Role.TEACHER)
  async findAll(@Query() pageOptionDto: PageOptionsDto, @Query() query: Partial<ElearningTheme>, @Req() request: Request) {
    const user = request['user'] ?? null;
    return this.elearningThemeService.findAll(pageOptionDto, query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.elearningThemeService.findOne(+id);
  }

  @Put(':id')
  // @Roles(Role.TEACHER)
  update(@Param('id') id: string, @Body() updatelearningThemeDto: UpdateElearningThemeDto) {
    return this.elearningThemeService.update(+id, updatelearningThemeDto);
  }

  @Delete(':id')
  // @Roles(Role.TEACHER)
  remove(@Param('id') id: string, @Req() request: Request) {
    const user = request['user'] ?? null;
    return this.elearningThemeService.remove(+id, user);
  }
}



