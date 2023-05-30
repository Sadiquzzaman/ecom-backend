import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailParserDto, SystemException } from '@simec/ecom-common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  mailTransporter = async (
    parsedMail: MailParserDto,
    isFromAdmin = false,
  ): Promise<boolean> => {
    try {
      let transporter = null;

      let environment = this.configService.get('NODE_ENV');

      // if (environment == 'development') {
      //   transporter = nodemailer.createTransport({
      //     host: 'smtp.mailtrap.io',
      //     port: 2525,
      //     auth: {
      //       user: 'fae8bc5df2d364',
      //       pass: '55c91d6d049aa5',
      //     },
      //   });
      // } else {
      //   if (isFromAdmin) {
      //     transporter = nodemailer.createTransport({
      //       service: 'gmail',
      //       auth: {
      //         user: this.configService.get('MAIL_ADMIN_USER'),
      //         pass: this.configService.get('MAIL_ADMIN_USER_PASSWORD'),
      //       },
      //     });
      //   } else {
      //     transporter = nodemailer.createTransport({
      //       service: 'gmail',
      //       auth: {
      //         user: this.configService.get('MAIL_NO_REPLY_USER'),
      //         pass: this.configService.get('MAIL_NO_REPLY_USER_PASSWORD'),
      //       },
      //     });
      //   }
      // }

      if (isFromAdmin) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: this.configService.get('MAIL_ADMIN_USER'),
            pass: this.configService.get('MAIL_ADMIN_USER_PASSWORD'),
          },
        });
      } else {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: this.configService.get('MAIL_NO_REPLY_USER'),
            pass: this.configService.get('MAIL_NO_REPLY_USER_PASSWORD'),
          },
        });
      }

      await transporter.sendMail(parsedMail, (err, info) => {
        if (err) {
          try {
            this.logger.log(JSON.stringify(parsedMail));
            this.logger.log(err);
          } catch (err) {
            throw new SystemException({
              message: 'Mail is not being sent!!',
            });
          }
        } else {
          this.logger.log(info);
          return Promise.resolve(false);
        }
      });
      return Promise.resolve(false);
    } catch (error) {
      return Promise.resolve(false);
    }
  };
}
