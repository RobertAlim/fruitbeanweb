import { Pool } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /api/auth/reset-password
// Body: { token, new_password }
export async function POST(req) {
  const { token, new_password } = await req.json();

  if (!token || !new_password) {
    return Response.json({ error: 'Reset token and new password are required.' }, { status: 400 });
  }

  if (String(new_password).length < 8) {
    return Response.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { rows } = await pool.query(
      'SELECT client_id, reset_token_expires FROM clients WHERE reset_token_hash = $1 LIMIT 1',
      [tokenHash]
    );
    const user = rows[0];

    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return Response.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      'UPDATE clients SET password = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE client_id = $2',
      [hashedPassword, user.client_id]
    );

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Server error. Try again later.' }, { status: 500 });
  }
}
