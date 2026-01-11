import nodemailer, { Transporter } from 'nodemailer';

/**
 * Email service configuration using Nodemailer
 */

let transporter: Transporter | null = null;

/**
 * Initialize email transporter
 */
export function initializeEmailTransporter(config: {
  host: string;
  port: number;
  user: string;
  pass: string;
}): void {
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  console.log('✅ Email transporter initialized');
}

/**
 * Get email transporter instance
 */
export function getEmailTransporter(): Transporter {
  if (!transporter) {
    throw new Error('Email transporter not initialized');
  }
  return transporter;
}

/**
 * Send email
 * @param to Recipient email address
 * @param subject Email subject
 * @param html Email HTML content
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const emailTransporter = getEmailTransporter();

  await emailTransporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });

  console.log(`📧 Email sent to ${to}`);
}
