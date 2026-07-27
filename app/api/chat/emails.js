import nodemailer from 'nodemailer';

// SMTP transporter — configure via env vars:
//   SMTP_HOST   e.g. smtp.gmail.com
//   SMTP_PORT   e.g. 465 (SSL) or 587 (STARTTLS)
//   SMTP_SECURE 'true' for port 465, 'false' for port 587
//   SMTP_USER   your SMTP username / email
//   SMTP_PASS   your SMTP password / app password
//   SMTP_FROM   optional, defaults to the address below
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

export async function sendWelcomeEmail({ email, companyName, plainPassword }) {
  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: 'Your Fruitbean account is ready',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #3ab549;">Welcome to Fruitbean, ${companyName}!</h2>
          <p>Your printer rental account has been created. You can log in anytime to view your printers and report any issues.</p>
          <table style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <tr><td style="padding: 4px 12px;"><strong>Email:</strong></td><td>${email}</td></tr>
            <tr><td style="padding: 4px 12px;"><strong>Temporary password:</strong></td><td>${plainPassword}</td></tr>
          </table>
          <p>We recommend logging in and keeping this password somewhere safe.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Fruitbean Ink Refilling Station — 6223 Tramo St. San Dionisio, Parañaque, Philippines
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('sendWelcomeEmail error:', err);
    return { success: false, message: 'Account created, but the email could not be sent.' };
  }
}

export async function sendPasswordResetEmail({ email, companyName, resetLink }) {
  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: 'Reset your Fruitbean password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #3ab549;">Password Reset Request</h2>
          <p>Hi ${companyName}, we received a request to reset the password on your Fruitbean account.</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background: #3ab549; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
          </p>
          <p style="color: #666; font-size: 13px;">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password won't change.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Fruitbean Ink Refilling Station — 6223 Tramo St. San Dionisio, Parañaque, Philippines
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('sendPasswordResetEmail error:', err);
    return { success: false, message: 'Could not send the reset email.' };
  }
}

// Notifies every active admin when a client reports a problem with a rental.
// adminEmails: string[] — sent via bcc so admins don't see each other's addresses.
export async function sendProblemReportedEmail({
  adminEmails, companyName, printerModel, problemTypes, urgency, notes, rentalId,
}) {
  if (!Array.isArray(adminEmails) || adminEmails.length === 0) {
    return { success: false, message: 'No admin emails to notify.' };
  }

  const urgencyColor = urgency === 'high' ? '#e53e3e' : urgency === 'medium' ? '#dd8b00' : '#3ab549';

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: FROM_ADDRESS,
      bcc: adminEmails,
      subject: `⚠️ Problem Reported — ${companyName} (${printerModel})`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #e53e3e;">⚠️ New Problem Reported</h2>
          <p><strong>${companyName}</strong> just reported an issue with their <strong>${printerModel}</strong>.</p>
          <table style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; width: 100%;">
            <tr><td style="padding: 4px 12px;"><strong>Rental ID:</strong></td><td>#${rentalId}</td></tr>
            <tr><td style="padding: 4px 12px;"><strong>Issue type(s):</strong></td><td>${(problemTypes || []).join(', ')}</td></tr>
            <tr><td style="padding: 4px 12px;"><strong>Urgency:</strong></td><td><span style="color: ${urgencyColor}; font-weight: 700; text-transform: capitalize;">${urgency || 'medium'}</span></td></tr>
            ${notes ? `<tr><td style="padding: 4px 12px; vertical-align: top;"><strong>Notes:</strong></td><td>${notes}</td></tr>` : ''}
          </table>
          <p>Please log in to the admin dashboard to assign a technician or resolve this.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Fruitbean Ink Refilling Station — 6223 Tramo St. San Dionisio, Parañaque, Philippines
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('sendProblemReportedEmail error:', err);
    return { success: false, message: 'Could not notify admins.' };
  }
}

// Notifies the client once an admin marks their problem as resolved, and
// asks them to confirm the fix actually worked.
// Notifies every existing active admin when someone submits a request for
// a new admin account, so it doesn't just sit unnoticed in the dashboard.
export async function sendAdminApprovalRequestEmail({ adminEmails, requesterName, requesterEmail }) {
  if (!Array.isArray(adminEmails) || adminEmails.length === 0) {
    return { success: false, message: 'No admin emails to notify.' };
  }

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: FROM_ADDRESS,
      bcc: adminEmails,
      subject: `🔔 New Admin Account Request — ${requesterName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #3ab549;">🔔 New Admin Account Request</h2>
          <p><strong>${requesterName}</strong> (${requesterEmail}) has requested an admin account and is waiting for approval.</p>
          <p>Log in to the admin dashboard to review and approve or reject this request.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Fruitbean Ink Refilling Station — 6223 Tramo St. San Dionisio, Parañaque, Philippines
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('sendAdminApprovalRequestEmail error:', err);
    return { success: false, message: 'Could not notify admins.' };
  }
}

// Notifies the requester once an existing admin approves their account.
export async function sendAdminApprovedEmail({ email, name }) {
  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: 'Your Fruitbean admin account has been approved',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #3ab549;">✅ Account Approved</h2>
          <p>Hi ${name}, your admin account request has been approved. You can now log in with the email and password you signed up with.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Fruitbean Ink Refilling Station — 6223 Tramo St. San Dionisio, Parañaque, Philippines
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('sendAdminApprovedEmail error:', err);
    return { success: false, message: 'Could not notify the requester.' };
  }
}

// ── Contract expiry reminders ──────────────────────────────────────────────
// Sent to the client (and bcc'd to admins, so the team can proactively
// follow up on renewals) at three checkpoints: 30 days left, 7 days left,
// and 1 day left / expired. Triggered by /api/contracts/check-notifications.

function contractEmailShell({ accentColor, heading, bodyHtml }) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: ${accentColor};">${heading}</h2>
      ${bodyHtml}
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        Fruitbean Ink Refilling Station — 6223 Tramo St. San Dionisio, Parañaque, Philippines
      </p>
    </div>
  `;
}

function fmtContractDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// 30 days left — friendly heads-up, plenty of time to plan a renewal.
export async function sendContract30DaysEmail({
  email, companyName, printerModel, rentalId, contractEnd, adminEmails,
}) {
  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      bcc: adminEmails?.length ? adminEmails : undefined,
      subject: `🟡 30 days left on your ${printerModel} rental contract`,
      html: contractEmailShell({
        accentColor: '#dd8b00',
        heading: '🟡 Contract Reminder — 30 Days Left',
        bodyHtml: `
          <p>Hi ${companyName}, this is a heads-up that the rental contract for your <strong>${printerModel}</strong> (Rental #${rentalId}) is set to end on <strong>${fmtContractDate(contractEnd)}</strong> — about 30 days from now.</p>
          <p>No action is needed yet, but feel free to reach out anytime if you'd like to discuss renewing early.</p>
        `,
      }),
    });
    return { success: true };
  } catch (err) {
    console.error('sendContract30DaysEmail error:', err);
    return { success: false, message: 'Could not send the 30-day contract reminder.' };
  }
}

// 7 days left — more urgent tone, encourages contacting the team soon.
export async function sendContract7DaysEmail({
  email, companyName, printerModel, rentalId, contractEnd, adminEmails,
}) {
  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      bcc: adminEmails?.length ? adminEmails : undefined,
      subject: `🔴 Only 7 days left on your ${printerModel} rental contract`,
      html: contractEmailShell({
        accentColor: '#e53e3e',
        heading: '🔴 Contract Reminder — 7 Days Left',
        bodyHtml: `
          <p>Hi ${companyName}, the rental contract for your <strong>${printerModel}</strong> (Rental #${rentalId}) ends on <strong>${fmtContractDate(contractEnd)}</strong> — just 7 days from now.</p>
          <p><strong>Please get in touch soon</strong> if you'd like to renew, so we can avoid any interruption to your service.</p>
        `,
      }),
    });
    return { success: true };
  } catch (err) {
    console.error('sendContract7DaysEmail error:', err);
    return { success: false, message: 'Could not send the 7-day contract reminder.' };
  }
}

// 1 day left / already expired — final notice.
export async function sendContractExpiredEmail({
  email, companyName, printerModel, rentalId, contractEnd, alreadyExpired, adminEmails,
}) {
  const heading = alreadyExpired
    ? '📦 Contract Expired'
    : '⏰ Contract Reminder — 1 Day Left';
  const intro = alreadyExpired
    ? `the rental contract for your <strong>${printerModel}</strong> (Rental #${rentalId}) ended on <strong>${fmtContractDate(contractEnd)}</strong>.`
    : `the rental contract for your <strong>${printerModel}</strong> (Rental #${rentalId}) ends tomorrow, <strong>${fmtContractDate(contractEnd)}</strong>.`;

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      bcc: adminEmails?.length ? adminEmails : undefined,
      subject: alreadyExpired
        ? `📦 Your ${printerModel} rental contract has expired`
        : `⏰ Last day: your ${printerModel} rental contract ends tomorrow`,
      html: contractEmailShell({
        accentColor: '#e53e3e',
        heading,
        bodyHtml: `
          <p>Hi ${companyName}, ${intro}</p>
          <p><strong>Please contact us as soon as possible</strong> to renew your contract or arrange a pickup for the unit.</p>
        `,
      }),
    });
    return { success: true };
  } catch (err) {
    console.error('sendContractExpiredEmail error:', err);
    return { success: false, message: 'Could not send the contract expiry notice.' };
  }
}

// Notifies the client once an admin marks their problem as resolved, and
// asks them to confirm the fix actually worked.
export async function sendProblemResolvedEmail({
  email, companyName, printerModel, resolutionMethod, technician, rentalId,
}) {
  const resolutionText = resolutionMethod === 'technician'
    ? `A technician (${technician}) has addressed the issue on-site.`
    : 'The issue was resolved remotely via AnyDesk.';

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: `Your ${printerModel} issue has been resolved — please confirm`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #3ab549;">✅ Issue Resolved</h2>
          <p>Hi ${companyName}, the problem you reported on your <strong>${printerModel}</strong> (Rental #${rentalId}) has been marked as resolved.</p>
          <p style="background: #f8f9fa; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">${resolutionText}</p>
          <p><strong>Please log in to your dashboard and confirm whether the fix worked.</strong> If the problem persists, you can report it again from there.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Fruitbean Ink Refilling Station — 6223 Tramo St. San Dionisio, Parañaque, Philippines
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('sendProblemResolvedEmail error:', err);
    return { success: false, message: 'Could not notify the client.' };
  }
}
