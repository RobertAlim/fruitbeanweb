import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// DB constraint (rentals_status_check) requires this exact casing
const STATUS_MAP = {
  active:   'Active',
  pending:  'Pending',
  problem:  'Problem',
  resolved: 'Resolved',
  ended:    'Ended',
};

const TECHNICIANS = ['Arjay', 'Em Jay', 'OJT Gang', 'Leyah', 'Alim'];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const client_id = searchParams.get('client_id');

  try {
    const { rows } = await pool.query(
      `SELECT 
        r.rental_id,
        r.client_id,
        r.start_date,
        r.end_date,
        LOWER(r.status) AS status,
        p.printer_model,
        p.rate_per_month AS rate,
        p.description,
        r.problem_types,
        r.urgency,
        r.problem_notes AS notes,
        r.reported_at,
        r.resolution_method,
        r.technician,
        r.resolved_at,
        r.confirmed_at,
        r.contract_start,
        r.contract_end,
        r.contract_status,
        r.last_notified_at
      FROM rentals r
      JOIN printers p ON r.printer_id = p.printer_id
      WHERE r.client_id = $1
      ORDER BY r.start_date DESC`,
      [client_id]
    );
    return Response.json({ ok: true, rentals: rows }, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to fetch rentals.' }, { status: 500 });
  }
}

// PATCH /api/rentals
// Body shapes:
//   Client reports a problem:
//     { rental_id, status: 'problem', problem_types: string[], urgency, notes }
//   Admin resolves a problem (opens the resolution popup first):
//     { rental_id, status: 'resolved', resolution_method: 'technician' | 'anydesk', technician? }
//   Client confirms the fix (status flips back to active):
//     { rental_id, status: 'active' }
//   Any other transition (activate a pending rental, end a rental, admin flags a problem manually):
//     { rental_id, status }
export async function PATCH(req) {
  const body = await req.json();
  const { rental_id, status } = body;

  if (!rental_id || !status) {
    return Response.json({ error: 'rental_id and status are required.' }, { status: 400 });
  }

  const dbStatus = STATUS_MAP[status.toLowerCase()];

  if (!dbStatus) {
    return Response.json({ error: `status must be one of: ${Object.keys(STATUS_MAP).join(', ')}` }, { status: 400 });
  }

  try {
    // ── Client reporting a new problem ──────────────────────────────────────
    if (dbStatus === 'Problem') {
      const { problem_types, urgency, notes } = body;

      if (!Array.isArray(problem_types) || problem_types.length === 0) {
        return Response.json({ error: 'problem_types must be a non-empty array.' }, { status: 400 });
      }

      const { rows } = await pool.query(
        `UPDATE rentals
         SET status = 'Problem',
             problem_types = $1,
             urgency = $2,
             problem_notes = $3,
             reported_at = NOW(),
             resolution_method = NULL,
             technician = NULL,
             resolved_at = NULL,
             confirmed_at = NULL
         WHERE rental_id = $4
         RETURNING rental_id, client_id, start_date, end_date, LOWER(status) AS status,
                   problem_types, urgency, problem_notes AS notes, reported_at,
                   resolution_method, technician, resolved_at, confirmed_at`,
        [JSON.stringify(problem_types), urgency || 'medium', notes || null, rental_id]
      );

      if (rows.length === 0) {
        return Response.json({ error: 'Rental not found.' }, { status: 404 });
      }

      return Response.json({ ok: true, rental: rows[0] }, { status: 200 });
    }

    // ── Admin resolving a problem via the popup ─────────────────────────────
    if (dbStatus === 'Resolved') {
      const { resolution_method, technician } = body;

      if (!['technician', 'anydesk'].includes(resolution_method)) {
        return Response.json({ error: "resolution_method must be 'technician' or 'anydesk'." }, { status: 400 });
      }

      if (resolution_method === 'technician' && !TECHNICIANS.includes(technician)) {
        return Response.json({ error: `technician must be one of: ${TECHNICIANS.join(', ')}` }, { status: 400 });
      }

      const { rows } = await pool.query(
        `UPDATE rentals
         SET status = 'Resolved',
             resolution_method = $1,
             technician = $2,
             resolved_at = NOW()
         WHERE rental_id = $3
         RETURNING rental_id, client_id, start_date, end_date, LOWER(status) AS status,
                   problem_types, urgency, problem_notes AS notes, reported_at,
                   resolution_method, technician, resolved_at, confirmed_at`,
        [resolution_method, resolution_method === 'technician' ? technician : null, rental_id]
      );

      if (rows.length === 0) {
        return Response.json({ error: 'Rental not found.' }, { status: 404 });
      }

      return Response.json({ ok: true, rental: rows[0] }, { status: 200 });
    }

    // ── Client confirming the fix (Resolved -> Active) or any other transition ──
    const { rows: current } = await pool.query(
      'SELECT status FROM rentals WHERE rental_id = $1',
      [rental_id]
    );

    if (current.length === 0) {
      return Response.json({ error: 'Rental not found.' }, { status: 404 });
    }

    const isConfirmingFix = current[0].status === 'Resolved' && dbStatus === 'Active';

    const { rows } = await pool.query(
      `UPDATE rentals
       SET status = $1,
           confirmed_at = CASE WHEN $2 THEN NOW() ELSE confirmed_at END
       WHERE rental_id = $3
       RETURNING rental_id, client_id, start_date, end_date, LOWER(status) AS status,
                 problem_types, urgency, problem_notes AS notes, reported_at,
                 resolution_method, technician, resolved_at, confirmed_at`,
      [dbStatus, isConfirmingFix, rental_id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Rental not found.' }, { status: 404 });
    }

    return Response.json({ ok: true, rental: rows[0] }, { status: 200 });

  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to update rental status.' }, { status: 500 });
  }
}