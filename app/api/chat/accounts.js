import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';

function generateTempPassword() {
  // 12 random characters, URL-safe, easy to read aloud/type from an email
  return crypto.randomBytes(9).toString('base64url');
}

// Used when building the payload sent to the n8n chat AI, so it knows
// which account (if any) the visitor is already signed in as, instead of
// treating every conversation as a brand-new company signing up.
export async function getClientAccountForChat(clientId) {
  if (!clientId) return null;
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error('getClientAccountForChat: failed to get DB pool:', err);
    return null;
  }

  try {
    const { rows } = await pool.query(
      `SELECT client_id, company_name, email, company_number, company_address
       FROM clients WHERE client_id = $1 LIMIT 1`,
      [clientId]
    );
    if (!rows[0]) return null;
    const c = rows[0];
    return {
      clientId: c.client_id,
      companyName: c.company_name,
      email: c.email,
      contactNumber: c.company_number,
      companyAddress: c.company_address,
    };
  } catch (err) {
    console.error('getClientAccountForChat: query failed:', err);
    return null;
  }
}

// Attaches new printer rentals to an EXISTING client (someone already signed
// in, requesting another printer through the chat) — no new account, no
// welcome email, no duplicate-account check needed since we already know
// exactly who they are.
export async function addRentalsToExistingClient({ clientId, printers, rentalYears }) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error('addRentalsToExistingClient: failed to get DB pool:', err);
    return { success: false, message: 'Database connection unavailable.' };
  }

  let clientRow;
  try {
    const { rows } = await pool.query(
      'SELECT client_id, email, company_name FROM clients WHERE client_id = $1',
      [clientId]
    );
    clientRow = rows[0];
  } catch (err) {
    console.error('addRentalsToExistingClient: failed to look up client:', err);
    return { success: false, message: 'Failed to look up your account.' };
  }

  if (!clientRow) {
    return { success: false, message: 'We could not find your account. Please log in again.' };
  }

  // ── Idempotency guard ──────────────────────────────────────────────────
  // The chat AI reconstructs its state from the full transcript every turn
  // and can end up calling this again for a request it already fulfilled
  // (e.g. it re-confirms on a later, unrelated message). All rentals
  // inserted by a single call share the exact same `created_at` (Postgres
  // NOW() is fixed for the duration of a transaction), so we can group
  // recent rentals back into their original "batches" and compare against
  // what's being requested now. If the same client asked for the exact
  // same printers/quantities within the last few minutes, treat this call
  // as a repeat instead of inserting duplicate rows.
  const DUPLICATE_WINDOW_MINUTES = 15;
  const requestedSignature = printers
    .map((p) => `${String(p.model).trim().toLowerCase()}x${p.quantity}`)
    .sort()
    .join('|');

  try {
    const { rows: recentRows } = await pool.query(
      `SELECT r.created_at, p.printer_model, COUNT(*) AS qty
       FROM rentals r
       JOIN printers p ON p.printer_id = r.printer_id
       WHERE r.client_id = $1
         AND r.created_at > NOW() - INTERVAL '${DUPLICATE_WINDOW_MINUTES} minutes'
       GROUP BY r.created_at, p.printer_model`,
      [clientId]
    );

    const batches = new Map();
    for (const row of recentRows) {
      const key = row.created_at.toISOString();
      const item = `${row.printer_model.trim().toLowerCase()}x${row.qty}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(item);
    }

    for (const items of batches.values()) {
      if (items.slice().sort().join('|') === requestedSignature) {
        // Same client + same printers/quantities were already inserted
        // recently — this is a repeat call, not a new rental request.
        return {
          success: true,
          duplicate: true,
          clientId: clientRow.client_id,
          email: clientRow.email,
          companyName: clientRow.company_name,
        };
      }
    }
  } catch (err) {
    // Don't let a broken dedup check block a legitimate rental — log it
    // and fall through to the normal insert path.
    console.error('addRentalsToExistingClient: duplicate check failed:', err);
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('addRentalsToExistingClient: failed to acquire DB client:', err);
    return { success: false, message: 'Database connection unavailable.' };
  }

  try {
    await client.query('BEGIN');

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + rentalYears);

    for (const item of printers) {
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

    await client.query('COMMIT');

    return {
      success: true,
      clientId: clientRow.client_id,
      email: clientRow.email,
      companyName: clientRow.company_name,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('addRentalsToExistingClient error:', err);
    return { success: false, message: 'Something went wrong adding your rental.' };
  } finally {
    client.release();
  }
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
