'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './client.css';

const PROBLEM_OPTIONS = [
  { id: 'bad_printout',    title: 'Bad Print-out',   desc: 'Blurry, faded, or streaky print quality', icon: '🖨️' },
  { id: 'low_ink',         title: 'Low Ink',          desc: 'Ink level is low or needs refilling',      icon: '🔴' },
  { id: 'paper_jam',       title: 'Paper Jam',        desc: 'Paper is stuck inside the printer',        icon: '📄' },
  { id: 'printer_offline', title: 'Printer Offline',  desc: 'Cannot connect or detect the printer',     icon: '📵' },
  { id: 'print_head',      title: 'Print Head Clog',  desc: 'Clogged nozzles affecting print output',   icon: '🔧' },
];

const STATUS_ORDER = { active: 0, pending: 1, problem: 2, ended: 3 };

export default function ClientPage() {
  const router = useRouter();
  const [rentals, setRentals]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [account, setAccount]                 = useState({ name: '', email: '', initials: '' });
  const [search, setSearch]                   = useState('');
  const [reportTarget, setReportTarget]       = useState(null);
  const [checkedProblems, setCheckedProblems] = useState([]);
  const [urgency, setUrgency]                 = useState('medium');
  const [notes, setNotes]                     = useState('');
  const [submitted, setSubmitted]             = useState(false);

  useEffect(() => {
    const client_id    = sessionStorage.getItem('client_id');
    const account_name  = sessionStorage.getItem('account_name');
    const account_email = sessionStorage.getItem('account_email');

    if (!client_id) {
      router.push('/login');
      return;
    }

    const initials = account_name
      ? account_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : '?';
    setAccount({ name: account_name, email: account_email, initials });

    async function fetchRentals() {
      try {
        const res  = await fetch(`/api/rentals?client_id=${client_id}`);
        const data = await res.json();
        if (res.ok) setRentals(data.rentals);
      } catch (err) {
        console.error('Failed to fetch rentals:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRentals();
  }, [router]);

const filtered = useMemo(() => {
  const q = search.toLowerCase();
  return rentals
    .filter(r =>
      (r.printer_model?.toLowerCase() ?? '').includes(q) ||
      (r.status?.toLowerCase() ?? '').includes(q)
    )
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}, [rentals, search]);

  const grouped = useMemo(() => ({
    active:  filtered.filter(r => r.status === 'active'),
    pending: filtered.filter(r => r.status === 'pending'),
    problem: filtered.filter(r => r.status === 'problem'),
    ended:   filtered.filter(r => r.status === 'ended'),
  }), [filtered]);

  const stats = [
    { label: 'Active',  count: rentals.filter(r => r.status === 'active').length,  icon: '✅', cls: 'active-icon'  },
    { label: 'Pending', count: rentals.filter(r => r.status === 'pending').length, icon: '⏳', cls: 'pending-icon' },
    { label: 'Problem', count: rentals.filter(r => r.status === 'problem').length, icon: '⚠️', cls: 'problem-icon' },
    { label: 'Ended',   count: rentals.filter(r => r.status === 'ended').length,   icon: '📦', cls: 'ended-icon'   },
  ];

  function openReport(rental) {
    setReportTarget(rental);
    setCheckedProblems([]);
    setUrgency('medium');
    setNotes('');
    setSubmitted(false);
  }

  function closeReport() {
    setReportTarget(null);
    setSubmitted(false);
  }

  function toggleProblem(id) {
    setCheckedProblems(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  function handleSubmitReport() {
    if (checkedProblems.length === 0) return;
    setRentals(prev =>
      prev.map(r =>
        r.rental_id === reportTarget.rental_id ? { ...r, status: 'problem' } : r
      )
    );
    setSubmitted(true);
  }

  function fmtDate(d) {
    if (!d) return 'Ongoing';
    return new Date(d).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#9aa0a6' }}>
      Loading your printers…
    </div>
  );

  return (
    <>
      {/* ── Header ── */}
      <header className="client-header">
        <a href="/" className="header-logo">
          <div className="header-logo-icon">
            <img src="/Fruitbean Logo.png" alt="Fruitbean" />
          </div>
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
          <button className="btn-logout" onClick={() => {
            sessionStorage.clear();
            router.push('/login');
          }}>
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
              <input
                className="search-input"
                placeholder="Search printers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn-primary">➕ Rent Another</button>
            <button className="btn-secondary">📋 View History</button>
            <button className="btn-secondary">📞 Contact Us</button>
          </div>
        </div>

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

        {[
          { key: 'active',  label: 'Active',  emoji: '✅' },
          { key: 'pending', label: 'Pending', emoji: '⏳' },
          { key: 'problem', label: 'Problem', emoji: '⚠️' },
          { key: 'ended',   label: 'Ended',   emoji: '📦' },
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
                ) : (
                  items.map(rental => (
                    <div key={rental.rental_id} className={`printer-card status-${rental.status}`}>
                      <div
                        className="printer-img-wrap"
                        onClick={() => rental.status !== 'ended' && openReport(rental)}
                        title={rental.status !== 'ended' ? 'Click to report a problem' : ''}
                      >
                        {rental.image ? (
                          <img src={`/images/${rental.printer_model}.jpg`} alt={rental.printer_model} />
                        ) : (
                          <div className="printer-img-placeholder">🖨️</div>
                        )}
                        {rental.status !== 'ended' && (
                          <div className="report-overlay">
                            <span className="report-overlay-text">⚠️ Report Problem</span>
                          </div>
                        )}
                      </div>
                      <div className="printer-info">
                        <div className="printer-model">{rental.printer_model}</div>
                        <div className="printer-meta">
                          <div className="printer-rate">
                            ₱{Number(rental.rate).toLocaleString()}<span>/mo</span>
                          </div>
                          <span className={`status-badge ${rental.status}`}>{rental.status}</span>
                        </div>
                        <div className="printer-dates">
                          <span><strong>Since:</strong> {fmtDate(rental.start_date)}</span>
                          {rental.status === 'ended' && (
                            <span><strong>Until:</strong> {fmtDate(rental.end_date)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* ── Report Modal ── */}
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
                        <input
                          type="checkbox"
                          checked={checkedProblems.includes(p.id)}
                          onChange={() => toggleProblem(p.id)}
                        />
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
                      { key: 'low',    emoji: '🟢', label: 'Low'    },
                      { key: 'medium', emoji: '🟡', label: 'Medium' },
                      { key: 'high',   emoji: '🔴', label: 'High'   },
                    ].map(u => (
                      <button
                        key={u.key}
                        className={`urgency-btn${urgency === u.key ? ` selected ${u.key}` : ''}`}
                        onClick={() => setUrgency(u.key)}
                      >
                        <span className="urgency-emoji">{u.emoji}</span>
                        <span className="urgency-label">{u.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="modal-section-label">Additional Notes (optional)</div>
                  <textarea
                    className="modal-notes"
                    placeholder="Describe the problem in more detail…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={closeReport}>Cancel</button>
                  <button
                    className="btn-report"
                    onClick={handleSubmitReport}
                    disabled={checkedProblems.length === 0}
                  >
                    ⚠️ Submit Report
                  </button>
                </div>
              </>
            ) : (
              <div className="report-success">
                <div className="success-icon">✅</div>
                <h3>Report Submitted!</h3>
                <p>
                  Our team has been notified about the issue with your{' '}
                  <strong>{reportTarget.printer_model}</strong>.<br />
                  We will contact you shortly to resolve the problem.
                </p>
                <br />
                <button className="btn-primary" style={{ margin: '0 auto' }} onClick={closeReport}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}