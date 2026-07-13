import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
        p.description
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

// DB constraint (rentals_status_check) requires this exact casing
const STATUS_MAP = {
  active:  'Active',
  pending: 'Pending',
  problem: 'Problem',
  ended:   'Ended',
};

export async function PATCH(req) {
  const { rental_id, status } = await req.json();

  if (!rental_id || !status) {
    return Response.json({ error: 'rental_id and status are required.' }, { status: 400 });
  }

  const dbStatus = STATUS_MAP[status.toLowerCase()];

  if (!dbStatus) {
    return Response.json({ error: `status must be one of: ${Object.keys(STATUS_MAP).join(', ')}` }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE rentals
       SET status = $1
       WHERE rental_id = $2
       RETURNING rental_id, client_id, start_date, end_date, LOWER(status) AS status`,
      [dbStatus, rental_id]
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