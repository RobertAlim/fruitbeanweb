import { Pool } from 'pg';
import { sendProblemReportedEmail, sendProblemResolvedEmail } from '../chat/emails';

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

// Allowed contract extension lengths, in months.
const EXTEND_MONTHS_OPTIONS = [3, 6, 12, 24];

const RENTAL_SELECT = `
  r.rental_id, r.client_id, r.start_date, r.end_date, LOWER(r.status) AS status,
  p.printer_model, p.rate_per_month AS rate, p.description,
  r.problem_types, r.urgency, r.problem_notes AS notes, r.reported_at,
  r.resolution_method, r.technician, r.resolved_at, r.confirmed_at,
  r.assigned_technician, r.arrival_date, r.assignment_note, r.assigned_at,
  r.contract_start, r.contract_end, r.contract_status, r.last_notified_at
`;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const client_id = searchParams.get('client_id');

  try {
    const { rows } = await pool.query(
      `SELECT ${RENTAL_SELECT}
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

// POST /api/rentals
// Body: { client_id, rental_years, printers: [{ model, quantity }] }
// Lets an EXISTING client request more printers directly (no AI sales chat
// needed — that flow is only for brand-new prospects). This creates Pending
// rental rows tied to their client_id, which immediately show up on both
// the client's dashboard (Pending section) and the admin dashboard, where
// an admin can hit "Activate Rental" just like any other pending unit.
export async function POST(req) {
  const body = await req.json();
  const { client_id, rental_years, printers } = body;

  if (!client_id) {
    return Response.json({ error: 'client_id is required.' }, { status: 400 });
  }
  if (!Array.isArray(printers) || printers.length === 0) {
    return Response.json({ error: 'Select at least one printer.' }, { status: 400 });
  }
  const years = parseInt(rental_years, 10);
  if (!years || years < 1) {
    return Response.json({ error: 'rental_years must be at least 1.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Confirm the client exists
    const { rows: clientRows } = await client.query(
      'SELECT client_id FROM clients WHERE client_id = $1 LIMIT 1',
      [client_id]
    );
    if (clientRows.length === 0) {
      client.release();
      return Response.json({ error: 'Client not found.' }, { status: 404 });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + years);

    await client.query('BEGIN');

    const createdIds = [];
    for (const item of printers) {
      const quantity = Number(item.quantity) || 0;
      if (!item.model || quantity < 1) continue;

      const { rows: printerRows } = await client.query(
        'SELECT printer_id FROM printers WHERE printer_model = $1 LIMIT 1',
        [item.model]
      );
      if (printerRows.length === 0) continue; // skip unknown models
      const printerId = printerRows[0].printer_id;

      for (let i = 0; i < quantity; i++) {
        const { rows: rentalRow } = await client.query(
          `INSERT INTO rentals (client_id, printer_id, start_date, end_date, status)
           VALUES ($1, $2, $3, $4, 'Pending')
           RETURNING rental_id`,
          [client_id, printerId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
        );
        createdIds.push(rentalRow[0].rental_id);
      }
    }

    if (createdIds.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return Response.json({ error: 'None of the selected printers could be matched to our catalog.' }, { status: 400 });
    }

    await client.query('COMMIT');

    const { rows: newRentals } = await pool.query(
      `SELECT ${RENTAL_SELECT}
       FROM rentals r
       JOIN printers p ON r.printer_id = p.printer_id
       WHERE r.rental_id = ANY($1::int[])
       ORDER BY r.rental_id`,
      [createdIds]
    );

    client.release();
    return Response.json({ ok: true, rental_ids: createdIds, rentals: newRentals }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to create rental request.' }, { status: 500 });
  }
}

// PATCH /api/rentals
// Body shapes:
//   Client reports a problem:
//     { rental_id, status: 'problem', problem_types: string[], urgency, notes }
//   Admin assigns a technician + arrival date + note (does NOT change status):
//     { rental_id, assign: true, technician, arrival_date, note }
//   Admin extends a contract (does NOT change rental status):
//     { rental_id, extend: true, months }
//   Admin resolves a problem (opens the resolution popup first):
//     { rental_id, status: 'resolved', resolution_method: 'technician' | 'anydesk', technician? }
//   Client confirms the fix (status flips back to active):
//     { rental_id, status: 'active' }
//   Any other transition (activate a pending rental, end a rental, admin flags a problem manually):
//     { rental_id, status }
export async function PATCH(req) {
  const body = await req.json();
  const { rental_id } = body;

  if (!rental_id) {
    return Response.json({ error: 'rental_id is required.' }, { status: 400 });
  }

  try {
    // ── Admin assigning a technician / arrival date / note ─────────────────
    // Purely informational for the client — doesn't touch status.
    if (body.assign === true) {
      const { technician, arrival_date, note } = body;

      if (!technician || !String(technician).trim()) {
        return Response.json({ error: 'technician is required.' }, { status: 400 });
      }
      if (!arrival_date) {
        return Response.json({ error: 'arrival_date is required.' }, { status: 400 });
      }

      await pool.query(
        `UPDATE rentals
         SET assigned_technician = $1,
             arrival_date = $2,
             assignment_note = $3,
             assigned_at = NOW()
         WHERE rental_id = $4`,
        [technician, arrival_date, note || null, rental_id]
      );
      const { rows: full } = await pool.query(
        `SELECT ${RENTAL_SELECT}
         FROM rentals r JOIN printers p ON r.printer_id = p.printer_id
         WHERE r.rental_id = $1`,
        [rental_id]
      );

      if (full.length === 0) {
        return Response.json({ error: 'Rental not found.' }, { status: 404 });
      }

      return Response.json({ ok: true, rental: full[0] }, { status: 200 });
    }

    // ── Admin extending a contract ──────────────────────────────────────────
    // Purely informational for the client — doesn't touch rental status.
    // Extends from the existing contract_end (or from today if there isn't
    // one yet), then resets contract_status back to 'Active' and clears
    // last_notified_at so the 30/7/1-day email thresholds re-fire against
    // the new end date instead of staying silent for the rest of the term.
    if (body.extend === true) {
      const months = parseInt(body.months, 10);

      if (!EXTEND_MONTHS_OPTIONS.includes(months)) {
        return Response.json(
          { error: `months must be one of: ${EXTEND_MONTHS_OPTIONS.join(', ')}` },
          { status: 400 }
        );
      }

      const { rows } = await pool.query(
        `UPDATE rentals
         SET contract_end = (COALESCE(contract_end, CURRENT_DATE) + ($1 || ' months')::interval)::date,
             contract_status = 'Active',
             last_notified_at = NULL
         WHERE rental_id = $2
         RETURNING rental_id`,
        [months, rental_id]
      );

      if (rows.length === 0) {
        return Response.json({ error: 'Rental not found.' }, { status: 404 });
      }

      const { rows: full } = await pool.query(
        `SELECT ${RENTAL_SELECT}
         FROM rentals r JOIN printers p ON r.printer_id = p.printer_id
         WHERE r.rental_id = $1`,
        [rental_id]
      );

      return Response.json({ ok: true, rental: full[0] }, { status: 200 });
    }

    const { status } = body;
    if (!status) {
      return Response.json({ error: 'status is required.' }, { status: 400 });
    }

    const dbStatus = STATUS_MAP[status.toLowerCase()];
    if (!dbStatus) {
      return Response.json({ error: `status must be one of: ${Object.keys(STATUS_MAP).join(', ')}` }, { status: 400 });
    }

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
             confirmed_at = NULL,
             assigned_technician = NULL,
             arrival_date = NULL,
             assignment_note = NULL,
             assigned_at = NULL
         WHERE rental_id = $4
         RETURNING rental_id`,
        [JSON.stringify(problem_types), urgency || 'medium', notes || null, rental_id]
      );

      if (rows.length === 0) {
        return Response.json({ error: 'Rental not found.' }, { status: 404 });
      }

      const { rows: full } = await pool.query(
        `SELECT ${RENTAL_SELECT}
         FROM rentals r JOIN printers p ON r.printer_id = p.printer_id
         WHERE r.rental_id = $1`,
        [rental_id]
      );

      // Notify every active admin by email — failures here shouldn't block the response.
      try {
        const { rows: clientRows } = await pool.query(
          'SELECT company_name FROM clients WHERE client_id = $1 LIMIT 1',
          [full[0].client_id]
        );
        const { rows: adminRows } = await pool.query(
          `SELECT email FROM clients WHERE account_type = 'admin' AND account_status = true`
        );
        const adminEmails = adminRows.map(a => a.email).filter(Boolean);

        if (adminEmails.length > 0 && clientRows[0]) {
          await sendProblemReportedEmail({
            adminEmails,
            companyName: clientRows[0].company_name,
            printerModel: full[0].printer_model,
            problemTypes: problem_types,
            urgency: urgency || 'medium',
            notes,
            rentalId: rental_id,
          });
        }
      } catch (emailErr) {
        console.error('Failed to notify admins of problem report:', emailErr);
      }

      return Response.json({ ok: true, rental: full[0] }, { status: 200 });
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
         RETURNING rental_id`,
        [resolution_method, resolution_method === 'technician' ? technician : null, rental_id]
      );

      if (rows.length === 0) {
        return Response.json({ error: 'Rental not found.' }, { status: 404 });
      }

      const { rows: full } = await pool.query(
        `SELECT ${RENTAL_SELECT}
         FROM rentals r JOIN printers p ON r.printer_id = p.printer_id
         WHERE r.rental_id = $1`,
        [rental_id]
      );

      // Notify the client so they know to confirm the fix — failures here
      // shouldn't block the response.
      try {
        const { rows: clientRows } = await pool.query(
          'SELECT company_name, email FROM clients WHERE client_id = $1 LIMIT 1',
          [full[0].client_id]
        );
        if (clientRows[0]?.email) {
          await sendProblemResolvedEmail({
            email: clientRows[0].email,
            companyName: clientRows[0].company_name,
            printerModel: full[0].printer_model,
            resolutionMethod: resolution_method,
            technician: resolution_method === 'technician' ? technician : null,
            rentalId: rental_id,
          });
        }
      } catch (emailErr) {
        console.error('Failed to notify client of resolution:', emailErr);
      }

      return Response.json({ ok: true, rental: full[0] }, { status: 200 });
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
       RETURNING rental_id`,
      [dbStatus, isConfirmingFix, rental_id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Rental not found.' }, { status: 404 });
    }

    const { rows: full } = await pool.query(
      `SELECT ${RENTAL_SELECT}
       FROM rentals r JOIN printers p ON r.printer_id = p.printer_id
       WHERE r.rental_id = $1`,
      [rental_id]
    );

    return Response.json({ ok: true, rental: full[0] }, { status: 200 });

  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to update rental status.' }, { status: 500 });
  }
}

// DELETE /api/rentals
// Body: { rental_id }
// Fully removes a rental row from the database. Used when an admin denies,
// or a client cancels, a still-Pending rental request — those never
// actually happened, so there's no reason to keep a row around under an
// "Ended" status just to clutter the list. Restricted to Pending rentals
// only: anything further along (active/problem/resolved/ended) has real
// history tied to it and should go through a status change instead.
export async function DELETE(req) {
  const body = await req.json();
  const { rental_id } = body;

  if (!rental_id) {
    return Response.json({ error: 'rental_id is required.' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `DELETE FROM rentals WHERE rental_id = $1 AND status = 'Pending' RETURNING rental_id`,
      [rental_id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Rental not found or is not pending.' }, { status: 404 });
    }

    return Response.json({ ok: true, rental_id }, { status: 200 });
  } catch (err) {
    console.error('DB error:', err);
    return Response.json({ error: 'Failed to delete rental.' }, { status: 500 });
  }
}