import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { sendAdminApprovalRequestEmail } from '../../chat/emails';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function isValidEmail(val) {
  return typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

// POST /api/auth/register-admin
// Body: { userName, password, number, address, email }
// Creates an admin account that's locked (account_status = false) until an
// existing admin approves it from the dashboard.
export async function POST(req) {
  const { userName, password, number, address, email } = await req.json();

  if (!userName?.trim())          return Response.json({ error: 'Username is required.' }, { status: 400 });
  if (!password || password.length < 8)
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  if (!number?.trim())             return Response.json({ error: 'Contact number is required.' }, { status: 400 });
  if (!address?.trim())            return Response.json({ error: 'Address is required.' }, { status: 400 });
  if (!isValidEmail(email))        return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });

  try {
    const { rows: existing } = await pool.query(
      'SELECT client_id FROM clients WHERE email = $1 LIMIT 1',
      [email.trim()]
    );
    if (existing.length > 0) {
      return Response.json({ error: 'An account with that email already exists.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO clients
         (company_name, email, password, company_number, company_address, account_status, account_type, created_at)
       VALUES ($1, $2, $3, $4, $5, false, 'admin', NOW())
       RETURNING client_id, company_name, email`,
      [userName.trim(), email.trim(), hashedPassword, number.trim(), address.trim()]
    );
    const created = rows[0];

    // Let existing active admins know a new request is waiting — failures
    // here shouldn't block the signup itself.
    try {
      const { rows: adminRows } = await pool.query(
        `SELECT email FROM clients WHERE account_type = 'admin' AND account_status = true`
      );
      const adminEmails = adminRows.map(a => a.email).filter(Boolean);
      if (adminEmails.length > 0) {
        await sendAdminApprovalRequestEmail({
          adminEmails,
          requesterName: created.company_name,
          requesterEmail: created.email,
        });
      }
    } catch (emailErr) {
      console.error('Failed to notify admins of new admin request:', emailErr);
    }

    return Response.json(
      { ok: true, message: 'Your request has been submitted. An existing admin needs to approve your account before you can log in.' },
      { status: 201 }
    );
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Server error. Try again later.' }, { status: 500 });
  }
}
