import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function sendAlertEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Mailer] SMTP not configured, skipping email');
    return;
  }
  try {
    await transporter.sendMail({
      from: `"民宿看板" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Mailer] Alert email sent to ${to}`);
  } catch (err) {
    console.error('[Mailer] Failed to send email:', err);
  }
}
