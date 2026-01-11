import { getEmailTransporter } from '../config/email.config';

/**
 * Email Service
 * Handles email sending for various application events
 */

export class EmailService {
  /**
   * Send welcome email to new user
   * @param email Recipient email
   * @param fullName User's full name
   */
  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    const transporter = getEmailTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Solar Planner!',
      html: `
        <h1>Welcome, ${fullName}!</h1>
        <p>Thank you for joining Solar Planner.</p>
        <p>You can now start planning your solar energy projects.</p>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br/>The Solar Planner Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send password reset email
   * @param email Recipient email
   * @param resetUrl Password reset URL with token
   */
  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const transporter = getEmailTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your Password - Solar Planner',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password for Solar Planner.</p>
        <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
        <p><a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br/>The Solar Planner Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send password changed confirmation email
   * @param email Recipient email
   * @param fullName User's full name
   */
  async sendPasswordChangedEmail(email: string, fullName: string): Promise<void> {
    const transporter = getEmailTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Changed - Solar Planner',
      html: `
        <h1>Password Changed Successfully</h1>
        <p>Hi ${fullName},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <p>Best regards,<br/>The Solar Planner Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send project created notification
   * @param email Recipient email
   * @param projectName Project name
   */
  async sendProjectCreatedEmail(email: string, projectName: string): Promise<void> {
    const transporter = getEmailTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Project Created: ${projectName} - Solar Planner`,
      html: `
        <h1>Project Created Successfully</h1>
        <p>Your project "${projectName}" has been created successfully.</p>
        <p>You can now start adding panels and configuring your solar energy system.</p>
        <p>Best regards,<br/>The Solar Planner Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  }
}

export const emailService = new EmailService();
