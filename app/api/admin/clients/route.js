import { Pool } from 'pg';
import { sendAdminApprovedEmail } from '../../chat/emails';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/admin/clients
// Query params: ?account_type=client|admin|all (optional, defaults to 'client')
//               ?active=true|false (optional)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const accountType = searchParams.get('account_type') || 'client';
  const active      = searchParams.get('active');

  const conditions = [];
  const params     = [];

  if (accountType !== 'all') {
    params.push(accountType);
    conditions.push(`c.account_type = $${params.length}`);
  }

  if (active !== null && active !== undefined && active !== '') {
    params.push(active === 'true');
    conditions.push(`c.account_status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT
         c.client_id,
         c.company_name,
         c.email,
         c.company_number,
         c.company_address,
         c.account_status,
         c.account_type,
         c.created_at,
         COUNT(r.rental_id)                                          AS total_rentals,
         COUNT(r.rental_id) FILTER (WHERE r.status = 'Pending')     AS pending_rentals,
         COUNT(r.rental_id) FILTER (WHERE r.status = 'Active')      AS active_rentals,
         COUNT(r.rental_id) FILTER (WHERE r.status = 'Problem')     AS problem_rentals,
         COALESCE(
           json_agg(
             json_build_object(
               'rental_id', r.rental_id,
               'printer_id', p.printer_id,
               'printer_model', p.printer_model,
               'rate', p.rate_per_month,
               'description', p.description,
               'start_date', r.start_date,
               'end_date', r.end_date,
               'status', LOWER(r.status),
               'problem_types', r.problem_types,
               'urgency', r.urgency,
               'notes', r.problem_notes,
               'reported_at', r.reported_at,
               'resolution_method', r.resolution_method,
               'technician', r.technician,
               'resolved_at', r.resolved_at,
               'confirmed_at', r.confirmed_at,
               'assigned_technician', r.assigned_technician,
               'arrival_date', r.arrival_date,
               'assignment_note', r.assignment_note,
               'assigned_at', r.assigned_at
             ) ORDER BY r.created_at DESC
           ) FILTER (WHERE r.rental_id IS NOT NULL),
           '[]'
         ) AS rentals
       FROM clients c
       LEFT JOIN rentals r ON r.client_id = c.client_id
       LEFT JOIN printers p ON p.printer_id = r.printer_id
       ${where}
       GROUP BY
         c.client_id, c.company_name, c.email, c.company_number,
         c.company_address, c.account_status, c.account_type, c.created_at
       ORDER BY c.created_at DESC`,
      params
    );

    return Response.json({ ok: true, clients: rows }, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to fetch clients.' }, { status: 500 });
  }
}

// DELETE /api/admin/clients
// Body: { client_id }
// Only allowed for pending admin requests (account_type = 'admin' AND
// account_status = false) — this is strictly for rejecting signup requests,
// never for deleting active clients or admins.
export async function DELETE(req) {
  const { client_id } = await req.json();

  if (!client_id) {
    return Response.json({ error: 'client_id is required.' }, { status: 400 });
  }

  try {
    const { rows: check } = await pool.query(
      'SELECT account_type, account_status FROM clients WHERE client_id = $1 LIMIT 1',
      [client_id]
    );
    if (check.length === 0) {
      return Response.json({ error: 'Client not found.' }, { status: 404 });
    }
    if (check[0].account_type !== 'admin' || check[0].account_status !== false) {
      return Response.json(
        { error: 'Only pending (unapproved) admin requests can be rejected this way.' },
        { status: 403 }
      );
    }

    await pool.query('DELETE FROM clients WHERE client_id = $1', [client_id]);
    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to reject request.' }, { status: 500 });
  }
}

// PATCH /api/admin/clients
// Body shape A: { client_id, account_status: true | false }
// Body shape B: { client_id, company_name, company_number, company_address }
export async function PATCH(req) {
  const body = await req.json();
  const { client_id } = body;

  if (!client_id) {
    return Response.json({ error: 'client_id is required.' }, { status: 400 });
  }

  try {
    const { rows: check } = await pool.query(
      'SELECT account_type FROM clients WHERE client_id = $1 LIMIT 1',
      [client_id]
    );
    if (check.length === 0) {
      return Response.json({ error: 'Client not found.' }, { status: 404 });
    }

    // ── Shape A: toggle account_status ──────────────────────────────────────
    if (body.account_status !== undefined) {
      const { account_status } = body;
      if (typeof account_status !== 'boolean') {
        return Response.json({ error: 'account_status must be a boolean.' }, { status: 400 });
      }
      if (check[0].account_type === 'admin' && account_status === false) {
        return Response.json({ error: 'Cannot deactivate an admin account.' }, { status: 403 });
      }
      const { rows } = await pool.query(
        `UPDATE clients SET account_status = $1 WHERE client_id = $2
         RETURNING client_id, company_name, email, account_status, account_type`,
        [account_status, client_id]
      );

      // If this just approved a pending admin, let them know they can log in now.
      if (check[0].account_type === 'admin' && account_status === true) {
        try {
          await sendAdminApprovedEmail({ email: rows[0].email, name: rows[0].company_name });
        } catch (emailErr) {
          console.error('Failed to notify approved admin:', emailErr);
        }
      }

      return Response.json({ ok: true, client: rows[0] }, { status: 200 });
    }

    // ── Shape B: edit company info ───────────────────────────────────────────
    const { company_name, company_number, company_address } = body;
    if (!company_name?.trim()) {
      return Response.json({ error: 'company_name is required.' }, { status: 400 });
    }
    const { rows } = await pool.query(
      `UPDATE clients
       SET company_name    = $1,
           company_number  = $2,
           company_address = $3
       WHERE client_id = $4
       RETURNING client_id, company_name, email, company_number, company_address,
                 account_status, account_type`,
      [company_name.trim(), company_number?.trim() || null, company_address?.trim() || null, client_id]
    );
    return Response.json({ ok: true, client: rows[0] }, { status: 200 });

  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to update client.' }, { status: 500 });
  }
}