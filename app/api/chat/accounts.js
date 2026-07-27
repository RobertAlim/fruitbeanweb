import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';

function generateTempPassword() {
  // 12 random characters, URL-safe, easy to read aloud/type from an email
  return crypto.randomBytes(9).toString('base64url');
}

export async function createClientAccount({ inquiryId }) {
  // ── 1. Get pool ──────────────────────────────────────────────────────────
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error('createClientAccount: failed to get DB pool:', err);
    return { success: false, message: 'Database connection unavailable.' };
  }

  // ── 2. Fetch the inquiry ─────────────────────────────────────────────────
  let inquiry;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM inquiries WHERE inquiry_id = $1',
      [inquiryId]
    );
    inquiry = rows[0];
  } catch (err) {
    console.error('createClientAccount: failed to fetch inquiry:', err);
    return { success: false, message: 'Failed to look up inquiry.' };
  }

  if (!inquiry) {
    return { success: false, message: 'No inquiry found with that ID.' };
  }

  // ── 3. Idempotency check #1 — inquiry already linked to a client ─────────
  if (inquiry.client_id) {
    try {
      const { rows } = await pool.query(
        'SELECT client_id, email, company_name FROM clients WHERE client_id = $1',
        [inquiry.client_id]
      );
      return {
        success: true,
        alreadyExisted: true,
        clientId: rows[0].client_id,
        email: rows[0].email,
        companyName: rows[0].company_name,
      };
    } catch (err) {
      console.error('createClientAccount: failed to fetch existing client:', err);
      return { success: false, message: 'Failed to look up existing client.' };
    }
  }

  // ── 4. Idempotency check #2 — same email from a different inquiry ─────────
  let existingByEmail;
  try {
    const { rows } = await pool.query(
      'SELECT client_id, email, company_name FROM clients WHERE email = $1',
      [inquiry.email]
    );
    existingByEmail = rows;
  } catch (err) {
    console.error('createClientAccount: failed to check existing email:', err);
    return { success: false, message: 'Failed to check for existing account.' };
  }

  if (existingByEmail.length > 0) {
    const existingClient = existingByEmail[0];
    try {
      await pool.query(
        `UPDATE inquiries SET client_id = $1, status = 'converted' WHERE inquiry_id = $2`,
        [existingClient.client_id, inquiryId]
      );
    } catch (err) {
      console.error('createClientAccount: failed to link existing client to inquiry:', err);
      return { success: false, message: 'Failed to link existing account to inquiry.' };
    }
    return {
      success: true,
      alreadyExisted: true,
      clientId: existingClient.client_id,
      email: existingClient.email,
      companyName: existingClient.company_name,
    };
  }

  // ── 5. Create new client + rentals in a transaction ──────────────────────
  const plainPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('createClientAccount: failed to acquire DB client:', err);
    return { success: false, message: 'Database connection unavailable.' };
  }

  try {
    await client.query('BEGIN');

    const { rows: newClient } = await client.query(
      `INSERT INTO clients
        (company_name, email, password, company_number, company_address, account_status, account_type, created_at)
       VALUES ($1, $2, $3, $4, $5, true, 'client', NOW())
       RETURNING client_id`,
      [inquiry.company_name, inquiry.email, hashedPassword, inquiry.contact_number, inquiry.company_address]
    );
    const clientId = newClient[0].client_id;

    const selectedPrinters = inquiry.selected_printers;
    const rentalYears = inquiry.rental_years;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + rentalYears);

    for (const item of selectedPrinters) {
      const { rows: printerRows } = await client.query(
        'SELECT printer_id FROM printers WHERE printer_model = $1',
        [item.model]
      );
      if (printerRows.length === 0) {
        throw new Error(`Printer model "${item.model}" not found in printers table.`);
      }
      const printerId = printerRows[0].printer_id;

      for (let i = 0; i < item.quantity; i++) {
        await client.query(
          `INSERT INTO rentals (client_id, printer_id, start_date, end_date, status, created_at)
           VALUES ($1, $2, $3, $4, 'Pending', NOW())`,
          [clientId, printerId, startDate, endDate]
        );
      }
    }

    await client.query(
      `UPDATE inquiries SET client_id = $1, status = 'converted' WHERE inquiry_id = $2`,
      [clientId, inquiryId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      alreadyExisted: false,
      clientId,
      email: inquiry.email,
      companyName: inquiry.company_name,
      plainPassword,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createClientAccount error:', err);
    return { success: false, message: 'Something went wrong creating the account.' };
  } finally {
    client.release();
  }
}
