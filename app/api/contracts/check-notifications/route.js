import { Pool } from 'pg';
import {
  sendContract30DaysEmail,
  sendContract7DaysEmail,
  sendContractExpiredEmail,
} from '../../chat/emails';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Meant to be hit once a day by an external scheduler (Vercel Cron — see
// vercel.json — or an n8n "Schedule Trigger" node calling this URL with the
// same header). Protects against random/public triggering via CRON_SECRET.
//
// For every "Active" rental with a contract_end date, this:
//   1. Recomputes contract_status (Active / Expiring / Expired) from today's date.
//   2. Figures out whether today crosses a 30-day, 7-day, or 1-day/expired
//      threshold, and — if we haven't already notified for that exact day —
//      sends the matching template from api/chat/emails.js.
//   3. Stamps last_notified_at so re-running the job the same day is a no-op.
function daysBetween(today, end) {
  const ms = end.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a, b) {
  if (!a) return false;
  const da = startOfDay(new Date(a));
  const db = startOfDay(new Date(b));
  return da.getTime() === db.getTime();
}

function isAuthorized(req) {
  if (!process.env.CRON_SECRET) return false;
  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization'); // Vercel Cron sends "Bearer <CRON_SECRET>"
  return (
    headerSecret === process.env.CRON_SECRET ||
    authHeader === `Bearer ${process.env.CRON_SECRET}`
  );
}

async function runCheck(req) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const today = startOfDay(new Date());

  try {
    const { rows: rentals } = await pool.query(
      `SELECT
         r.rental_id, r.client_id, r.contract_start, r.contract_end,
         r.contract_status, r.last_notified_at,
         p.printer_model,
         c.email, c.company_name
       FROM rentals r
       JOIN printers p ON r.printer_id = p.printer_id
       JOIN clients c ON r.client_id = c.client_id
       WHERE LOWER(r.status) = 'active'
         AND r.contract_end IS NOT NULL`
    );

    const { rows: adminRows } = await pool.query(
      `SELECT email FROM clients WHERE account_type = 'admin' AND account_status = true`
    );
    const adminEmails = adminRows.map((a) => a.email).filter(Boolean);

    const results = { checked: rentals.length, notified: [], errors: [] };

    for (const rental of rentals) {
      const end = startOfDay(new Date(rental.contract_end));
      const daysLeft = daysBetween(today, end);

      const newStatus =
        daysLeft <= 0 ? 'Expired' : daysLeft <= 30 ? 'Expiring' : 'Active';

      // Which template (if any) applies today. Exact-day checks mean each
      // template fires once per contract, on the day it becomes true.
      let template = null;
      if (daysLeft === 30) template = '30day';
      else if (daysLeft === 7) template = '7day';
      else if (daysLeft === 1) template = 'expiring_tomorrow';
      else if (daysLeft <= 0 && rental.contract_status !== 'Expired') template = 'expired';

      const alreadyNotifiedToday = isSameDay(rental.last_notified_at, today);

      if (template && !alreadyNotifiedToday && rental.email) {
        try {
          const payload = {
            email: rental.email,
            companyName: rental.company_name,
            printerModel: rental.printer_model,
            rentalId: rental.rental_id,
            contractEnd: rental.contract_end,
            adminEmails,
          };

          if (template === '30day') {
            await sendContract30DaysEmail(payload);
          } else if (template === '7day') {
            await sendContract7DaysEmail(payload);
          } else if (template === 'expiring_tomorrow') {
            await sendContractExpiredEmail({ ...payload, alreadyExpired: false });
          } else if (template === 'expired') {
            await sendContractExpiredEmail({ ...payload, alreadyExpired: true });
          }

          await pool.query(
            `UPDATE rentals SET contract_status = $1, last_notified_at = NOW() WHERE rental_id = $2`,
            [newStatus, rental.rental_id]
          );
          results.notified.push({ rental_id: rental.rental_id, template });
        } catch (sendErr) {
          console.error(`Failed to notify rental ${rental.rental_id}:`, sendErr);
          results.errors.push({ rental_id: rental.rental_id, error: String(sendErr) });
        }
      } else if (newStatus !== rental.contract_status) {
        // Keep contract_status accurate even on days with no email to send.
        await pool.query(
          `UPDATE rentals SET contract_status = $1 WHERE rental_id = $2`,
          [newStatus, rental.rental_id]
        );
      }
    }

    return Response.json({ ok: true, ...results }, { status: 200 });
  } catch (err) {
    console.error('DB error in check-notifications:', err);
    return Response.json({ error: 'Failed to check contract notifications.' }, { status: 500 });
  }
}

export async function GET(req) {
  return runCheck(req);
}

export async function POST(req) {
  return runCheck(req);
}
