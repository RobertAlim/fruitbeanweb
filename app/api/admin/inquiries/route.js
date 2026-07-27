import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/api1/admin/inquiries
// Query params: ?status=pending|converted|rejected (optional, omit for all)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  try {
    const query = status
      ? `SELECT 
           i.*,
           c.company_name AS client_company_name,
           c.email AS client_email
         FROM inquiries i
         LEFT JOIN clients c ON i.client_id = c.client_id
         WHERE i.status = $1
         ORDER BY i.created_at DESC`
      : `SELECT 
           i.*,
           c.company_name AS client_company_name,
           c.email AS client_email
         FROM inquiries i
         LEFT JOIN clients c ON i.client_id = c.client_id
         ORDER BY i.created_at DESC`;

    const { rows } = await pool.query(query, status ? [status] : []);
    return Response.json({ ok: true, inquiries: rows }, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to fetch inquiries.' }, { status: 500 });
  }
}

// PATCH /api/api1/admin/inquiries
// Body: { inquiry_id, action: 'reject' }
//       { inquiry_id, action: 'convert', temp_password? }  — creates client + rentals
export async function PATCH(req) {
  const body = await req.json();
  const { inquiry_id, action } = body;

  if (!inquiry_id || !action) {
    return Response.json({ error: 'inquiry_id and action are required.' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    // Fetch the inquiry first
    const { rows: inquiryRows } = await client.query(
      'SELECT * FROM inquiries WHERE inquiry_id = $1 LIMIT 1',
      [inquiry_id]
    );

    if (inquiryRows.length === 0) {
      client.release();
      return Response.json({ error: 'Inquiry not found.' }, { status: 404 });
    }

    const inquiry = inquiryRows[0];

    // ── REJECT ──────────────────────────────────────────────────────────────
    if (action === 'reject') {
      if (inquiry.status !== 'pending') {
        client.release();
        return Response.json({ error: 'Only pending inquiries can be rejected.' }, { status: 400 });
      }

      await client.query(
        'UPDATE inquiries SET status = $1 WHERE inquiry_id = $2',
        ['rejected', inquiry_id]
      );

      client.release();
      return Response.json({ ok: true, message: 'Inquiry rejected.' }, { status: 200 });
    }

    // ── CONVERT (approve) ────────────────────────────────────────────────────
    if (action === 'convert') {
      if (inquiry.status !== 'pending') {
        client.release();
        return Response.json({ error: 'Only pending inquiries can be converted.' }, { status: 400 });
      }

      await client.query('BEGIN');

      // Check if a client with this email already exists
      const { rows: existingClient } = await client.query(
        'SELECT client_id FROM clients WHERE email = $1 LIMIT 1',
        [inquiry.email]
      );

      let clientId;
      let tempPassword = null;

      if (existingClient.length > 0) {
        // Reuse existing client
        clientId = existingClient[0].client_id;
      } else {
        // Create a new client account with a temporary password
        tempPassword = body.temp_password || generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const { rows: newClient } = await client.query(
          `INSERT INTO clients 
             (company_name, email, password, company_number, company_address, account_status, account_type)
           VALUES ($1, $2, $3, $4, $5, true, 'client')
           RETURNING client_id`,
          [
            inquiry.company_name,
            inquiry.email,
            hashedPassword,
            inquiry.contact_number,
            inquiry.company_address || null,
          ]
        );
        clientId = newClient[0].client_id;
      }

      // Create rental records for each printer in selected_printers
      const printers = Array.isArray(inquiry.selected_printers)
        ? inquiry.selected_printers
        : inquiry.selected_printers; // jsonb is auto-parsed by pg

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + (inquiry.rental_years || 1));

      const rentalIds = [];
      for (const printer of printers) {
        // Find the printer_id by model name
        const { rows: printerRows } = await client.query(
          'SELECT printer_id FROM printers WHERE printer_model = $1 LIMIT 1',
          [printer.model]
        );

        if (printerRows.length === 0) continue; // skip unknown models

        const printerId = printerRows[0].printer_id;

        // Insert one rental row per unit (quantity)
        for (let i = 0; i < (printer.quantity || 1); i++) {
          const { rows: rentalRow } = await client.query(
            `INSERT INTO rentals (client_id, printer_id, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, 'Pending')
             RETURNING rental_id`,
            [clientId, printerId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
          );
          rentalIds.push(rentalRow[0].rental_id);
        }
      }

      // Mark the inquiry as converted
      await client.query(
        'UPDATE inquiries SET status = $1, client_id = $2 WHERE inquiry_id = $3',
        ['converted', clientId, inquiry_id]
      );

      await client.query('COMMIT');
      client.release();

      return Response.json({
        ok: true,
        message: 'Inquiry converted to client and rentals created.',
        client_id: clientId,
        rental_ids: rentalIds,
        ...(tempPassword ? { temp_password: tempPassword } : {}),
      }, { status: 200 });
    }

    client.release();
    return Response.json({ error: `Unknown action: ${action}. Use 'convert' or 'reject'.` }, { status: 400 });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to process inquiry.' }, { status: 500 });
  }
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
