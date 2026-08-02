'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';
import './chats.css';

const LIST_POLL_MS = 5000;
const MSG_POLL_MS = 3000;

const STATUS_LABEL = {
  awaiting_human: 'Waiting for you',
  human: 'Being handled',
  ai: 'AI handling',
  closed: 'Closed',
};

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AdminChatsPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState({ id: null, name: '', initials: '' });
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active'); // active | awaiting_human | human | ai | closed

  const [activeId, setActiveId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const lastMsgIdRef = useRef(0);
  const listPollRef = useRef(null);
  const msgPollRef = useRef(null);
  const scrollRef = useRef(null);

  /* ── Auth guard (same pattern as /admin) ── */
  useEffect(() => {
    if (!sessionStorage.getItem('client_id') && localStorage.getItem('client_id')) {
      ['client_id', 'account_name', 'account_email', 'account_type'].forEach(key => {
        const val = localStorage.getItem(key);
        if (val) sessionStorage.setItem(key, val);
      });
    }
    const client_id = sessionStorage.getItem('client_id');
    const account_type = sessionStorage.getItem('account_type');
    const account_name = sessionStorage.getItem('account_name');
    if (!client_id || account_type !== 'admin') { router.push('/login'); return; }

    const initials = account_name
      ? account_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : 'AD';
    setAdmin({ id: Number(client_id), name: account_name, initials });
  }, [router]);

  /* ── Conversation list ── */
  const fetchConversations = useCallback(async () => {
    try {
      const qs = statusFilter === 'active' ? 'awaiting_human,human,ai' : statusFilter;
      const res = await fetch(`/api/admin/conversations?status=${qs}`);
      const data = await res.json();
      if (res.ok) setConversations(data.conversations);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!admin.id) return;
    fetchConversations();
    listPollRef.current = setInterval(fetchConversations, LIST_POLL_MS);
    return () => clearInterval(listPollRef.current);
  }, [admin.id, fetchConversations]);

  /* ── Selected conversation ── */
  async function openConversation(id) {
    setActiveId(id);
    setActiveMessages([]);
    lastMsgIdRef.current = 0;
    try {
      const res = await fetch(`/api/admin/conversations/${id}`);
      const data = await res.json();
      if (res.ok) {
        setActiveConversation(data.conversation);
        setActiveMessages(data.messages);
        if (data.messages.length) {
          lastMsgIdRef.current = data.messages[data.messages.length - 1].message_id;
        }
      }
    } catch (err) {
      console.error('Failed to open conversation:', err);
    }
  }

  const pollActiveMessages = useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await fetch(`/api/admin/conversations/${activeId}/messages?afterId=${lastMsgIdRef.current}`);
      const data = await res.json();
      if (res.ok && data.messages?.length) {
        setActiveMessages(prev => [...prev, ...data.messages]);
        lastMsgIdRef.current = data.messages[data.messages.length - 1].message_id;
      }
    } catch (err) {
      // Silent — polling failures shouldn't interrupt the UI.
    }
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    msgPollRef.current = setInterval(pollActiveMessages, MSG_POLL_MS);
    return () => clearInterval(msgPollRef.current);
  }, [activeId, pollActiveMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeMessages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !activeId) return;

    setSending(true);
    setInput('');
    try {
      const res = await fetch(`/api/admin/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: admin.id, adminName: admin.name, text }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveMessages(prev => [...prev, data.message]);
        lastMsgIdRef.current = data.message.message_id;
        setActiveConversation(data.conversation);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }

  async function handleAction(action) {
    if (!activeId) return;
    try {
      const res = await fetch(`/api/admin/conversations/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminId: admin.id, adminName: admin.name }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveConversation(data.conversation);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to update conversation:', err);
    }
  }

  const activeLabel =
    activeConversation?.client_company_name ||
    activeConversation?.visitor_name ||
    activeConversation?.visitor_email ||
    'Anonymous visitor';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#9aa0a6' }}>
      Loading live chats…
    </div>
  );

  return (
    <div className="admin-page">
      <header className="admin-header">
        <a href="/" className="header-logo">
          <div className="header-logo-icon"><img src="/Fruitbean Logo.png" alt="Fruitbean" /></div>
          <div className="header-logo-text">
            <span className="brand">Fruit<span>bean</span></span>
            <span className="sub">Ink Refilling Station</span>
          </div>
        </a>
        <div className="header-right">
          <a href="/admin" className="btn-secondary">← Client Overview</a>
          <div className="header-user">
            <div className="user-avatar">{admin.initials}</div>
            <div className="user-info">
              <span className="user-name">{admin.name}</span>
              <span className="user-label">Administrator</span>
            </div>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="topbar">
          <div className="topbar-left">
            <h1>💬 Live Chat</h1>
            <p>Any admin can jump into any conversation awaiting a human</p>
          </div>
          <div className="topbar-right">
            {['active', 'awaiting_human', 'human', 'ai', 'closed'].map(f => (
              <button
                key={f}
                className="btn-secondary"
                style={statusFilter === f ? { borderColor: 'var(--admin)', color: 'var(--admin)' } : undefined}
                onClick={() => setStatusFilter(f)}
              >
                {f === 'active' ? 'All Active' : STATUS_LABEL[f] || f}
              </button>
            ))}
          </div>
        </div>

        <div className="chats-layout">
          <div className="chats-list">
            {conversations.length === 0 && (
              <div className="no-results">
                <div className="no-results-icon">💬</div>
                <h3>No conversations</h3>
                <p>Nothing here right now</p>
              </div>
            )}
            {conversations.map(c => {
              const label = c.client_company_name || c.visitor_name || c.visitor_email || 'Anonymous visitor';
              return (
                <div
                  key={c.conversation_id}
                  className={`chats-list-item${activeId === c.conversation_id ? ' active' : ''}`}
                  onClick={() => openConversation(c.conversation_id)}
                >
                  <div className="chats-list-top">
                    <span className="chats-list-name">{label}</span>
                    <span className={`chat-status-pill ${c.status}`}>{STATUS_LABEL[c.status] || c.status}</span>
                  </div>
                  <div className="chats-list-preview">
                    {c.last_message_sender_type === 'admin' ? 'You: ' : ''}
                    {c.last_message_text || 'No messages yet'}
                  </div>
                  <div className="chats-list-preview" style={{ color: 'var(--gray-400)', fontSize: '11px' }}>
                    {formatTime(c.last_message_at)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chat-panel">
            {!activeConversation ? (
              <div className="chat-panel-empty">
                <div style={{ fontSize: '32px' }}>💬</div>
                <div>Select a conversation to start chatting</div>
              </div>
            ) : (
              <>
                <div className="chat-panel-header">
                  <div>
                    <div className="chat-panel-title">{activeLabel}</div>
                    <div className="chat-panel-sub">
                      {activeConversation.visitor_email || 'No email on file'} · {STATUS_LABEL[activeConversation.status]}
                    </div>
                  </div>
                  <div className="chat-panel-actions">
                    {activeConversation.status !== 'closed' && (
                      <button className="btn-secondary" onClick={() => handleAction('reopen_ai')}>
                        🤖 Hand back to AI
                      </button>
                    )}
                    {activeConversation.status !== 'closed' && (
                      <button className="btn-secondary" onClick={() => handleAction('close')}>
                        ✓ Close
                      </button>
                    )}
                    {activeConversation.status === 'closed' && (
                      <button className="btn-primary" onClick={() => handleAction('reopen_human')}>
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <div className="chat-panel-messages" ref={scrollRef}>
                  {activeMessages.map(m => (
                    <div key={m.message_id} className={`chat-msg-row ${m.sender_type}`}>
                      <div className="chat-msg-bubble">
                        {(m.sender_type === 'admin' || m.sender_type === 'ai') && (
                          <div className="chat-msg-label">
                            {m.sender_type === 'admin' ? (m.sender_name || 'Admin') : 'AI Assistant'}
                          </div>
                        )}
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form className="chat-panel-inputbar" onSubmit={handleSend}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder={
                      activeConversation.status === 'closed'
                        ? 'Reopen this conversation to reply…'
                        : 'Type a reply…'
                    }
                    rows={1}
                    disabled={activeConversation.status === 'closed' || sending}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!input.trim() || sending || activeConversation.status === 'closed'}
                  >
                    Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
