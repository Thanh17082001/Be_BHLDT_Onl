// src/mail/mail.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'src/role/role.guard';
import { Public } from 'src/auth/auth.decorator';

@Controller('mail')
@UseGuards(RolesGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  async sendMail(
    @Body('mailAddress') mailAddress: string,
    @Body('mailName') mailName: string,
    @Body('content') content: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.mailService.sendMail(mailAddress, mailName, content, file);
  }
}
