// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        service: 'gmail',
        auth: {
          user: 'hoangconghieu1903@gmail.com',
          pass: 'ulsxqjtkonzpvnqi'
        },
      },
      defaults: {
        from: '"No Reply" <no-reply@example.com>',
      },
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
})
export class MailModule {}
