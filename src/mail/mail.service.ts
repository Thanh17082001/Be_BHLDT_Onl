import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateMailDto } from './dto/create-mail.dto';
import { UpdateMailDto } from './dto/update-mail.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}
  create(createMailDto: CreateMailDto) {
    return 'This action adds a new mail';
  }

  findAll() {
    return `This action returns all mail`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mail`;
  }

  update(id: number, updateMailDto: UpdateMailDto) {
    return `This action updates a #${id} mail`;
  }

  remove(id: number) {
    return `This action removes a #${id} mail`;
  }

  async sendMail(mailAddress: string, mailName: string, content: string, file?: Express.Multer.File) {
    try {
      await this.mailerService.sendMail({
        to: mailAddress,
        subject: mailName,
        text: content,
        attachments: file
          ? [
            {
              filename: file.originalname,
              content: file.buffer,
            },
          ]
          : [],
      });

      return { message: 'Email sent successfully!' };
    } catch (error) {
      console.error('Send mail error:', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
