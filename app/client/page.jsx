'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './client.css';
import TroubleshootChat from '../components/TroubleshootChat';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ContractTimer from '../components/ContractTimer';

const PROBLEM_OPTIONS = [
  { id: 'bad_printout',    title: 'Bad Print-out',   desc: 'Blurry, faded, or streaky print quality', icon: '🖨️' },
  { id: 'low_ink',         title: 'Low Ink',          desc: 'Ink level is low or needs refilling',      icon: '🔴' },
  { id: 'paper_jam',       title: 'Paper Jam',        desc: 'Paper is stuck inside the printer',        icon: '📄' },
  { id: 'printer_offline', title: 'Printer Offline',  desc: 'Cannot connect or detect the printer',     icon: '📵' },
  { id: 'print_head',      title: 'Print Head Clog',  desc: 'Clogged nozzles affecting print output',   icon: '🔧' },
];

// resolved is now slot 3, ended moves to 4
const STATUS_ORDER = { active: 0, pending: 1, problem: 2, resolved: 3, ended: 4 };

export default function ClientPage() {
  const router = useRouter();
  const [rentals, setRentals]                       = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [account, setAccount]                       = useState({ name: '', email: '', initials: '' });
  const [search, setSearch]                         = useState('');
  const [reportTarget, setReportTarget]             = useState(null);
  const [troubleshootTarget, setTroubleshootTarget] = useState(null);
  const [escalatedState, setEscalatedState]         = useState(null);
  const [checkedProblems, setCheckedProblems]       = useState([]);
  const [urgency, setUrgency]                       = useState('medium');
  const [notes, setNotes]                           = useState('');
  const [submitted, setSubmitted]                   = useState(false);
  const [reportSubmitting, setReportSubmitting]     = useState(false);
  const [reportError, setReportError]               = useState('');
  const [clientId, setClientId]                     = useState(null);
  const [confirmingFix, setConfirmingFix]           = useState(null); // rental_id being confirmed
  const [showHistoryModal, setShowHistoryModal]     = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const client_id     = sessionStorage.getItem('client_id');
    const account_name  = sessionStorage.getItem('account_name');
    const account_email = sessionStorage.getItem('account_email');
    if (!client_id) { router.push('/login'); return; }
    setClientId(client_id);
    const initials = account_name
      ? account_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : '?';
    setAccount({ name: account_name, email: account_email, initials });
    fetchRentals(client_id);
  }, [router]);

  async function fetchRentals(id) {
    try {
      const res  = await fetch(`/api/rentals?client_id=${id}`);
      const data = await res.json();
      if (res.ok) setRentals(data.rentals);
    } catch (err) { console.error('Failed to fetch rentals:', err); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rentals
      .filter(r =>
        (r.printer_model?.toLowerCase() ?? '').includes(q) ||
        (r.status?.toLowerCase() ?? '').includes(q)
      )
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
  }, [rentals, search]);

  // now includes 'resolved' group
  const grouped = useMemo(() => ({
    active:   filtered.filter(r => r.status === 'active'),
    pending:  filtered.filter(r => r.status === 'pending'),
    problem:  filtered.filter(r => r.status === 'problem'),
    resolved: filtered.filter(r => r.status === 'resolved'),
    ended:    filtered.filter(r => r.status === 'ended'),
  }), [filtered]);

  // 5 stats now
  const stats = [
    { label: 'Active',   count: rentals.filter(r => r.status === 'active').length,   icon: '✅', cls: 'active-icon'   },
    { label: 'Pending',  count: rentals.filter(r => r.status === 'pending').length,  icon: '⏳', cls: 'pending-icon'  },
    { label: 'Problem',  count: rentals.filter(r => r.status === 'problem').length,  icon: '⚠️', cls: 'problem-icon'  },
    { label: 'Awaiting', count: rentals.filter(r => r.status === 'resolved').length, icon: '🔧', cls: 'resolved-icon' },
    { label: 'Ended',    count: rentals.filter(r => r.status === 'ended').length,    icon: '📦', cls: 'ended-icon'    },
  ];

  // All rentals that ever had a problem reported
  const historyRentals = useMemo(
    () => rentals
      .filter(r => r.reported_at)
      .sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at)),
    [rentals]
  );

  /* ── Formatters ── */
  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
  function timeDiff(start, end) {
    if (!start || !end) return '—';
    const ms = new Date(end) - new Date(start);
    if (ms < 0) return '—';
    const mins  = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days > 0)  return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  }

  /* ── Report problem ── */
  function openReport(rental) {
    setReportTarget(rental);
    setCheckedProblems([]);
    setUrgency('medium');
    setNotes('');
    setSubmitted(false);
    setReportError('');
  }
  function closeReport() { setReportTarget(null); setSubmitted(false); }
  function toggleProblem(id) {
    setCheckedProblems(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }
  async function handleSubmitReport() {
    if (checkedProblems.length === 0 || reportSubmitting) return;
    setReportSubmitting(true);
    setReportError('');
    try {
      const res = await fetch('/api/rentals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rental_id: reportTarget.rental_id,
          status: 'problem',
          problem_types: checkedProblems,
          urgency,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');
      setRentals(prev => prev.map(r => r.rental_id === reportTarget.rental_id ? { ...r, ...data.rental } : r));
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setReportError('Something went wrong. Please try again.');
    } finally { setReportSubmitting(false); }
  }

  /* ── Confirm fix (resolved → active) ── */
  async function handleConfirmFix(rental_id) {
    setConfirmingFix(rental_id);
    try {
      const res = await fetch('/api/rentals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rental_id, status: 'active' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm');
      setRentals(prev => prev.map(r => r.rental_id === rental_id ? { ...r, ...data.rental } : r));
    } catch (err) { console.error('Failed to confirm fix:', err); }
    finally { setConfirmingFix(null); }
  }

  /* ── Rent Another Printer ── */
  const [showRentModal, setShowRentModal]   = useState(false);
  const [catalog, setCatalog]               = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [rentSelections, setRentSelections] = useState({});
  const [rentYears, setRentYears]           = useState('1');
  const [infoPrinter, setInfoPrinter]       = useState(null);
  const [rentSubmitting, setRentSubmitting] = useState(false);
  const [rentError, setRentError]           = useState('');
  const [rentSuccess, setRentSuccess]       = useState(false);

  async function openRentModal() {
    setShowRentModal(true);
    setRentSelections({});
    setRentYears('1');
    setRentError('');
    setRentSuccess(false);
    setInfoPrinter(null);
    if (catalog.length === 0) {
      setCatalogLoading(true);
      try {
        const res = await fetch('/api/printers');
        const data = await res.json();
        if (res.ok) setCatalog(data.printers);
      } catch (err) { console.error(err); }
      finally { setCatalogLoading(false); }
    }
  }

  function toggleRentSelect(model) {
    setRentSelections(prev => {
      if (prev[model] !== undefined) { const n = { ...prev }; delete n[model]; return n; }
      return { ...prev, [model]: 1 };
    });
  }
  function changeRentQty(model, delta) {
    setRentSelections(prev => {
      const next = (prev[model] ?? 1) + delta;
      if (next < 1) { const n = { ...prev }; delete n[model]; return n; }
      return { ...prev, [model]: next };
    });
  }

  const rentTotalUnits   = Object.values(rentSelections).reduce((a, b) => a + b, 0);
  const rentMonthlyTotal = Object.entries(rentSelections).reduce((sum, [model, qty]) => {
    const p = catalog.find(p => p.model === model);
    return sum + (p ? Number(p.rate) * qty : 0);
  }, 0);

  async function submitRentRequest() {
    if (rentTotalUnits === 0) { setRentError('Select at least one printer.'); return; }
    const years = parseInt(rentYears, 10);
    if (!years || years < 1) { setRentError('Enter a valid rental period (minimum 1 year).'); return; }
    setRentSubmitting(true);
    setRentError('');
    try {
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          rental_years: years,
          printers: Object.entries(rentSelections).map(([model, quantity]) => ({ model, quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setRentSuccess(true);
      fetchRentals(clientId);
    } catch (err) {
      console.error(err);
      setRentError('Something went wrong. Please try again.');
    } finally { setRentSubmitting(false); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#9aa0a6' }}>
      Loading your printers…
    </div>
  );

  return (
    <div className="client-page">
      {/* ── Header ── */}
      <header className="client-header">
        <a href="/" className="header-logo">
          <div className="header-logo-icon"><img src="/Fruitbean Logo.png" alt="Fruitbean" /></div>
          <div className="header-logo-text">
            <span className="brand">Fruit<span>bean</span></span>
            <span className="sub">Ink Refilling Station</span>
          </div>
        </a>
        <div className="header-right">
          <div className="header-company">
            <div className="company-avatar">{account.initials}</div>
            <div className="company-info">
              <span className="company-name">{account.name}</span>
              <span className="company-label">Client Account</span>
            </div>
          </div>
          <button className="btn-secondary" onClick={() => setShowChangePassword(true)}>
            🔒 Change Password
          </button>
          <button className="btn-logout" onClick={() => { sessionStorage.clear(); router.push('/login'); }}>
            🚪 Logout
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="client-main">
        <div className="topbar">
          <div className="topbar-left">
            <h1>My Printers</h1>
            <p>Manage and monitor all your rented printers</p>
          </div>
          <div className="topbar-right">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="Search printers…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={openRentModal}>➕ Rent Another</button>
            <button className="btn-secondary" onClick={() => setShowHistoryModal(true)}>📋 View History</button>
            <button className="btn-secondary">📞 Contact Us</button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-strip">
          {stats.map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="stat-info">
                <div className="stat-num">{s.count}</div>
                <div className="stat-label">{s.label} Printer{s.count !== 1 ? 's' : ''}</div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No printers found</h3>
            <p>Try a different search term</p>
          </div>
        )}

        {/* Printer sections — now includes resolved */}
        {[
          { key: 'active',   label: 'Active',                     emoji: '✅' },
          { key: 'pending',  label: 'Pending',                    emoji: '⏳' },
          { key: 'problem',  label: 'Problem',                    emoji: '⚠️' },
          { key: 'resolved', label: 'Awaiting Your Confirmation', emoji: '🔧' },
          { key: 'ended',    label: 'Ended',                      emoji: '📦' },
        ].map(section => {
          const items = grouped[section.key];
          if (items.length === 0 && search) return null;
          return (
            <div key={section.key}>
              <div className="section-header">
                <div className={`section-dot ${section.key}`}></div>
                <span className="section-title-text">{section.emoji} {section.label}</span>
                <span className="section-count">{items.length}</span>
              </div>
              <div className="printer-grid">
                {items.length === 0 ? (
                  <div className="empty-section">No {section.label.toLowerCase()} printers</div>
                ) : items.map(rental => (
                  <div key={rental.rental_id} className={`printer-card status-${rental.status}`}>
                    {/* Image — only active printers can trigger troubleshoot via click */}
                    <div
                      className="printer-img-wrap"
                      onClick={() => rental.status === 'active' && setTroubleshootTarget(rental)}
                      style={{ cursor: rental.status === 'active' ? 'pointer' : 'default' }}
                    >
                      <div className="printer-img-placeholder">🖨️</div>
                      {rental.status === 'active' && (
                        <div className="report-overlay">
                          <span className="report-overlay-text">⚠️ Report Problem</span>
                        </div>
                      )}
                    </div>

                    <div className="printer-info">
                      <div className="printer-model">{rental.printer_model}</div>
                      <div className="printer-meta">
                        <div className="printer-rate">₱{Number(rental.rate).toLocaleString()}<span>/mo</span></div>
                        <span className={`status-badge ${rental.status}`}>{rental.status}</span>
                      </div>
                      <div className="printer-dates">
                        <span><strong>Since:</strong> {fmtDate(rental.start_date)}</span>
                        {rental.status === 'ended' && <span><strong>Until:</strong> {fmtDate(rental.end_date)}</span>}
                      </div>
                      {rental.status !== 'ended' && (rental.contract_start || rental.contract_end) && (
                        <ContractTimer
                          contractStart={rental.contract_start}
                          contractEnd={rental.contract_end}
                        />
                      )}

                      {/* Technician assignment note (problem status) */}
                      {rental.status === 'problem' && rental.assigned_technician && (
                        <div className="assign-note-client">
                          🧑‍🔧 <strong>{rental.assigned_technician}</strong> is on the way — arriving {fmtDate(rental.arrival_date)}
                          {rental.assignment_note && <div className="assign-note-client-text">"{rental.assignment_note}"</div>}
                        </div>
                      )}

                      {/* ── Resolved: client must confirm ── */}
                      {rental.status === 'resolved' && (
                        <div className="resolved-confirm-block">
                          <div className="resolved-info-note">
                            🔧 Our team marked this as fixed
                            {rental.resolution_method === 'technician' && rental.technician
                              ? ` by ${rental.technician}`
                              : rental.resolution_method === 'anydesk' ? ' via AnyDesk' : ''}.
                            Is it working now?
                          </div>
                          <button
                            className="btn-confirm-fix"
                            onClick={() => handleConfirmFix(rental.rental_id)}
                            disabled={confirmingFix === rental.rental_id}
                          >
                            {confirmingFix === rental.rental_id ? 'Confirming…' : '✅ Yes, It\'s Fixed'}
                          </button>
                          <button className="btn-report-again" onClick={() => openReport(rental)}>
                            ❌ Still Broken — Report Again
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </main>

      {/* ── Troubleshoot Chat ── */}
      {troubleshootTarget && (
        <TroubleshootChat
          rental={troubleshootTarget}
          onClose={() => setTroubleshootTarget(null)}
          onEscalate={(state) => {
            setEscalatedState(state);
            openReport(troubleshootTarget);
            setTroubleshootTarget(null);
          }}
        />
      )}

      {/* ── Report Problem Modal ── */}
      {reportTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeReport(); }}>
          <div className="modal-box">
            {!submitted ? (
              <>
                <div className="modal-header">
                  <div className="modal-header-title">
                    <h2>⚠️ Report a Problem</h2>
                    <p>Select all issues that apply</p>
                  </div>
                  <button className="modal-close" onClick={closeReport}>✕</button>
                </div>
                <div className="modal-printer-preview">
                  <span className="preview-icon">🖨️</span>
                  <div>
                    <div className="preview-model">{reportTarget.printer_model}</div>
                    <div className="preview-label">₱{Number(reportTarget.rate).toLocaleString()}/mo</div>
                  </div>
                </div>
                <div className="modal-body">
                  <div className="modal-section-label">Problem Type</div>
                  <div className="checkbox-group">
                    {PROBLEM_OPTIONS.map(p => (
                      <label key={p.id} className={`checkbox-item${checkedProblems.includes(p.id) ? ' checked' : ''}`}>
                        <input type="checkbox" checked={checkedProblems.includes(p.id)} onChange={() => toggleProblem(p.id)} />
                        <div className="checkbox-item-label">
                          <span className="checkbox-item-title">{p.icon} {p.title}</span>
                          <span className="checkbox-item-desc">{p.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="modal-section-label">Urgency Level</div>
                  <div className="urgency-group">
                    {[
                      { key: 'low', emoji: '🟢', label: 'Low' },
                      { key: 'medium', emoji: '🟡', label: 'Medium' },
                      { key: 'high', emoji: '🔴', label: 'High' },
                    ].map(u => (
                      <button key={u.key} className={`urgency-btn${urgency === u.key ? ` selected ${u.key}` : ''}`} onClick={() => setUrgency(u.key)}>
                        <span className="urgency-emoji">{u.emoji}</span>
                        <span className="urgency-label">{u.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="modal-section-label">Additional Notes (optional)</div>
                  <textarea className="modal-notes" placeholder="Describe the problem in more detail…" value={notes} onChange={e => setNotes(e.target.value)} />
                  {reportError && <div className="resolve-error">{reportError}</div>}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={closeReport}>Cancel</button>
                  <button className="btn-report" onClick={handleSubmitReport} disabled={checkedProblems.length === 0 || reportSubmitting}>
                    {reportSubmitting ? 'Sending…' : '⚠️ Submit Report'}
                  </button>
                </div>
              </>
            ) : (
              <div className="report-success">
                <div className="success-icon">✅</div>
                <h3>Report Submitted!</h3>
                <p>Our team has been notified about the issue with your <strong>{reportTarget.printer_model}</strong>. We will contact you shortly to resolve the problem.</p>
                <br />
                <button className="btn-primary" style={{ margin: '0 auto' }} onClick={closeReport}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Service History Modal ── */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}>
          <div className="modal-box" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>📋 Service History</h2>
                <p>All past problem reports and their resolutions</p>
              </div>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '520px', overflowY: 'auto' }}>
              {historyRentals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  <p>No service history yet. Problem reports and their resolutions will appear here once you've had a ticket resolved.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {historyRentals.map(r => (
                    <div key={r.rental_id} style={{
                      background: 'var(--gray-50)',
                      border: '1.5px solid var(--gray-200)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 16px',
                    }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--dark)' }}>{r.printer_model}</div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>
                            Reported: {fmtDateTime(r.reported_at)}
                          </div>
                        </div>
                        <span className={`status-badge ${r.status}`}>{r.status}</span>
                      </div>

                      {/* Problem tags */}
                      {r.problem_types?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                          {r.problem_types.map(t => (
                            <span key={t} style={{
                              fontSize: '10.5px', fontWeight: 600, textTransform: 'capitalize',
                              background: 'var(--gray-100)', color: 'var(--gray-600)',
                              padding: '2px 8px', borderRadius: '20px',
                            }}>{t.replaceAll('_', ' ')}</span>
                          ))}
                          {r.urgency && (
                            <span style={{
                              fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                              background: r.urgency === 'high' ? '#fce8e8' : r.urgency === 'low' ? '#e8f7eb' : '#fff8e1',
                              color:      r.urgency === 'high' ? '#c62828' : r.urgency === 'low' ? '#2a8a37' : '#b07d00',
                            }}>{r.urgency} urgency</span>
                          )}
                        </div>
                      )}
                      {r.notes && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)', fontStyle: 'italic', marginBottom: '10px' }}>
                          "{r.notes}"
                        </div>
                      )}

                      {/* Resolution summary grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {[
                          {
                            label: 'Fixed By',
                            value: r.resolution_method === 'technician' && r.technician
                              ? `🧑‍🔧 ${r.technician}`
                              : r.resolution_method === 'anydesk' ? '💻 AnyDesk' : '—',
                          },
                          { label: 'Resolved On',    value: fmtDate(r.resolved_at) },
                          { label: 'Response Time',  value: timeDiff(r.reported_at, r.confirmed_at || r.resolved_at) },
                        ].map(cell => (
                          <div key={cell.label} style={{
                            background: '#fff',
                            border: '1px solid var(--gray-200)',
                            borderRadius: '6px',
                            padding: '8px 10px',
                          }}>
                            <div style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                              {cell.label}
                            </div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--dark)' }}>{cell.value}</div>
                          </div>
                        ))}
                      </div>

                      {r.confirmed_at && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--green-dark)', fontWeight: 600 }}>
                          ✅ You confirmed this fix on {fmtDate(r.confirmed_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rent Another Printer Modal ── */}
      {showRentModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRentModal(false); }}>
          <div className="modal-box" style={{ maxWidth: '640px' }}>
            {!rentSuccess ? (
              <>
                <div className="modal-header">
                  <div className="modal-header-title">
                    <h2>➕ Rent Another Printer</h2>
                    <p>Pick the unit(s) you'd like to add to your account</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowRentModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  {catalogLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>Loading printer catalog…</div>
                  ) : (
                    <>
                      <div className="modal-section-label">Available Printers</div>
                      <div className="rent-catalog-list">
                        {catalog.map(p => {
                          const isSelected = rentSelections[p.model] !== undefined;
                          const qty        = rentSelections[p.model] ?? 0;
                          const isInfoOpen = infoPrinter === p.model;
                          return (
                            <div key={p.model} className={`rent-catalog-item${isSelected ? ' selected' : ''}`}>
                              <div className="rent-catalog-item-main" onClick={() => toggleRentSelect(p.model)}>
                                <div className="rent-catalog-check">{isSelected ? '✓' : ''}</div>
                                <div className="rent-catalog-info">
                                  <div className="rent-catalog-model">{p.model}</div>
                                  {p.description && <div className="rent-catalog-desc">{p.description}</div>}
                                </div>
                                <div className="rent-catalog-rate">₱{Number(p.rate).toLocaleString()}<span>/mo</span></div>
                              </div>
                              <div className="rent-catalog-item-actions">
                                <button type="button" className="rent-info-toggle" onClick={() => setInfoPrinter(isInfoOpen ? null : p.model)}>
                                  {isInfoOpen ? '▲ Hide info' : '▼ Printer info'}
                                </button>
                                {isSelected && (
                                  <div className="rf-qty-stepper" onClick={e => e.stopPropagation()}>
                                    <button type="button" className="rf-qty-btn" onClick={() => changeRentQty(p.model, -1)}>−</button>
                                    <span style={{ width: '28px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>{qty}</span>
                                    <button type="button" className="rf-qty-btn" onClick={() => changeRentQty(p.model, 1)}>+</button>
                                  </div>
                                )}
                              </div>
                              {isInfoOpen && (
                                <div className="rent-catalog-expanded">
                                  {p.description || 'No additional information available for this model.'}
                                  <br />Rate: ₱{Number(p.rate).toLocaleString()}/month. Includes free ink refills, maintenance, and tech support.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="modal-section-label">Rental Period (Years)</div>
                      <input type="text" inputMode="numeric" className="modal-notes" style={{ minHeight: 'unset', resize: 'none' }} value={rentYears} onChange={e => setRentYears(e.target.value)} placeholder="e.g. 1" />
                      {rentTotalUnits > 0 && (
                        <div className="rf-selection-summary" style={{ marginTop: '16px' }}>
                          <div><span className="rf-summary-label">Units Selected</span><span className="rf-summary-val">{rentTotalUnits}</span></div>
                          <div><span className="rf-summary-label">Est. Monthly Total</span><span className="rf-summary-val" style={{ color: '#00aeef' }}>₱{rentMonthlyTotal.toLocaleString()}/mo</span></div>
                        </div>
                      )}
                      {rentError && <div className="resolve-error">{rentError}</div>}
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={() => setShowRentModal(false)}>Cancel</button>
                  <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={submitRentRequest} disabled={rentSubmitting || catalogLoading}>
                    {rentSubmitting ? 'Submitting…' : '➕ Submit Request'}
                  </button>
                </div>
              </>
            ) : (
              <div className="report-success">
                <div className="success-icon">✅</div>
                <h3>Request Submitted!</h3>
                <p>Your new printer(s) have been added as <strong>Pending</strong>. Our team will review and activate them shortly.</p>
                <br />
                <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => setShowRentModal(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {showChangePassword && (
        <ChangePasswordModal clientId={clientId} onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}