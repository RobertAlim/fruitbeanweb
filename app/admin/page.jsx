'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './admin.css';

const STATUS_ORDER = { active: 0, pending: 1, problem: 2, ended: 3 };

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [admin, setAdmin]                 = useState({ name: '', initials: '' });
  const [search, setSearch]               = useState('');
  const [expanded, setExpanded]           = useState({});   // { client_id: true/false }
  const [detailTarget, setDetailTarget]   = useState(null); // client object for modal

  /* ── Auth + fetch ── */
  useEffect(() => {
    const client_id    = sessionStorage.getItem('client_id');
    const account_type = sessionStorage.getItem('account_type');
    const account_name = sessionStorage.getItem('account_name');

    if (!client_id || account_type !== 'admin') {
      router.push('/login');
      return;
    }

    const initials = account_name
      ? account_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : 'AD';
    setAdmin({ name: account_name, initials });

    async function fetchAll() {
      try {
        /* GET /api/admin/clients  → [{client_id, company_name, email, company_number,
                                        company_address, account_status, created_at,
                                        rentals: [...]}] */
        const res  = await fetch('/api/admin/clients');
        const data = await res.json();
        if (res.ok) setClients(data.clients);
      } catch (err) {
        console.error('Failed to fetch clients:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [router]);

  /* ── Derived stats ── */
  const allRentals = useMemo(
    () => clients.flatMap(c => c.rentals ?? []),
    [clients]
  );

  const stats = [
    { label: 'Clients',  count: clients.length,                                    icon: '🏢', cls: 'clients-icon'  },
    { label: 'Active',   count: allRentals.filter(r => r.status === 'active').length,  icon: '✅', cls: 'active-icon'  },
    { label: 'Pending',  count: allRentals.filter(r => r.status === 'pending').length, icon: '⏳', cls: 'pending-icon' },
    { label: 'Problems', count: allRentals.filter(r => r.status === 'problem').length, icon: '⚠️', cls: 'problem-icon' },
    { label: 'Ended',    count: allRentals.filter(r => r.status === 'ended').length,   icon: '📦', cls: 'ended-icon'   },
  ];

  /* ── Filtered clients ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c =>
      (c.company_name?.toLowerCase() ?? '').includes(q) ||
      (c.email?.toLowerCase() ?? '').includes(q) ||
      (c.rentals ?? []).some(r => r.printer_model?.toLowerCase().includes(q))
    );
  }, [clients, search]);

  /* ── Helpers ── */
  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function openDetail(client) {
    setDetailTarget(client);
  }

  function closeDetail() {
    setDetailTarget(null);
  }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function countByStatus(rentals, status) {
    return (rentals ?? []).filter(r => r.status === status).length;
  }

  function hasProblem(rentals) {
    return (rentals ?? []).some(r => r.status === 'problem');
  }

  /* ── Resolve problem (optimistic, persisted via API) ── */
  function applyResolved(rental_id) {
    setClients(prev =>
      prev.map(c => ({
        ...c,
        rentals: (c.rentals ?? []).map(r =>
          r.rental_id === rental_id ? { ...r, status: 'active' } : r
        ),
      }))
    );
    if (detailTarget) {
      setDetailTarget(prev => ({
        ...prev,
        rentals: (prev.rentals ?? []).map(r =>
          r.rental_id === rental_id ? { ...r, status: 'active' } : r
        ),
      }));
    }
  }

  async function handleResolve(rental_id) {
    // Optimistic UI update first
    applyResolved(rental_id);

    try {
      const res = await fetch('/api/rentals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rental_id, status: 'active' }),
      });

      if (!res.ok) {
        throw new Error('Failed to update rental status');
      }
    } catch (err) {
      console.error('Failed to resolve rental:', err);
      // Roll back by re-fetching the authoritative state from the server
      try {
        const res = await fetch('/api/admin/clients');
        const data = await res.json();
        if (res.ok) setClients(data.clients);
      } catch (refetchErr) {
        console.error('Failed to roll back after failed resolve:', refetchErr);
      }
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#9aa0a6' }}>
      Loading clients…
    </div>
  );

  return (
    <>
      {/* ── Header ── */}
      <header className="admin-header">
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
          <div className="admin-badge">
            <span className="admin-badge-icon">🛡️</span>
            <span className="admin-badge-text">Admin Panel</span>
          </div>
          <div className="header-user">
            <div className="user-avatar">{admin.initials}</div>
            <div className="user-info">
              <span className="user-name">{admin.name}</span>
              <span className="user-label">Administrator</span>
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
      <main className="admin-main">

        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <h1>Client Overview</h1>
            <p>Monitor all clients and their rented printers</p>
          </div>
          <div className="topbar-right">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search client or printer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn-secondary">📊 Export Report</button>
            <button className="btn-secondary">📋 Rental History</button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-strip">
          {stats.map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="stat-info">
                <div className="stat-num">{s.count}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div className="section-dot"></div>
          <span className="section-title-text">🏢 All Clients</span>
          <span className="section-count">{filtered.length}</span>
        </div>

        {/* No results */}
        {filtered.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No clients found</h3>
            <p>Try a different search term</p>
          </div>
        )}

        {/* Client Rows */}
        <div className="clients-list">
          {filtered.map(client => {
            const rentals    = client.rentals ?? [];
            const isExpanded = expanded[client.client_id];
            const problems   = hasProblem(rentals);

            return (
              <div
                key={client.client_id}
                className={`client-row${problems ? ' has-problems' : ''}`}
              >
                {/* Clickable header */}
                <div
                  className="client-row-header"
                  onClick={() => toggleExpand(client.client_id)}
                >
                  <div className="client-avatar">{initials(client.company_name)}</div>

                  <div className="client-info">
                    <div className="client-name">{client.company_name}</div>
                    <div className="client-email">{client.email}</div>
                  </div>

                  <div className="client-meta">
                    {problems && (
                      <span className="problem-alert">⚠️ {countByStatus(rentals, 'problem')} Problem{countByStatus(rentals, 'problem') !== 1 ? 's' : ''}</span>
                    )}
                    <span className="client-printer-count">
                      🖨️ {rentals.filter(r => r.status !== 'ended').length} printer{rentals.filter(r => r.status !== 'ended').length !== 1 ? 's' : ''}
                    </span>
                    <span className={`account-status-badge ${client.account_status ? 'active' : 'inactive'}`}>
                      {client.account_status ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={e => { e.stopPropagation(); openDetail(client); }}
                    >
                      👁 Details
                    </button>
                    <span className={`expand-arrow${isExpanded ? ' open' : ''}`}>▼</span>
                  </div>
                </div>

                {/* Expandable printer sub-grid */}
                {isExpanded && (
                  <div className="printer-subgrid-wrap">
                    {rentals.length === 0 ? (
                      <div className="printer-subgrid">
                        <div className="no-printers">No printers rented yet.</div>
                      </div>
                    ) : (
                      <div className="printer-subgrid">
                        {[...rentals]
                          .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
                          .map(rental => (
                            <div
                              key={rental.rental_id}
                              className={`printer-sub-card status-${rental.status}`}
                            >
                              <div className="sub-card-model">{rental.printer_model}</div>
                              <div className="sub-card-meta">
                                <div className="sub-card-rate">
                                  ₱{Number(rental.rate).toLocaleString()}<span>/mo</span>
                                </div>
                                <span className={`status-badge ${rental.status}`}>{rental.status}</span>
                              </div>
                              <div className="sub-card-dates">
                                <span><strong>Since:</strong> {fmtDate(rental.start_date)}</span>
                                {rental.status === 'ended' && (
                                  <span><strong>Until:</strong> {fmtDate(rental.end_date)}</span>
                                )}
                              </div>
                              {rental.status === 'problem' && (
                                <button
                                  className="btn-resolve"
                                  style={{ marginTop: '10px', width: '100%', fontSize: '12px', padding: '8px' }}
                                  onClick={() => handleResolve(rental.rental_id)}
                                >
                                  ✅ Mark Resolved
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Detail Modal ── */}
      {detailTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>🏢 Client Details</h2>
                <p>Full profile and printer breakdown</p>
              </div>
              <button className="modal-close" onClick={closeDetail}>✕</button>
            </div>

            {/* Client preview */}
            <div className="modal-client-preview">
              <div className="preview-avatar">{initials(detailTarget.company_name)}</div>
              <div>
                <div className="preview-name">{detailTarget.company_name}</div>
                <div className="preview-email">{detailTarget.email}</div>
                <div className="preview-since">Client since {fmtDate(detailTarget.created_at)}</div>
              </div>
            </div>

            <div className="modal-body">
              {/* Account info */}
              <div className="modal-section-label">Account Info</div>
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <div className="info-label">Phone</div>
                  <div className="info-value">{detailTarget.company_number || '—'}</div>
                </div>
                <div className="modal-info-item">
                  <div className="info-label">Account Status</div>
                  <div className="info-value">{detailTarget.account_status ? '✅ Active' : '❌ Inactive'}</div>
                </div>
                <div className="modal-info-item full-width">
                  <div className="info-label">Address</div>
                  <div className="info-value">{detailTarget.company_address || '—'}</div>
                </div>
              </div>

              {/* Printer summary counts */}
              <div className="modal-section-label">Rental Summary</div>
              <div className="modal-info-grid">
                {[
                  { label: 'Active',  count: countByStatus(detailTarget.rentals, 'active'),  emoji: '✅' },
                  { label: 'Pending', count: countByStatus(detailTarget.rentals, 'pending'), emoji: '⏳' },
                  { label: 'Problem', count: countByStatus(detailTarget.rentals, 'problem'), emoji: '⚠️' },
                  { label: 'Ended',   count: countByStatus(detailTarget.rentals, 'ended'),   emoji: '📦' },
                ].map(s => (
                  <div className="modal-info-item" key={s.label}>
                    <div className="info-label">{s.emoji} {s.label}</div>
                    <div className="info-value">{s.count} printer{s.count !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>

              {/* Printer list */}
              <div className="modal-section-label">Rented Printers ({(detailTarget.rentals ?? []).length})</div>
              <div className="modal-printer-list">
                {(detailTarget.rentals ?? []).length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--gray-400)', textAlign: 'center', padding: '16px' }}>
                    No printers rented.
                  </div>
                ) : (
                  [...(detailTarget.rentals ?? [])]
                    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
                    .map(rental => (
                      <div
                        key={rental.rental_id}
                        className={`modal-printer-item${rental.status === 'problem' ? ' is-problem' : ''}`}
                      >
                        <div className="modal-printer-item-left">
                          <div className="modal-printer-item-model">{rental.printer_model}</div>
                          <div className="modal-printer-item-date">
                            Since {fmtDate(rental.start_date)}
                            {rental.status === 'ended' && ` → ${fmtDate(rental.end_date)}`}
                          </div>
                        </div>
                        <div className="modal-printer-item-right">
                          <span className="modal-printer-rate">
                            ₱{Number(rental.rate).toLocaleString()}/mo
                          </span>
                          <span className={`status-badge ${rental.status}`}>{rental.status}</span>
                          {rental.status === 'problem' && (
                            <button
                              className="btn-resolve"
                              style={{ padding: '5px 12px', fontSize: '11.5px' }}
                              onClick={() => handleResolve(rental.rental_id)}
                            >
                              ✅ Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDetail}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
