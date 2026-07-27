import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';

function generateTempPassword() {
  // 12 random characters, URL-safe, easy to read aloud/type from an email
  return crypto.randomBytes(9).toString('base64url');
}

export async function createClientAccount({ inquiryId }) {
  const pool = getPool();

  const { rows: inquiryRows } = await pool.query(
    'SELECT * FROM inquiries WHERE inquiry_id = $1',
    [inquiryId]
  );
  const inquiry = inquiryRows[0];

  if (!inquiry) {
    return { success: false, message: 'No inquiry found with that ID.' };
  }

  // Idempotency check #1 — this exact inquiry already has a linked account
  if (inquiry.client_id) {
    const { rows: existing } = await pool.query(
      'SELECT client_id, email, company_name FROM clients WHERE client_id = $1',
      [inquiry.client_id]
    );
    return {
      success: true,
      alreadyExisted: true,
      clientId: existing[0].client_id,
      email: existing[0].email,
      companyName: existing[0].company_name,
    };
  }

  // Idempotency check #2 — a client with this email already exists from a
  // different (e.g. retried/duplicate) inquiry. Reuse that account instead
  // of crashing on the unique email constraint.
  const { rows: existingByEmail } = await pool.query(
    'SELECT client_id, email, company_name FROM clients WHERE email = $1',
    [inquiry.email]
  );

  if (existingByEmail.length > 0) {
    const existingClient = existingByEmail[0];
    await pool.query(
      `UPDATE inquiries SET client_id = $1, status = 'converted' WHERE inquiry_id = $2`,
      [existingClient.client_id, inquiryId]
    );
    return {
      success: true,
      alreadyExisted: true,
      clientId: existingClient.client_id,
      email: existingClient.email,
      companyName: existingClient.company_name,
    };
  }

  const plainPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const client = await pool.connect();
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
