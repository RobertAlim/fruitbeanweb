import './ContractTimer.css';

/**
 * ContractTimer
 * Props:
 *   contractStart  – date string (contract_start from DB)
 *   contractEnd    – date string (contract_end from DB)
 *   compact        – boolean, renders a smaller single-line version (for admin sub-cards)
 */
export default function ContractTimer({ contractStart, contractEnd, compact = false }) {
  if (!contractEnd) return null;

  const now       = new Date();
  now.setHours(0, 0, 0, 0);
  const end       = new Date(contractEnd);
  end.setHours(0, 0, 0, 0);
  const msLeft    = end - now;
  const daysLeft  = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  /* ── Color tier ── */
  let tier, label, icon;
  if (daysLeft <= 0) {
    tier  = 'expired';
    icon  = '📦';
    label = 'Contract expired';
  } else if (daysLeft <= 7) {
    tier  = 'critical';
    icon  = '🔴';
    label = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
  } else if (daysLeft <= 30) {
    tier  = 'warning';
    icon  = '🟡';
    label = `${daysLeft} days left`;
  } else {
    tier  = 'ok';
    icon  = '🟢';
    label = `${daysLeft} days left`;
  }

  /* ── Progress bar fill (0–100%) relative to full contract length ── */
  let progressPct = 0;
  if (contractStart) {
    const start    = new Date(contractStart);
    start.setHours(0, 0, 0, 0);
    const total    = end - start;
    const elapsed  = now - start;
    progressPct    = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 100;
  }

  if (compact) {
    /* Single-line version for admin sub-cards */
    return (
      <div className={`ct-compact ct-${tier}`}>
        <span className="ct-compact-icon">{icon}</span>
        <span className="ct-compact-label">{label}</span>
        {contractEnd && (
          <span className="ct-compact-end">· ends {fmtDate(contractEnd)}</span>
        )}
      </div>
    );
  }

  /* Full version for client printer cards + admin detail modal */
  return (
    <div className={`ct-wrap ct-${tier}`}>
      <div className="ct-dates-row">
        <div className="ct-date-block">
          <span className="ct-date-label">Contract Start</span>
          <span className="ct-date-val">{fmtDate(contractStart)}</span>
        </div>
        <div className="ct-arrow">→</div>
        <div className="ct-date-block">
          <span className="ct-date-label">Contract End</span>
          <span className="ct-date-val">{fmtDate(contractEnd)}</span>
        </div>
        <div className={`ct-badge ct-badge-${tier}`}>
          {icon} {label}
        </div>
      </div>
      {contractStart && (
        <div className="ct-bar-wrap">
          <div
            className={`ct-bar-fill ct-bar-${tier}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
