import { Pool } from 'pg';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../../chat/emails';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// POST /api/auth/forgot-password
// Body: { email }
export async function POST(req) {
  const { email } = await req.json();

  // Same response whether or not the account exists — this prevents the
  // form from being used to check which emails are registered.
  const genericResponse = {
    ok: true,
    message: "If an account exists for that email, we've sent a password reset link.",
  };

  if (!email) {
    return Response.json({ error: 'Email is required.' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      'SELECT client_id, company_name, email FROM clients WHERE email = $1 LIMIT 1',
      [email.trim()]
    );
    const user = rows[0];

    if (!user) {
      return Response.json(genericResponse, { status: 200 });
    }

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires   = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await pool.query(
      'UPDATE clients SET reset_token_hash = $1, reset_token_expires = $2 WHERE client_id = $3',
      [tokenHash, expires, user.client_id]
    );

    const origin    = new URL(req.url).origin;
    const resetLink = `${origin}/reset-password?token=${rawToken}`;

    const emailResult = await sendPasswordResetEmail({
      email: user.email,
      companyName: user.company_name,
      resetLink,
    });

    // sendPasswordResetEmail swallows its own errors (so a broken mailer
    // never leaks account existence to the client), but we still need to
    // know about it server-side or every failure looks like a success.
    if (!emailResult?.success) {
      console.error('forgot-password: reset email failed to send for', user.email, emailResult?.message);
    }

    return Response.json(genericResponse, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Server error. Try again later.' }, { status: 500 });
  }
}
