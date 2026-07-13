import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.client_id,
        c.company_name,
        c.email,
        c.company_number,
        c.company_address,
        c.account_status,
        c.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'rental_id',     r.rental_id,
              'start_date',    r.start_date,
              'end_date',      r.end_date,
              'status',        LOWER(r.status),
              'printer_model', p.printer_model,
              'rate',          p.rate_per_month,
              'description',   p.description
            ) ORDER BY r.start_date DESC
          ) FILTER (WHERE r.rental_id IS NOT NULL),
          '[]'
        ) AS rentals
      FROM clients c
      LEFT JOIN rentals  r ON r.client_id = c.client_id
      LEFT JOIN printers p ON p.printer_id = r.printer_id
      WHERE c.account_type = 'client'
      GROUP BY c.client_id, c.company_name, c.email, c.company_number,
               c.company_address, c.account_status, c.created_at
      ORDER BY c.created_at DESC
    `);

    return Response.json({ ok: true, clients: rows }, { status: 200 });

  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to fetch clients.' }, { status: 500 });
  }
}
