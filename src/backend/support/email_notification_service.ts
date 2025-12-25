/**
 * Email Notification Service for Support System
 *
 * Sends email notifications when:
 * - New support ticket is created
 * - Admin replies to ticket
 * - Ticket status changes
 */

import nodemailer from 'nodemailer';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('EmailNotificationService');

// Email transporter configuration
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    logger.warn('Email notifications disabled: SMTP credentials not configured');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    logger.info('Email transporter initialized successfully');
    return transporter;
  } catch (error) {
    logger.error('Failed to initialize email transporter', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Send email notification for new support ticket
 */
export async function sendNewTicketNotification(
  userEmail: string,
  userName: string,
  ticketNumber: string,
  subject: string,
  category: string
): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    return false;
  }

  try {
    const mailOptions = {
      from: `"TIME Support" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Support Ticket Created: ${ticketNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">TIME BEYOND US</h1>
            <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 14px;">Support Center</p>
          </div>

          <div style="background: #1e293b; padding: 30px; border-radius: 0 0 10px 10px; color: #e2e8f0;">
            <h2 style="color: #7c3aed; margin-top: 0;">Ticket Created Successfully</h2>

            <p>Hi ${userName},</p>

            <p>Your support ticket has been created and our team has been notified. We'll get back to you as soon as possible.</p>

            <div style="background: #0f172a; border: 2px solid #7c3aed; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong style="color: #7c3aed;">Ticket Number:</strong> ${ticketNumber}</p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #7c3aed;">Subject:</strong> ${subject}</p>
              <p style="margin: 0;"><strong style="color: #7c3aed;">Category:</strong> ${category}</p>
            </div>

            <p><strong>What happens next?</strong></p>
            <ul style="line-height: 1.8;">
              <li>Our support team will review your ticket</li>
              <li>You'll receive a response within 1-2 hours during business hours</li>
              <li>You can view and update your ticket in the Support Center</li>
              <li>We'll send you email notifications for any updates</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/support" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Ticket
              </a>
            </div>

            <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
              Need immediate assistance? Try our 24/7 AI Chat Support in the platform!
            </p>
          </div>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    logger.info('New ticket notification sent', { ticketNumber, userEmail });
    return true;
  } catch (error) {
    logger.error('Failed to send new ticket notification', {
      error: error instanceof Error ? error.message : String(error),
      ticketNumber,
    });
    return false;
  }
}

/**
 * Send email notification for admin reply to ticket
 */
export async function sendAdminReplyNotification(
  userEmail: string,
  userName: string,
  ticketNumber: string,
  subject: string,
  replyMessage: string
): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    return false;
  }

  try {
    const mailOptions = {
      from: `"TIME Support" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Response to Ticket ${ticketNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">TIME BEYOND US</h1>
            <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 14px;">Support Center</p>
          </div>

          <div style="background: #1e293b; padding: 30px; border-radius: 0 0 10px 10px; color: #e2e8f0;">
            <h2 style="color: #7c3aed; margin-top: 0;">New Response to Your Ticket</h2>

            <p>Hi ${userName},</p>

            <p>Our support team has responded to your ticket.</p>

            <div style="background: #0f172a; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0;">
              <p style="margin: 0 0 5px 0; color: #94a3b8; font-size: 12px;">Ticket #${ticketNumber} - ${subject}</p>
              <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${replyMessage}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/support" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View & Reply
              </a>
            </div>

            <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    logger.info('Admin reply notification sent', { ticketNumber, userEmail });
    return true;
  } catch (error) {
    logger.error('Failed to send admin reply notification', {
      error: error instanceof Error ? error.message : String(error),
      ticketNumber,
    });
    return false;
  }
}

/**
 * Send email notification for ticket status change
 */
export async function sendTicketStatusNotification(
  userEmail: string,
  userName: string,
  ticketNumber: string,
  subject: string,
  newStatus: string
): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    return false;
  }

  const statusMessages: Record<string, string> = {
    open: 'Your ticket has been opened and is awaiting review.',
    in_progress: 'Your ticket is being actively worked on by our support team.',
    waiting_response: 'Our support team has responded. Please check your ticket for details.',
    resolved: 'Your ticket has been marked as resolved. If you need further assistance, feel free to reply.',
    closed: 'Your ticket has been closed. Thank you for contacting TIME support!',
  };

  try {
    const mailOptions = {
      from: `"TIME Support" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Ticket ${ticketNumber} Status Updated: ${newStatus.replace('_', ' ')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">TIME BEYOND US</h1>
            <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 14px;">Support Center</p>
          </div>

          <div style="background: #1e293b; padding: 30px; border-radius: 0 0 10px 10px; color: #e2e8f0;">
            <h2 style="color: #7c3aed; margin-top: 0;">Ticket Status Updated</h2>

            <p>Hi ${userName},</p>

            <p>The status of your support ticket has been updated.</p>

            <div style="background: #0f172a; border: 2px solid #7c3aed; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong style="color: #7c3aed;">Ticket:</strong> #${ticketNumber}</p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #7c3aed;">Subject:</strong> ${subject}</p>
              <p style="margin: 0;"><strong style="color: #7c3aed;">New Status:</strong> <span style="color: #22d3ee; text-transform: uppercase;">${newStatus.replace('_', ' ')}</span></p>
            </div>

            <p>${statusMessages[newStatus] || 'Your ticket status has been updated.'}</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/support" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Ticket
              </a>
            </div>

            <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    logger.info('Ticket status notification sent', { ticketNumber, newStatus, userEmail });
    return true;
  } catch (error) {
    logger.error('Failed to send ticket status notification', {
      error: error instanceof Error ? error.message : String(error),
      ticketNumber,
    });
    return false;
  }
}

/**
 * Send notification to admin when new ticket is created
 */
export async function sendAdminNewTicketAlert(
  ticketNumber: string,
  subject: string,
  category: string,
  priority: string,
  userName: string,
  userEmail: string
): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    return false;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn('Admin email not configured, skipping admin notification');
    return false;
  }

  try {
    const mailOptions = {
      from: `"TIME Support System" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `🎫 New Support Ticket: ${ticketNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ef4444; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎫 NEW SUPPORT TICKET</h1>
          </div>

          <div style="background: #1e293b; padding: 30px; border-radius: 0 0 10px 10px; color: #e2e8f0;">
            <h2 style="color: #ef4444; margin-top: 0;">Action Required</h2>

            <p>A new support ticket has been created and requires attention.</p>

            <div style="background: #0f172a; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong style="color: #ef4444;">Ticket Number:</strong> ${ticketNumber}</p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #ef4444;">Subject:</strong> ${subject}</p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #ef4444;">Category:</strong> ${category}</p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #ef4444;">Priority:</strong> <span style="text-transform: uppercase;">${priority}</span></p>
              <p style="margin: 0 0 10px 0; padding-top: 10px; border-top: 1px solid #334155;"><strong style="color: #7c3aed;">User:</strong> ${userName}</p>
              <p style="margin: 0;"><strong style="color: #7c3aed;">Email:</strong> ${userEmail}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/admin/support" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View in Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    logger.info('Admin notification sent for new ticket', { ticketNumber });
    return true;
  } catch (error) {
    logger.error('Failed to send admin notification', {
      error: error instanceof Error ? error.message : String(error),
      ticketNumber,
    });
    return false;
  }
}
