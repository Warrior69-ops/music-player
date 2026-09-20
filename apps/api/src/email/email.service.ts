import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private fromAddress: string;
  private appName = 'Antigravity Music';

  constructor(private configService: ConfigService) {
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') || 'noreply@example.com';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<number>('SMTP_PORT') === 465, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  private generateBaseHtml(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #ffffff; padding: 40px 0; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #1e1e1e; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
          .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #333; margin-bottom: 20px; }
          .header h1 { color: #1DB954; margin: 0; font-size: 28px; }
          .content { line-height: 1.6; color: #e0e0e0; }
          .otp-box { background-color: #2a2a2a; border-left: 4px solid #1DB954; padding: 15px 20px; margin: 25px 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #ffffff; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #888; text-align: center; }
          .warning { color: #ff5252; font-size: 13px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.appName}</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            ${content}
          </div>
          <div class="footer">
            <p>This is an automated message from ${this.appName}. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendVerificationOTP(email: string, otp: string): Promise<void> {
    const html = this.generateBaseHtml(
      'Verify Your Email Address',
      `
      <p>Welcome to ${this.appName}! Please use the verification code below to complete your registration.</p>
      <div class="otp-box">${otp}</div>
      <p>This code will expire in <strong>10 minutes</strong>.</p>
      <p class="warning">If you did not create an account, please ignore this email.</p>
      `,
    );

    try {
      await this.transporter.sendMail({
        from: `"${this.appName}" <${this.fromAddress}>`,
        to: email,
        subject: `Verify your ${this.appName} account`,
        html,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
    }
  }

  async sendPasswordResetOTP(email: string, otp: string): Promise<void> {
    const html = this.generateBaseHtml(
      'Password Reset Request',
      `
      <p>We received a request to reset your password for your ${this.appName} account. Enter the following code to authorize the reset:</p>
      <div class="otp-box">${otp}</div>
      <p>This code will expire in <strong>10 minutes</strong>.</p>
      <p class="warning">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      `,
    );

    try {
      await this.transporter.sendMail({
        from: `"${this.appName}" <${this.fromAddress}>`,
        to: email,
        subject: `Reset your ${this.appName} password`,
        html,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
    }
  }
}
