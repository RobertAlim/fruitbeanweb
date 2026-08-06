'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './admin.css';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ContractTimer from '../components/ContractTimer';
import { notify } from '../components/toast';

const STATUS_ORDER = { active: 0, pending: 1, problem: 2, resolved: 3, ended: 4 };
const TECHNICIANS  = ['Arjay', 'Em Jay', 'OJT Gang', 'Leyah', 'Alim'];
const EXTEND_OPTIONS = [
  { months: 3,  label: '3 Months' },
  { months: 6,  label: '6 Months' },
  { months: 12, label: '1 Year' },
  { months: 24, label: '2 Years' },
];
const EXTEND_TYPE_PHRASE = 'EXTEND';

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients]                       = useState([]);
  const [pendingAdmins, setPendingAdmins]           = useState([]);
  const [pendingActionId, setPendingActionId]       = useState(null);
  const [loading, setLoading]                       = useState(true);
  const [refreshing, setRefreshing]                 = useState(false);
  const [admin, setAdmin]                           = useState({ name: '', initials: '' });
  const [adminClientId, setAdminClientId]           = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [search, setSearch]                         = useState('');
  const [expanded, setExpanded]                     = useState({});
  const [detailTarget, setDetailTarget]             = useState(null);
  const [showReportModal, setShowReportModal]       = useState(false);
  const [showHistoryModal, setShowHistoryModal]     = useState(false);
  const [historySearch, setHistorySearch]           = useState('');
  const [historyFilter, setHistoryFilter]           = useState('all');
  const [editTarget, setEditTarget]                 = useState(null);
  const [editForm, setEditForm]                     = useState({ company_name: '', company_number: '', company_address: '' });
  const [editSubmitting, setEditSubmitting]         = useState(false);
  const [editError, setEditError]                   = useState('');
  const [confirmTarget, setConfirmTarget]           = useState(null);
  const [resolveTarget, setResolveTarget]           = useState(null);
  const [resolveMethod, setResolveMethod]           = useState(null);
  const [resolveTechnician, setResolveTechnician]   = useState('');
  const [resolveError, setResolveError]             = useState('');
  const [resolveSubmitting, setResolveSubmitting]   = useState(false);
  const [assignTarget, setAssignTarget]             = useState(null);
  const [assignTechnician, setAssignTechnician]     = useState('');
  const [assignDate, setAssignDate]                 = useState('');
  const [assignNote, setAssignNote]                 = useState('');
  const [assignError, setAssignError]               = useState('');
  const [assignSubmitting, setAssignSubmitting]     = useState(false);
  const [extendTarget, setExtendTarget]             = useState(null);
  const [extendStep, setExtendStep]                 = useState(1);
  const [extendMonths, setExtendMonths]             = useState(null);
  const [extendTypedConfirm, setExtendTypedConfirm] = useState('');
  const [extendError, setExtendError]               = useState('');
  const [extendSubmitting, setExtendSubmitting]     = useState(false);
  const [deleteTarget, setDeleteTarget]             = useState(null);
  const [deleteStep, setDeleteStep]                 = useState(1);
  const [deleteTypedConfirm, setDeleteTypedConfirm] = useState('');
  const [deleteError, setDeleteError]               = useState('');
  const [deleteSubmitting, setDeleteSubmitting]     = useState(false);
  const [awaitingHumanCount, setAwaitingHumanCount] = useState(0);

  /* ── Auth + fetch ── */
  useEffect(() => {
    // Support "Remember me": fall back to localStorage if sessionStorage was cleared
    if (!sessionStorage.getItem('client_id') && localStorage.getItem('client_id')) {
      ['client_id', 'account_name', 'account_email', 'account_type'].forEach(key => {
        const val = localStorage.getItem(key);
        if (val) sessionStorage.setItem(key, val);
      });
    }

    const client_id    = sessionStorage.getItem('client_id');
    const account_type = sessionStorage.getItem('account_type');
    const account_name = sessionStorage.getItem('account_name');
    if (!client_id || account_type !== 'admin') { router.push('/login'); return; }
    setAdminClientId(client_id);
    const initials = account_name
      ? account_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : 'AD';
    setAdmin({ name: account_name, initials });
    fetchAll();
  }, [router]);

  async function fetchAll() {
    setRefreshing(true);
    try {
      const res  = await fetch('/api/admin/clients');
      const data = await res.json();
      if (res.ok) setClients(data.clients);

      const pendingRes  = await fetch('/api/admin/clients?account_type=admin&active=false');
      const pendingData = await pendingRes.json();
      if (pendingRes.ok) setPendingAdmins(pendingData.clients);

      const chatsRes  = await fetch('/api/admin/conversations?status=awaiting_human');
      const chatsData = await chatsRes.json();
      if (chatsRes.ok) setAwaitingHumanCount(chatsData.conversations.length);
    } catch (err) { console.error('Failed to fetch clients:', err); }
    finally { setRefreshing(false); setLoading(false); }
  }

  async function handleApproveAdmin(client_id) {
    setPendingActionId(client_id);
    try {
      const res = await fetch('/api/admin/clients', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_id, account_status: true }),
      });
      if (res.ok) {
        setPendingAdmins(prev => prev.filter(p => p.client_id !== client_id));
        notify('Admin account approved.', 'success');
      } else {
        notify('Failed to approve admin. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Failed to approve admin:', err);
      notify('Failed to approve admin. Please try again.', 'error');
    }
    finally { setPendingActionId(null); }
  }

  async function handleRejectAdmin(client_id) {
    if (!confirm('Reject and delete this admin account request? This cannot be undone.')) return;
    setPendingActionId(client_id);
    try {
      const res = await fetch('/api/admin/clients', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_id }),
      });
      if (res.ok) {
        setPendingAdmins(prev => prev.filter(p => p.client_id !== client_id));
        notify('Admin account request rejected.', 'success');
      } else {
        notify('Failed to reject admin. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Failed to reject admin:', err);
      notify('Failed to reject admin. Please try again.', 'error');
    }
    finally { setPendingActionId(null); }
  }

  /* ── Derived data ── */
  const allRentals = useMemo(
    () => clients.flatMap(c => c.rentals ?? []),
    [clients]
  );

  const allRentalsWithClient = useMemo(
    () => clients.flatMap(c =>
      (c.rentals ?? []).map(r => ({ ...r, company_name: c.company_name, client_email: c.email }))
    ),
    [clients]
  );

  const currentMonthlyRevenue = useMemo(
    () => allRentalsWithClient
      .filter(r => r.status === 'active')
      .reduce((sum, r) => sum + Number(r.rate || 0), 0),
    [allRentalsWithClient]
  );

  const monthlyReport = useMemo(() => {
    const map = {};
    const add = (dateStr, field) => {
      if (!dateStr) return;
      const d     = new Date(dateStr);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
      if (!map[key]) map[key] = { key, label, newRentals: 0, problemsReported: 0, resolved: 0, confirmed: 0 };
      map[key][field]++;
    };
    allRentalsWithClient.forEach(r => {
      add(r.start_date,  'newRentals');
      if (r.reported_at)  add(r.reported_at,  'problemsReported');
      if (r.resolved_at)  add(r.resolved_at,  'resolved');
      if (r.confirmed_at) add(r.confirmed_at, 'confirmed');
    });
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
  }, [allRentalsWithClient]);

  const historyFiltered = useMemo(() => {
    let list = [...allRentalsWithClient];
    if (historyFilter !== 'all') list = list.filter(r => r.status === historyFilter);
    if (historySearch) {
      const q = historySearch.toLowerCase();
      list = list.filter(r =>
        (r.printer_model?.toLowerCase() ?? '').includes(q) ||
        (r.company_name?.toLowerCase()  ?? '').includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  }, [allRentalsWithClient, historyFilter, historySearch]);

  const stats = [
    { label: 'Clients',          count: clients.length,                                          icon: '🏢', cls: 'clients-icon'  },
    { label: 'Active',           count: allRentals.filter(r => r.status === 'active').length,    icon: '✅', cls: 'active-icon'   },
    { label: 'Pending',          count: allRentals.filter(r => r.status === 'pending').length,   icon: '⏳', cls: 'pending-icon'  },
    { label: 'Problems',         count: allRentals.filter(r => r.status === 'problem').length,   icon: '⚠️', cls: 'problem-icon'  },
    { label: 'Awaiting Confirm', count: allRentals.filter(r => r.status === 'resolved').length,  icon: '🔧', cls: 'resolved-icon' },
    { label: 'Ended',            count: allRentals.filter(r => r.status === 'ended').length,     icon: '📦', cls: 'ended-icon'    },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c =>
      (c.company_name?.toLowerCase() ?? '').includes(q) ||
      (c.email?.toLowerCase()        ?? '').includes(q) ||
      (c.rentals ?? []).some(r => r.printer_model?.toLowerCase().includes(q))
    );
  }, [clients, search]);

  /* ── Helpers ── */
  function toggleExpand(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); }
  function openDetail(client) { setDetailTarget(client); }
  function closeDetail() { setDetailTarget(null); }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  function countByStatus(rentals, status) { return (rentals ?? []).filter(r => r.status === status).length; }
  function hasProblem(rentals) { return (rentals ?? []).some(r => r.status === 'problem'); }

  /* ── Optimistic state helpers ── */
  function applyStatusChange(rental_id, newStatus) {
    const update = prev => ({
      ...prev,
      rentals: (prev.rentals ?? []).map(r =>
        r.rental_id === rental_id ? { ...r, status: newStatus } : r
      ),
    });
    setClients(prev => prev.map(c => update(c)));
    if (detailTarget) setDetailTarget(prev => update(prev));
  }

  function applyRentalUpdate(updatedRental) {
    const update = prev => ({
      ...prev,
      rentals: (prev.rentals ?? []).map(r =>
        r.rental_id === updatedRental.rental_id ? { ...r, ...updatedRental } : r
      ),
    });
    setClients(prev => prev.map(c => update(c)));
    if (detailTarget) setDetailTarget(prev => update(prev));
  }

  function removeRentalLocally(rental_id) {
    const strip = prev => ({
      ...prev,
      rentals: (prev.rentals ?? []).filter(r => r.rental_id !== rental_id),
    });
    setClients(prev => prev.map(c => strip(c)));
    if (detailTarget) setDetailTarget(prev => strip(prev));
  }

  const STATUS_TOAST_LABELS = {
    active:   'Rental activated.',
    problem:  'Rental flagged as a problem.',
    resolved: 'Rental marked resolved.',
    ended:    'Rental ended.',
  };

  async function handleStatusChange(rental_id, newStatus) {
    applyStatusChange(rental_id, newStatus);
    try {
      const res = await fetch('/api/rentals', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rental_id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      notify(STATUS_TOAST_LABELS[newStatus] || 'Rental updated.', 'success');
    } catch (err) {
      console.error('Failed to update rental:', err);
      notify('Failed to update rental. Please try again.', 'error');
      try {
        const res  = await fetch('/api/admin/clients');
        const data = await res.json();
        if (res.ok) setClients(data.clients);
      } catch {}
    }
  }

  // Denying a still-pending rental request means it never actually
  // happened — delete the row entirely instead of parking it under
  // "Ended" where it'd just sit as clutter.
  async function handleDenyRental(rental_id) {
    removeRentalLocally(rental_id);
    try {
      const res = await fetch('/api/rentals', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rental_id }),
      });
      if (!res.ok) throw new Error('Failed');
      notify('Rental request denied and removed.', 'success');
    } catch (err) {
      console.error('Failed to deny rental:', err);
      notify('Failed to deny rental. Please try again.', 'error');
      try {
        const res  = await fetch('/api/admin/clients');
        const data = await res.json();
        if (res.ok) setClients(data.clients);
      } catch {}
    }
  }

  /* ── Confirm popup ── */
  const CONFIRM_COPY = {
    problem: { title: '⚠️ Flag as Problem?',      body: m => `This marks ${m} as having a problem.`,                    confirmLabel: 'Yes, Flag It',    confirmBg: '#b45309' },
    ended:   { title: '📦 End This Rental?',       body: m => `This ends the rental for ${m}.`,                          confirmLabel: 'Yes, End Rental', confirmBg: '#475569' },
    deny:    { title: '🚫 Deny Rental Request?',   body: m => `This will deny and permanently delete the pending rental request for ${m}. The client will be notified.`, confirmLabel: 'Yes, Deny Request', confirmBg: '#dc2626' },
  };
  function openConfirm(rental, action) { setConfirmTarget({ rental, action }); }
  function closeConfirm() { setConfirmTarget(null); }
  function runConfirmedAction() {
    if (!confirmTarget) return;
    if (confirmTarget.action === 'deny') {
      handleDenyRental(confirmTarget.rental.rental_id);
    } else {
      handleStatusChange(confirmTarget.rental.rental_id, confirmTarget.action);
    }
    closeConfirm();
  }

  /* ── Resolve popup ── */
  function openResolveModal(rental) {
    setResolveTarget(rental); setResolveMethod(null);
    setResolveTechnician(''); setResolveError('');
  }
  function closeResolveModal() { setResolveTarget(null); }

  async function confirmResolve() {
    if (!resolveMethod) { setResolveError('Choose how the problem was fixed.'); return; }
    if (resolveMethod === 'technician' && !resolveTechnician) { setResolveError('Select which technician fixed it.'); return; }
    setResolveSubmitting(true); setResolveError('');
    try {
      const res = await fetch('/api/rentals', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          rental_id:         resolveTarget.rental_id,
          status:            'resolved',
          resolution_method: resolveMethod,
          technician:        resolveMethod === 'technician' ? resolveTechnician : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve');
      applyRentalUpdate(data.rental);
      closeResolveModal();
      notify('Problem marked as resolved. Client has been notified.', 'success');
    } catch (err) {
      console.error(err);
      setResolveError('Something went wrong. Please try again.');
      notify('Failed to mark as resolved. Please try again.', 'error');
    }
    finally { setResolveSubmitting(false); }
  }

  /* ── Assign popup ── */
  function openAssignModal(rental) {
    setAssignTarget(rental);
    setAssignTechnician(rental.assigned_technician || '');
    setAssignDate(rental.arrival_date ? rental.arrival_date.slice(0, 10) : '');
    setAssignNote(rental.assignment_note || '');
    setAssignError('');
  }
  function closeAssignModal() { setAssignTarget(null); }

  async function confirmAssign() {
    if (!assignTechnician) { setAssignError('Select which technician is being sent.'); return; }
    if (!assignDate)       { setAssignError('Pick an arrival date.'); return; }
    setAssignSubmitting(true); setAssignError('');
    try {
      const res = await fetch('/api/rentals', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          rental_id: assignTarget.rental_id,
          assign:    true,
          technician:   assignTechnician,
          arrival_date: assignDate,
          note:         assignNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign');
      applyRentalUpdate(data.rental);
      closeAssignModal();
      notify('Technician assigned.', 'success');
    } catch (err) {
      console.error(err);
      setAssignError('Something went wrong. Please try again.');
      notify('Failed to assign technician. Please try again.', 'error');
    }
    finally { setAssignSubmitting(false); }
  }

  /* ── Extend contract popup (3-step: choose duration → type to confirm → final warning) ── */
  function openExtendModal(rental) {
    setExtendTarget(rental);
    setExtendStep(1);
    setExtendMonths(null);
    setExtendTypedConfirm('');
    setExtendError('');
  }
  function closeExtendModal() { setExtendTarget(null); }

  function extendedEndDate() {
    if (!extendTarget || !extendMonths) return null;
    const base = extendTarget.contract_end ? new Date(extendTarget.contract_end) : new Date();
    base.setMonth(base.getMonth() + extendMonths);
    return base;
  }

  function goToExtendStep2() {
    if (!extendMonths) { setExtendError('Choose how long to extend the contract.'); return; }
    setExtendError('');
    setExtendStep(2);
  }

  function goToExtendStep3() {
    if (extendTypedConfirm.trim().toUpperCase() !== EXTEND_TYPE_PHRASE) {
      setExtendError(`Type "${EXTEND_TYPE_PHRASE}" exactly to continue.`);
      return;
    }
    setExtendError('');
    setExtendStep(3);
  }

  async function confirmExtend() {
    setExtendSubmitting(true); setExtendError('');
    try {
      const res = await fetch('/api/rentals', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          rental_id: extendTarget.rental_id,
          extend:    true,
          months:    extendMonths,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend contract');
      applyRentalUpdate(data.rental);
      closeExtendModal();
      notify('Contract extended.', 'success');
    } catch (err) {
      console.error(err);
      setExtendError('Something went wrong. Please try again.');
      notify('Failed to extend contract. Please try again.', 'error');
    }
    finally { setExtendSubmitting(false); }
  }

  /* ── Delete client popup (2-step: warning → type to confirm) ── */
  function openDeleteModal(client) {
    setDeleteTarget(client);
    setDeleteStep(1);
    setDeleteTypedConfirm('');
    setDeleteError('');
  }
  function closeDeleteModal() { setDeleteTarget(null); }

  function goToDeleteStep2() {
    setDeleteError('');
    setDeleteStep(2);
  }

  async function confirmDelete() {
    if (deleteTypedConfirm.trim() !== deleteTarget.company_name) {
      setDeleteError('That doesn\'t match the company name. Type it exactly to continue.');
      return;
    }
    setDeleteSubmitting(true); setDeleteError('');
    try {
      const res = await fetch('/api/admin/clients', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_id: deleteTarget.client_id, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete client');
      setClients(prev => prev.filter(c => c.client_id !== deleteTarget.client_id));
      if (detailTarget?.client_id === deleteTarget.client_id) closeDetail();
      closeDeleteModal();
      notify('Client account deleted.', 'success');
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || 'Something went wrong. Please try again.');
      notify(err.message || 'Failed to delete client. Please try again.', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  }

  /* ── Edit company ── */
  function openEdit(client) {
    setEditTarget(client);
    setEditForm({
      company_name:    client.company_name    || '',
      company_number:  client.company_number  || '',
      company_address: client.company_address || '',
    });
    setEditError('');
  }

  async function submitEdit() {
    if (!editForm.company_name.trim()) { setEditError('Company name is required.'); return; }
    setEditSubmitting(true); setEditError('');
    try {
      const res = await fetch('/api/admin/clients', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_id: editTarget.client_id, ...editForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      const updated = {
        company_name:    data.client.company_name,
        company_number:  data.client.company_number,
        company_address: data.client.company_address,
      };
      setClients(prev => prev.map(c => c.client_id === editTarget.client_id ? { ...c, ...updated } : c));
      if (detailTarget?.client_id === editTarget.client_id) setDetailTarget(prev => ({ ...prev, ...updated }));
      setEditTarget(null);
      notify('Company details updated.', 'success');
    } catch (err) {
      setEditError(err.message || 'Something went wrong.');
      notify(err.message || 'Failed to update company details.', 'error');
    }
    finally { setEditSubmitting(false); }
  }

  /* ── Print report ── */
  function printReport() {
    const win           = window.open('', '_blank', 'width=1024,height=768');
    const totalActive   = allRentalsWithClient.filter(r => r.status === 'active').length;
    const totalProblems = allRentalsWithClient.filter(r => ['problem', 'resolved'].includes(r.status)).length;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Fruitbean Monthly Report</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;padding:32px;color:#1a1a2e}
        h1{font-size:22px;color:#3ab549;margin-bottom:4px}
        .meta{font-size:12px;color:#666;margin-bottom:28px}
        .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px}
        .sc{background:#f8f9fa;border:1px solid #eee;border-radius:8px;padding:16px}
        .sc .n{font-size:26px;font-weight:800}
        .sc .l{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
        h2{font-size:15px;font-weight:700;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #eee}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px}
        th{background:#f1f3f4;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#666;border-bottom:2px solid #e0e0e0}
        td{padding:9px 12px;border-bottom:1px solid #f0f0f0}
        .g{color:#2a8a37;font-weight:700}.r{color:#c62828;font-weight:700}.b{color:#0d7aa8}
        @media print{button{display:none!important}}
      </style>
    </head><body>
      <h1>Fruitbean Ink Refilling Station</h1>
      <div class="meta">Operations Report — Generated ${new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}</div>
      <div class="summary">
        <div class="sc"><div class="n" style="color:#5b4cf5">${clients.length}</div><div class="l">Total Clients</div></div>
        <div class="sc"><div class="n g">${totalActive}</div><div class="l">Active Printers</div></div>
        <div class="sc"><div class="n b">₱${currentMonthlyRevenue.toLocaleString()}</div><div class="l">Est. Monthly Revenue</div></div>
        <div class="sc"><div class="n r">${totalProblems}</div><div class="l">Open Issues</div></div>
      </div>
      <h2>Monthly Activity Breakdown</h2>
      <table><thead><tr><th>Month</th><th>New Rentals</th><th>Problems Reported</th><th>Resolved</th><th>Client Confirmed</th></tr></thead>
      <tbody>${monthlyReport.length === 0
        ? '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">No data yet</td></tr>'
        : monthlyReport.map(m =>
            `<tr><td><strong>${m.label}</strong></td><td>${m.newRentals}</td>
             <td class="${m.problemsReported > 0 ? 'r' : ''}">${m.problemsReported}</td>
             <td class="${m.resolved > 0 ? 'b' : ''}">${m.resolved}</td>
             <td class="${m.confirmed > 0 ? 'g' : ''}">${m.confirmed}</td></tr>`
          ).join('')}
      </tbody></table>
      <h2>Client Summary</h2>
      <table><thead><tr><th>Company</th><th>Email</th><th>Phone</th><th>Active</th><th>Pending</th><th>Issues</th><th>Ended</th></tr></thead>
      <tbody>${clients.map(c =>
        `<tr>
          <td><strong>${c.company_name}</strong></td>
          <td>${c.email}</td>
          <td>${c.company_number || '—'}</td>
          <td class="g">${(c.rentals ?? []).filter(r => r.status === 'active').length}</td>
          <td>${(c.rentals ?? []).filter(r => r.status === 'pending').length}</td>
          <td class="r">${(c.rentals ?? []).filter(r => ['problem','resolved'].includes(r.status)).length}</td>
          <td>${(c.rentals ?? []).filter(r => r.status === 'ended').length}</td>
        </tr>`
      ).join('')}
      </tbody></table>
      <script>window.onload=function(){window.print()}</script>
    </body></html>`);
    win.document.close();
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#9aa0a6' }}>
      Loading clients…
    </div>
  );

  /* ════════════════════════════════ RENDER ════════════════════════════════ */
  return (
    <div className="admin-page">
      {/* ── Header ── */}
      <header className="admin-header">
        <a href="/" className="header-logo">
          <div className="header-logo-icon"><img src="/Fruitbean Logo.png" alt="Fruitbean" /></div>
          <div className="header-logo-text">
            <span className="brand">Fruit<span>bean</span></span>
            <span className="sub">Ink Refilling Station</span>
          </div>
        </a>
        <div className="header-right">
          <a href="/admin/chats" className="btn-secondary">
            💬 Live Chat{awaitingHumanCount > 0 ? ` (${awaitingHumanCount})` : ''}
          </a>
          <div className="header-user">
            <div className="user-avatar">{admin.initials}</div>
            <div className="user-info">
              <span className="user-name">{admin.name}</span>
              <span className="user-label">Administrator</span>
            </div>
          </div>
          <button className="btn-secondary" onClick={() => setShowChangePassword(true)}>
            🔒 Change Password
          </button>
          <button className="btn-logout" onClick={() => { sessionStorage.clear(); localStorage.removeItem('client_id'); localStorage.removeItem('account_name'); localStorage.removeItem('account_email'); localStorage.removeItem('account_type'); router.push('/login'); }}>
            Logout
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
            <button className="btn-secondary" onClick={fetchAll} disabled={refreshing}>
              {refreshing ? '🔄 Refreshing…' : '🔄 Refresh'}
            </button>
            <button className="btn-secondary" onClick={() => setShowReportModal(true)}>
              📊 Export Report
            </button>
            <button className="btn-secondary" onClick={() => { setHistorySearch(''); setHistoryFilter('all'); setShowHistoryModal(true); }}>
              📋 Rental History
            </button>
          </div>
        </div>

        {/* Pending Admin Account Requests */}
        {pendingAdmins.length > 0 && (
          <div style={{
            background: '#fff8e6', border: '1.5px solid #f0c95c', borderRadius: '12px',
            padding: '16px 20px', marginBottom: '20px',
          }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: '#8a6200' }}>
              🔔 Pending Admin Account Requests ({pendingAdmins.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingAdmins.map(p => (
                <div key={p.client_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fff', border: '1px solid #f0e0b0', borderRadius: '8px',
                  padding: '10px 14px', flexWrap: 'wrap', gap: '10px',
                }}>
                  <div style={{ fontSize: '13px' }}>
                    <strong>{p.company_name}</strong>
                    <span style={{ color: '#888' }}> — {p.email}</span>
                    {p.company_number && <span style={{ color: '#888' }}> · {p.company_number}</span>}
                    {p.company_address && <span style={{ color: '#888' }}> · {p.company_address}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-secondary"
                      disabled={pendingActionId === p.client_id}
                      onClick={() => handleRejectAdmin(p.client_id)}
                      style={{ color: '#e53e3e', borderColor: '#e53e3e' }}
                    >
                      ✕ Reject
                    </button>
                    <button
                      className="btn-primary"
                      disabled={pendingActionId === p.client_id}
                      onClick={() => handleApproveAdmin(p.client_id)}
                    >
                      {pendingActionId === p.client_id ? 'Approving…' : '✓ Approve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              <div key={client.client_id} className={`client-row${problems ? ' has-problems' : ''}`}>

                {/* Clickable header */}
                <div className="client-row-header" onClick={() => toggleExpand(client.client_id)}>
                  <div className="client-avatar">{initials(client.company_name)}</div>
                  <div className="client-info">
                    <div className="client-name">{client.company_name}</div>
                    <div className="client-email">{client.email}</div>
                  </div>
                  <div className="client-meta">
                    {problems && (
                      <span className="problem-alert">
                        ⚠️ {countByStatus(rentals, 'problem')} Problem{countByStatus(rentals, 'problem') !== 1 ? 's' : ''}
                      </span>
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
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={e => { e.stopPropagation(); openEdit(client); }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-secondary btn-danger-outline"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={e => { e.stopPropagation(); openDeleteModal(client); }}
                    >
                      🗑️ Delete
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
                          .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))
                          .map(rental => (
                            <div key={rental.rental_id} className={`printer-sub-card status-${rental.status}`}>
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
                              {rental.status !== 'ended' && (rental.contract_start || rental.contract_end) && (
                                <>
                                  <ContractTimer
                                    contractStart={rental.contract_start}
                                    contractEnd={rental.contract_end}
                                    compact
                                  />
                                  <button
                                    className="btn-resolve"
                                    style={{ width: '100%', fontSize: '12px', padding: '8px', background: 'var(--admin)', marginTop: '6px' }}
                                    onClick={() => openExtendModal(rental)}
                                  >
                                    📅 Extend Contract
                                  </button>
                                </>
                              )}

                              {/* Problem ticket detail */}
                              {(rental.status === 'problem' || rental.status === 'resolved') &&
                                (rental.problem_types?.length > 0 || rental.notes) && (
                                <div className="sub-card-ticket">
                                  {rental.problem_types?.length > 0 && (
                                    <div className="sub-card-ticket-tags">
                                      {rental.problem_types.map(t => (
                                        <span key={t} className="ticket-tag">{t.replaceAll('_', ' ')}</span>
                                      ))}
                                      {rental.urgency && (
                                        <span className={`urgency-tag urgency-${rental.urgency}`}>{rental.urgency}</span>
                                      )}
                                    </div>
                                  )}
                                  {rental.notes && (
                                    <div className="sub-card-ticket-notes">"{rental.notes}"</div>
                                  )}
                                </div>
                              )}

                              {/* Assigned technician note */}
                              {rental.status === 'problem' && rental.assigned_technician && (
                                <div className="assign-info-note">
                                  🧑‍🔧 <strong>{rental.assigned_technician}</strong> assigned · arriving {fmtDate(rental.arrival_date)}
                                  {rental.assignment_note && (
                                    <div className="assign-info-note-text">"{rental.assignment_note}"</div>
                                  )}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {rental.status === 'pending' && (
                                  <>
                                    <button
                                      className="btn-resolve"
                                      style={{ width: '100%', fontSize: '12px', padding: '8px', background: '#16a34a' }}
                                      onClick={() => handleStatusChange(rental.rental_id, 'active')}
                                    >
                                      ✅ Activate Rental
                                    </button>
                                    <button
                                      className="btn-resolve"
                                      style={{ width: '100%', fontSize: '12px', padding: '8px', background: '#dc2626' }}
                                      onClick={() => openConfirm(rental, 'deny')}
                                    >
                                      🚫 Deny Request
                                    </button>
                                  </>
                                )}
                                {rental.status === 'active' && (
                                  <>
                                    <button
                                      className="btn-resolve"
                                      style={{ width: '100%', fontSize: '12px', padding: '8px', background: '#b45309' }}
                                      onClick={() => openConfirm(rental, 'problem')}
                                    >
                                      ⚠️ Flag as Problem
                                    </button>
                                    <button
                                      className="btn-resolve"
                                      style={{ width: '100%', fontSize: '12px', padding: '8px', background: '#475569' }}
                                      onClick={() => openConfirm(rental, 'ended')}
                                    >
                                      📦 End Rental
                                    </button>
                                  </>
                                )}
                                {rental.status === 'problem' && (
                                  <>
                                    <button
                                      className="btn-resolve"
                                      style={{ width: '100%', fontSize: '12px', padding: '8px', background: '#0d7aa8' }}
                                      onClick={() => openAssignModal(rental)}
                                    >
                                      🧑‍🔧 {rental.assigned_technician ? 'Update Assignment' : 'Assign Technician'}
                                    </button>
                                    <button
                                      className="btn-resolve"
                                      style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                                      onClick={() => openResolveModal(rental)}
                                    >
                                      ✅ Mark Resolved
                                    </button>
                                    <button
                                      className="btn-resolve"
                                      style={{ width: '100%', fontSize: '12px', padding: '8px', background: '#475569' }}
                                      onClick={() => openConfirm(rental, 'ended')}
                                    >
                                      📦 End Rental
                                    </button>
                                  </>
                                )}
                                {rental.status === 'resolved' && (
                                  <div className="awaiting-confirm-note">
                                    ⏳ Waiting for client to confirm the fix
                                    {rental.resolution_method === 'technician'
                                      ? ` (${rental.technician})`
                                      : ' (AnyDesk)'}
                                  </div>
                                )}
                              </div>
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

      {/* ════════════════════════════ MODALS ════════════════════════════ */}

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
            <div className="modal-client-preview">
              <div className="preview-avatar">{initials(detailTarget.company_name)}</div>
              <div>
                <div className="preview-name">{detailTarget.company_name}</div>
                <div className="preview-email">{detailTarget.email}</div>
                <div className="preview-since">Client since {fmtDate(detailTarget.created_at)}</div>
              </div>
            </div>
            <div className="modal-body">
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
              <div className="modal-section-label">Rental Summary</div>
              <div className="modal-info-grid">
                {[
                  { label: 'Active',   count: countByStatus(detailTarget.rentals, 'active'),   emoji: '✅' },
                  { label: 'Pending',  count: countByStatus(detailTarget.rentals, 'pending'),  emoji: '⏳' },
                  { label: 'Problem',  count: countByStatus(detailTarget.rentals, 'problem'),  emoji: '⚠️' },
                  { label: 'Resolved', count: countByStatus(detailTarget.rentals, 'resolved'), emoji: '🔧' },
                  { label: 'Ended',    count: countByStatus(detailTarget.rentals, 'ended'),    emoji: '📦' },
                ].map(s => (
                  <div className="modal-info-item" key={s.label}>
                    <div className="info-label">{s.emoji} {s.label}</div>
                    <div className="info-value">{s.count} printer{s.count !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
              <div className="modal-section-label">
                Rented Printers ({(detailTarget.rentals ?? []).length})
              </div>
              <div className="modal-printer-list">
                {(detailTarget.rentals ?? []).length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--gray-400)', textAlign: 'center', padding: '16px' }}>
                    No printers rented.
                  </div>
                ) : (
                  [...(detailTarget.rentals ?? [])]
                    .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))
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
                          {rental.status !== 'ended' && (rental.contract_start || rental.contract_end) && (
                            <>
                              <ContractTimer
                                contractStart={rental.contract_start}
                                contractEnd={rental.contract_end}
                              />
                              <button
                                className="btn-resolve"
                                style={{ fontSize: '11.5px', padding: '5px 12px', background: 'var(--admin)', marginTop: '6px' }}
                                onClick={() => openExtendModal(rental)}
                              >
                                📅 Extend
                              </button>
                            </>
                          )}
                          {rental.status === 'problem' && rental.assigned_technician && (
                            <div className="assign-info-note" style={{ marginTop: '6px' }}>
                              🧑‍🔧 <strong>{rental.assigned_technician}</strong> · arriving {fmtDate(rental.arrival_date)}
                            </div>
                          )}
                        </div>
                        <div className="modal-printer-item-right">
                          <span className="modal-printer-rate">
                            ₱{Number(rental.rate).toLocaleString()}/mo
                          </span>
                          <span className={`status-badge ${rental.status}`}>{rental.status}</span>
                          {rental.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn-resolve"
                                style={{ padding: '5px 12px', fontSize: '11.5px', background: '#16a34a' }}
                                onClick={() => handleStatusChange(rental.rental_id, 'active')}
                              >
                                ✅ Activate
                              </button>
                              <button
                                className="btn-resolve"
                                style={{ padding: '5px 12px', fontSize: '11.5px', background: '#dc2626' }}
                                onClick={() => openConfirm(rental, 'deny')}
                              >
                                🚫 Deny
                              </button>
                            </div>
                          )}
                          {rental.status === 'active' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn-resolve"
                                style={{ padding: '5px 12px', fontSize: '11.5px', background: '#b45309' }}
                                onClick={() => openConfirm(rental, 'problem')}
                              >⚠️ Flag</button>
                              <button
                                className="btn-resolve"
                                style={{ padding: '5px 12px', fontSize: '11.5px', background: '#475569' }}
                                onClick={() => openConfirm(rental, 'ended')}
                              >📦 End</button>
                            </div>
                          )}
                          {rental.status === 'problem' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn-resolve"
                                style={{ padding: '5px 12px', fontSize: '11.5px', background: '#0d7aa8' }}
                                onClick={() => openAssignModal(rental)}
                              >🧑‍🔧 Assign</button>
                              <button
                                className="btn-resolve"
                                style={{ padding: '5px 12px', fontSize: '11.5px' }}
                                onClick={() => openResolveModal(rental)}
                              >✅ Resolve</button>
                              <button
                                className="btn-resolve"
                                style={{ padding: '5px 12px', fontSize: '11.5px', background: '#475569' }}
                                onClick={() => openConfirm(rental, 'ended')}
                              >📦 End</button>
                            </div>
                          )}
                          {rental.status === 'resolved' && (
                            <span style={{ fontSize: '11.5px', color: 'var(--gray-600)' }}>
                              ⏳ Awaiting client confirmation
                              {rental.resolution_method === 'technician'
                                ? ` · ${rental.technician}`
                                : ' · AnyDesk'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDetail}>Close</button>
              <button
                className="btn-report"
                style={{ background: 'var(--red)' }}
                onClick={() => { closeDetail(); openDeleteModal(detailTarget); }}
              >
                🗑️ Delete Client
              </button>
              <button
                className="btn-report"
                style={{ background: '#475569' }}
                onClick={() => { closeDetail(); openEdit(detailTarget); }}
              >
                ✏️ Edit Company Info
              </button>
            </div>
          </div>
        </div>
      )}

{/* ── Edit Company Modal ── */}
      {editTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditTarget(null); }}>
          <div className="modal-box confirm-modal-box" style={{ maxWidth: '460px', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header edit-modal-header">
              <div className="modal-header-title">
                <h2>✏️ Edit Company Info</h2>
                <p>Update details for {editTarget.company_name}</p>
              </div>
              <button className="modal-close" onClick={() => setEditTarget(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ paddingTop: '20px' }}>
              <div className="form-field">
                <div className="form-field-label">Company Name <span className="req">*</span></div>
                <div className="input-wrap">
                  <span className="input-icon">🏢</span>
                  <input
                    className="modal-notes"
                    value={editForm.company_name}
                    onChange={e => setEditForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="e.g. Acme Corporation"
                  />
                </div>
              </div>
              <div className="form-field">
                <div className="form-field-label">Contact Number</div>
                <div className="input-wrap">
                  <span className="input-icon">📞</span>
                  <input
                    className="modal-notes"
                    value={editForm.company_number}
                    onChange={e => setEditForm(f => ({ ...f, company_number: e.target.value }))}
                    placeholder="e.g. 09171234567"
                  />
                </div>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <div className="form-field-label">Company Address</div>
                <div className="input-wrap textarea">
                  <span className="input-icon">📍</span>
                  <textarea
                    className="modal-notes"
                    value={editForm.company_address}
                    onChange={e => setEditForm(f => ({ ...f, company_address: e.target.value }))}
                    placeholder="Full company address…"
                  />
                </div>
              </div>
              {editError && <div className="resolve-error" style={{ marginTop: '12px' }}>{editError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setEditTarget(null)}>Cancel</button>
              <button
                className="btn-report btn-save-glow"
                onClick={submitEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? 'Saving…' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Export Report Modal ── */}
      {showReportModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowReportModal(false); }}>
          <div className="modal-box" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>📊 Operations Report</h2>
                <p>Monthly breakdown of rentals and service activity</p>
              </div>
              <button className="modal-close" onClick={() => setShowReportModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '520px', overflowY: 'auto' }}>
              {/* Summary strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: 'Total Clients',     value: clients.length,                                                                  color: 'var(--admin)' },
                  { label: 'Active Printers',   value: allRentals.filter(r => r.status === 'active').length,                           color: '#16a34a'      },
                  { label: 'Est. Monthly Rev.', value: `₱${currentMonthlyRevenue.toLocaleString()}`,                                   color: '#0d7aa8'      },
                  { label: 'Open Issues',       value: allRentals.filter(r => ['problem','resolved'].includes(r.status)).length,       color: '#c62828'      },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="modal-section-label">Month-by-Month Activity</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)' }}>
                      {['Month', 'New Rentals', 'Problems Reported', 'Resolved', 'Client Confirmed'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--gray-400)', borderBottom: '2px solid var(--gray-200)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-400)' }}>No data yet</td></tr>
                    ) : monthlyReport.map(m => (
                      <tr key={m.key} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 700 }}>{m.label}</td>
                        <td style={{ padding: '9px 12px' }}>{m.newRentals}</td>
                        <td style={{ padding: '9px 12px', color: m.problemsReported > 0 ? '#c62828' : 'inherit', fontWeight: m.problemsReported > 0 ? 700 : 400 }}>{m.problemsReported}</td>
                        <td style={{ padding: '9px 12px', color: m.resolved > 0 ? '#0d7aa8' : 'inherit' }}>{m.resolved}</td>
                        <td style={{ padding: '9px 12px', color: m.confirmed > 0 ? '#16a34a' : 'inherit', fontWeight: m.confirmed > 0 ? 700 : 400 }}>{m.confirmed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px', padding: '12px', background: 'var(--admin-light)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', color: 'var(--admin)' }}>
                💡 Click "Print as PDF" to save this report. Your browser will open a print dialog — choose "Save as PDF" as the destination.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowReportModal(false)}>Close</button>
              <button className="btn-report" onClick={printReport} style={{ background: 'var(--admin)' }}>
                🖨️ Print as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rental History Modal ── */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}>
          <div className="modal-box" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>📋 Rental History</h2>
                <p>All rental records across every client</p>
              </div>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Filter bar */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-wrap" style={{ flex: '1', minWidth: '180px' }}>
                  <span className="search-icon">🔍</span>
                  <input
                    className="search-input"
                    style={{ width: '100%' }}
                    placeholder="Search company or printer…"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                  />
                </div>
                {['all', 'active', 'pending', 'problem', 'resolved', 'ended'].map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    style={{
                      padding: '7px 14px', borderRadius: '20px', border: '1.5px solid',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      borderColor: historyFilter === f ? 'var(--admin)' : 'var(--gray-200)',
                      background:  historyFilter === f ? 'var(--admin-light)' : 'var(--white)',
                      color:       historyFilter === f ? 'var(--admin)' : 'var(--gray-600)',
                    }}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                  {historyFiltered.length} record{historyFiltered.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Table */}
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: 'var(--gray-50)' }}>
                      {['Company', 'Printer', 'Rate', 'Start', 'End', 'Status', 'Reported', 'Resolved'].map(h => (
                        <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--gray-400)', borderBottom: '2px solid var(--gray-200)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>
                          No records match your filter
                        </td>
                      </tr>
                    ) : historyFiltered.map(r => (
                      <tr key={r.rental_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.company_name}</td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{r.printer_model}</td>
                        <td style={{ padding: '8px 10px', color: '#0d7aa8', fontWeight: 600, whiteSpace: 'nowrap' }}>₱{Number(r.rate).toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--gray-600)' }}>{fmtDate(r.start_date)}</td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--gray-600)' }}>{fmtDate(r.end_date)}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span className={`status-badge ${r.status}`}>{r.status}</span>
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontSize: '11.5px', color: 'var(--gray-600)' }}>
                          {fmtDate(r.reported_at)}
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontSize: '11.5px', color: r.resolved_at ? '#16a34a' : 'var(--gray-400)' }}>
                          {r.resolved_at ? fmtDate(r.resolved_at) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Action Modal ── */}
      {confirmTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeConfirm(); }}>
          <div className="modal-box confirm-modal-box">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>{CONFIRM_COPY[confirmTarget.action].title}</h2>
              </div>
              <button className="modal-close" onClick={closeConfirm}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-printer-preview">
                <span className="preview-icon">🖨️</span>
                <div><div className="preview-model">{confirmTarget.rental.printer_model}</div></div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.5, marginTop: '14px' }}>
                {CONFIRM_COPY[confirmTarget.action].body(confirmTarget.rental.printer_model)}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeConfirm}>Cancel</button>
              <button
                className="btn-report"
                onClick={runConfirmedAction}
                style={{ background: CONFIRM_COPY[confirmTarget.action].confirmBg }}
              >
                {CONFIRM_COPY[confirmTarget.action].confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Ticket Modal ── */}
      {resolveTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeResolveModal(); }}>
          <div className="modal-box resolve-modal-box">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>✅ Mark Problem as Fixed</h2>
                <p>How was this issue resolved?</p>
              </div>
              <button className="modal-close" onClick={closeResolveModal}>✕</button>
            </div>
            <div className="modal-printer-preview">
              <span className="preview-icon">🖨️</span>
              <div>
                <div className="preview-model">{resolveTarget.printer_model}</div>
                <div className="preview-label">
                  Reported {resolveTarget.reported_at ? fmtDate(resolveTarget.reported_at) : 'recently'}
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-section-label">Reported Issue</div>
              <div className="sub-card-ticket resolve-ticket-detail">
                {resolveTarget.problem_types?.length > 0 && (
                  <div className="sub-card-ticket-tags">
                    {resolveTarget.problem_types.map(t => (
                      <span key={t} className="ticket-tag">{t.replaceAll('_', ' ')}</span>
                    ))}
                    {resolveTarget.urgency && (
                      <span className={`urgency-tag urgency-${resolveTarget.urgency}`}>
                        {resolveTarget.urgency} urgency
                      </span>
                    )}
                  </div>
                )}
                {resolveTarget.notes ? (
                  <div className="sub-card-ticket-notes">"{resolveTarget.notes}"</div>
                ) : (
                  <div className="sub-card-ticket-notes" style={{ fontStyle: 'normal', color: 'var(--gray-400)' }}>
                    No additional notes provided.
                  </div>
                )}
              </div>
              <div className="modal-section-label">Resolution Method</div>
              <div className="resolve-method-group">
                <button
                  className={`resolve-method-btn${resolveMethod === 'technician' ? ' selected' : ''}`}
                  onClick={() => setResolveMethod('technician')}
                >
                  <span className="resolve-method-emoji">🧑‍🔧</span>
                  <span className="resolve-method-label">Technician</span>
                  <span className="resolve-method-desc">Fixed on-site by staff</span>
                </button>
                <button
                  className={`resolve-method-btn${resolveMethod === 'anydesk' ? ' selected' : ''}`}
                  onClick={() => setResolveMethod('anydesk')}
                >
                  <span className="resolve-method-emoji">💻</span>
                  <span className="resolve-method-label">AnyDesk</span>
                  <span className="resolve-method-desc">Fixed via online support</span>
                </button>
              </div>
              {resolveMethod === 'technician' && (
                <>
                  <div className="modal-section-label">Select Technician</div>
                  <div className="technician-list">
                    {TECHNICIANS.map(name => (
                      <button
                        key={name}
                        className={`technician-chip${resolveTechnician === name ? ' selected' : ''}`}
                        onClick={() => setResolveTechnician(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {resolveMethod === 'anydesk' && (
                <div className="anydesk-confirm-note">
                  💻 This will be logged as resolved via <strong>AnyDesk (Online Support)</strong>.
                </div>
              )}
              {resolveError && <div className="resolve-error">{resolveError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeResolveModal}>Cancel</button>
              <button
                className="btn-report"
                onClick={confirmResolve}
                disabled={resolveSubmitting || !resolveMethod || (resolveMethod === 'technician' && !resolveTechnician)}
                style={{ background: 'var(--admin)' }}
              >
                {resolveSubmitting ? 'Saving…' : '✅ Confirm Fixed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Technician Modal ── */}
      {assignTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeAssignModal(); }}>
          <div className="modal-box resolve-modal-box">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>🧑‍🔧 Assign Technician</h2>
                <p>Let the client know who's coming and when</p>
              </div>
              <button className="modal-close" onClick={closeAssignModal}>✕</button>
            </div>
            <div className="modal-printer-preview">
              <span className="preview-icon">🖨️</span>
              <div>
                <div className="preview-model">{assignTarget.printer_model}</div>
                <div className="preview-label">
                  Reported {assignTarget.reported_at ? fmtDate(assignTarget.reported_at) : 'recently'}
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-section-label">Select Technician</div>
              <div className="technician-list">
                {TECHNICIANS.map(name => (
                  <button
                    key={name}
                    className={`technician-chip${assignTechnician === name ? ' selected' : ''}`}
                    onClick={() => setAssignTechnician(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="modal-section-label">Arrival Date</div>
              <input
                type="date"
                className="modal-notes"
                style={{ minHeight: 'unset', resize: 'none' }}
                value={assignDate}
                onChange={e => setAssignDate(e.target.value)}
              />
              <div className="modal-section-label">Note for Client (optional)</div>
              <textarea
                className="modal-notes"
                placeholder="e.g. Please make sure someone is available to let the technician in…"
                value={assignNote}
                onChange={e => setAssignNote(e.target.value)}
              />
              {assignError && <div className="resolve-error">{assignError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeAssignModal}>Cancel</button>
              <button
                className="btn-report"
                onClick={confirmAssign}
                disabled={assignSubmitting}
                style={{ background: '#0d7aa8' }}
              >
                {assignSubmitting ? 'Saving…' : '🧑‍🔧 Notify Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Extend Contract Modal (3-step: choose duration → type to confirm → final warning) ── */}
      {extendTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeExtendModal(); }}>
          <div className="modal-box resolve-modal-box">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>📅 Extend Contract</h2>
                <p>
                  {extendStep === 1 && 'Step 1 of 3 — choose a new duration'}
                  {extendStep === 2 && 'Step 2 of 3 — confirm you want to proceed'}
                  {extendStep === 3 && 'Step 3 of 3 — final check before saving'}
                </p>
              </div>
              <button className="modal-close" onClick={closeExtendModal}>✕</button>
            </div>
            <div className="modal-printer-preview">
              <span className="preview-icon">🖨️</span>
              <div>
                <div className="preview-model">{extendTarget.printer_model}</div>
                <div className="preview-label">
                  Current end date: {extendTarget.contract_end ? fmtDate(extendTarget.contract_end) : 'not set'}
                </div>
              </div>
            </div>

            <div className="modal-body">
              {/* ── Step 1: choose duration ── */}
              {extendStep === 1 && (
                <>
                  <div className="modal-section-label">Extend By</div>
                  <div className="technician-list">
                    {EXTEND_OPTIONS.map(opt => (
                      <button
                        key={opt.months}
                        className={`technician-chip${extendMonths === opt.months ? ' selected' : ''}`}
                        onClick={() => { setExtendMonths(opt.months); setExtendError(''); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {extendMonths && (
                    <div className="anydesk-confirm-note">
                      🗓️ New contract end date will be <strong>{fmtDate(extendedEndDate())}</strong>.
                    </div>
                  )}
                  {extendError && <div className="resolve-error">{extendError}</div>}
                </>
              )}

              {/* ── Step 2: type to confirm ── */}
              {extendStep === 2 && (
                <>
                  <div className="modal-section-label">Confirm Extension</div>
                  <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.5, margin: '0 0 10px' }}>
                    You're about to extend <strong>{extendTarget.printer_model}</strong>'s contract by{' '}
                    <strong>{EXTEND_OPTIONS.find(o => o.months === extendMonths)?.label}</strong>, moving the end date to{' '}
                    <strong>{fmtDate(extendedEndDate())}</strong>. Type <strong>{EXTEND_TYPE_PHRASE}</strong> below to continue.
                  </p>
                  <input
                    type="text"
                    className="modal-notes"
                    style={{ minHeight: 'unset', resize: 'none' }}
                    placeholder={`Type "${EXTEND_TYPE_PHRASE}" here`}
                    value={extendTypedConfirm}
                    onChange={e => { setExtendTypedConfirm(e.target.value); setExtendError(''); }}
                    autoFocus
                  />
                  {extendError && <div className="resolve-error">{extendError}</div>}
                </>
              )}

              {/* ── Step 3: final warning ── */}
              {extendStep === 3 && (
                <>
                  <div className="modal-section-label">Final Warning</div>
                  <div className="extend-warning-box">
                    ⚠️ This will immediately update the contract end date for <strong>{extendTarget.printer_model}</strong> to{' '}
                    <strong>{fmtDate(extendedEndDate())}</strong> and reset expiry notifications. This action cannot be undone
                    automatically — you'd need to extend or edit it again manually. Are you sure you want to proceed?
                  </div>
                  {extendError && <div className="resolve-error">{extendError}</div>}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeExtendModal}>Cancel</button>
              {extendStep === 1 && (
                <button className="btn-report" onClick={goToExtendStep2} style={{ background: 'var(--admin)' }}>
                  Continue →
                </button>
              )}
              {extendStep === 2 && (
                <button className="btn-report" onClick={goToExtendStep3} style={{ background: 'var(--admin)' }}>
                  Continue →
                </button>
              )}
              {extendStep === 3 && (
                <button
                  className="btn-report"
                  onClick={confirmExtend}
                  disabled={extendSubmitting}
                  style={{ background: 'var(--red)' }}
                >
                  {extendSubmitting ? 'Saving…' : '📅 Yes, Extend Contract'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Client Modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeDeleteModal(); }}>
          <div className="modal-box resolve-modal-box">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>🗑️ Delete Client</h2>
                <p>
                  {deleteStep === 1 && 'Step 1 of 2 — read this before continuing'}
                  {deleteStep === 2 && 'Step 2 of 2 — final confirmation'}
                </p>
              </div>
              <button className="modal-close" onClick={closeDeleteModal}>✕</button>
            </div>
            <div className="modal-printer-preview">
              <span className="preview-icon">🏢</span>
              <div>
                <div className="preview-model">{deleteTarget.company_name}</div>
                <div className="preview-label">{deleteTarget.email}</div>
              </div>
            </div>

            <div className="modal-body">
              {/* ── Step 1: warning ── */}
              {deleteStep === 1 && (
                <>
                  <div className="modal-section-label">This Cannot Be Undone</div>
                  <div className="extend-warning-box">
                    ⚠️ Deleting <strong>{deleteTarget.company_name}</strong> will permanently remove their account
                    and every rental record tied to it ({(deleteTarget.rentals ?? []).length} total). They will
                    immediately lose access and this cannot be recovered. Only proceed if you're certain.
                  </div>
                  {deleteError && <div className="resolve-error">{deleteError}</div>}
                </>
              )}

              {/* ── Step 2: type to confirm ── */}
              {deleteStep === 2 && (
                <>
                  <div className="modal-section-label">Confirm Deletion</div>
                  <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.5, margin: '0 0 10px' }}>
                    Type the company name <strong>{deleteTarget.company_name}</strong> below to confirm you want to
                    permanently delete this client and all of its rental history.
                  </p>
                  <input
                    type="text"
                    className="modal-notes"
                    style={{ minHeight: 'unset', resize: 'none' }}
                    placeholder={`Type "${deleteTarget.company_name}" here`}
                    value={deleteTypedConfirm}
                    onChange={e => { setDeleteTypedConfirm(e.target.value); setDeleteError(''); }}
                    autoFocus
                  />
                  {deleteError && <div className="resolve-error">{deleteError}</div>}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDeleteModal}>Cancel</button>
              {deleteStep === 1 && (
                <button className="btn-report" onClick={goToDeleteStep2} style={{ background: 'var(--red)' }}>
                  Continue →
                </button>
              )}
              {deleteStep === 2 && (
                <button
                  className="btn-report"
                  onClick={confirmDelete}
                  disabled={deleteSubmitting}
                  style={{ background: 'var(--red)' }}
                >
                  {deleteSubmitting ? 'Deleting…' : '🗑️ Yes, Delete Client'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {showChangePassword && (
        <ChangePasswordModal clientId={adminClientId} onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}