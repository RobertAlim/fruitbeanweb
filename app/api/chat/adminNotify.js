// app/api/chat/adminNotify.js
//
// Notifies active admins by email when a chat is escalated to a human,
// mirroring the existing sendProblemReportedEmail pattern in emails.js.
// This is best-effort: failures here never block saving the message or
// escalating the conversation, since admins will also see it live in the
// dashboard.

import { getPool } from '@/lib/db';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS =
  process.env.SMTP_FROM || 'Fruitbean Ink Refilling Station <fruitbean@gmail.com>';

export async function getActiveAdminEmails() {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT email FROM clients WHERE account_type = 'admin' AND account_status = true`
  );
  return rows.map(r => r.email).filter(Boolean);
}

export async function notifyAdminsOfEscalation({ conversation }) {
  const adminEmails = await getActiveAdminEmails();
  if (adminEmails.length === 0) return { success: false, message: 'No admin emails to notify.' };

  const who = conversation.visitor_name || conversation.client_company_name || 'A visitor';

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: FROM_ADDRESS,
      bcc: adminEmails,
      subject: `💬 Live chat needs a human — ${who}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a8fd1;">💬 A chat needs a human</h2>
          <p><strong>${who}</strong> asked for (or was routed to) a team member in live chat.</p>
          <p>Log in to the admin dashboard and open <strong>Live Chat</strong> to jump in — any admin can respond.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Fruitbean Ink Refilling Station — 6223 Tramo St. San Dionisio, Parañaque, Philippines
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('notifyAdminsOfEscalation email error:', err);
    return { success: false, message: 'Could not notify admins by email.' };
  }
}
