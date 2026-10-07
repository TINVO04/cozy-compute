import nodemailer, { type Transporter } from 'nodemailer';
import type { FastifyBaseLogger } from 'fastify';
import type { Config } from '../config.js';

export interface Mailer {
  sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean>;
  verify(): Promise<boolean>;
}

export class NodemailerService implements Mailer {
  private transporter: Transporter | null = null;
  private from: string;
  private log?: FastifyBaseLogger;

  constructor(config: Config, log?: FastifyBaseLogger) {
    this.log = log;
    this.from = config.EMAIL_FROM || config.SMTP_USER || 'no-reply@cozy.local';
    if (config.SMTP_USER && config.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      });
    }
  }

  async verify(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (err) {
      this.log?.error({ err }, 'Failed to verify SMTP transporter');
      return false;
    }
  }

  async sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
    if (!this.transporter) {
      this.log?.warn({ toEmail, otpCode }, 'SMTP not configured; skipping email dispatch.');
      return false;
    }

    const mailOptions = {
      from: this.from,
      to: toEmail,
      subject: `[Cozy Compute] Mã OTP xác thực tài khoản: ${otpCode}`,
      text: `Xin chào!\nMã xác thực (OTP) tài khoản của bạn là: ${otpCode}\nMã có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho ai khác.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .header { text-align: center; margin-bottom: 24px; }
            .title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 6px; }
            .otp-box { text-align: center; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 20px; margin: 24px 0; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; font-family: monospace; }
            .info { font-size: 14px; color: #475569; line-height: 1.6; }
            .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 class="title">Cozy Social MMO</h1>
              <p class="subtitle">Xác thực tài khoản</p>
            </div>
            <p class="info">Xin chào,</p>
            <p class="info">Bạn vừa gửi yêu cầu xác thực tài khoản. Dưới đây là mã xác thực OTP của bạn:</p>
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>
            <p class="info">⏱️ Mã xác thực này có hiệu lực trong vòng <strong>5 phút</strong>.</p>
            <p class="info">🔒 Để đảm bảo an toàn, vui lòng <strong>không chia sẻ</strong> mã OTP này với bất kỳ ai.</p>
            <div class="footer">
              Nếu bạn không gửi yêu cầu xác thực tại Cozy Compute, vui lòng bỏ qua email này.
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.log?.info({ toEmail }, 'OTP email successfully delivered');
      return true;
    } catch (err) {
      this.log?.error({ err, toEmail }, 'Error sending OTP email');
      throw err;
    }
  }
}

export class FakeMailer implements Mailer {
  sentEmails: Array<{ to: string; otp: string }> = [];

  async sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
    this.sentEmails.push({ to: toEmail, otp: otpCode });
    return true;
  }

  async verify(): Promise<boolean> {
    return true;
  }
}
