import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/printers
// Returns the catalog of printers available for rent, straight from the DB
// (not the hardcoded arrays used elsewhere) so it always reflects what's
// actually available.
export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT printer_id, printer_model AS model, rate_per_month AS rate, description
       FROM printers
       WHERE available = true
       ORDER BY rate_per_month ASC`
    );
    return Response.json({ ok: true, printers: rows }, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to fetch printer catalog.' }, { status: 500 });
  }
}