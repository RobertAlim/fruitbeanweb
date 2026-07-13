import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail({ email, companyName, plainPassword }) {
  try {
    await resend.emails.send({
      from: 'Fruitbean Ink Refilling Station <onboarding@resend.dev>',
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