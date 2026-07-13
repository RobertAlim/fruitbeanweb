import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE email = $1 LIMIT 1', [email]);
    const user = rows[0];

    if (!user) {
      return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }

    if (user.account_status === false) {
      return Response.json({ error: 'Your account is inactive. Please contact support.' }, { status: 403 });
    }

    return Response.json({
      ok: true,
      client_id: user.client_id,
      account_name: user.company_name,
      account_email: user.email,
      account_type: user.account_type,
    }, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Server error. Try again later.' }, { status: 500 });
  }
}