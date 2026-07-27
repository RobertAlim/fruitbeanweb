import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /api/auth/change-password
// Body: { client_id, current_password, new_password }
export async function POST(req) {
  const { client_id, current_password, new_password } = await req.json();

  if (!client_id || !current_password || !new_password) {
    return Response.json({ error: 'Current and new password are required.' }, { status: 400 });
  }

  if (String(new_password).length < 8) {
    return Response.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
  }

  if (current_password === new_password) {
    return Response.json({ error: 'New password must be different from your current password.' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE client_id = $1 LIMIT 1', [client_id]);
    const user = rows[0];

    if (!user) {
      return Response.json({ error: 'Account not found.' }, { status: 404 });
    }

    const passwordMatches = await bcrypt.compare(current_password, user.password);
    if (!passwordMatches) {
      return Response.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query('UPDATE clients SET password = $1 WHERE client_id = $2', [hashedPassword, client_id]);

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Server error. Try again later.' }, { status: 500 });
  }
}
