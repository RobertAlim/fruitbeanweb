'use client';
import { useState, useRef, useEffect } from 'react';

export default function TroubleshootChat({ rental, onClose, onEscalate }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi! Let's troubleshoot your ${rental.printer_model}. What's going wrong?` }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [latestState, setLatestState] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMessage = { role: 'user', text };
    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, { role: 'assistant', text: '' }]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerModel: rental.printer_model,
          rentalId: rental.rental_id,
          messages: updatedMessages,
        }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      const data = await res.json();
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', text: data.reply };
        return next;
      });
      setLatestState(data.state);
    } catch (err) {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          text: `⚠️ Sorry, I couldn't connect right now. You can still report this problem directly.`,
        };
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div className="modal-header-title">
            <h2>🔧 Troubleshoot: {rental.printer_model}</h2>
            <p>Let's see if we can fix this together first</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div ref={scrollRef} className="tc-messages">
          {messages.map((m, i) => {
            const isLastAssistant = m.role === 'assistant' && i === messages.length - 1;
            const isTyping = sending && isLastAssistant && !m.text;
            return (
              <div key={i} className={`tc-row ${m.role}`}>
                <div className="tc-avatar">{m.role === 'user' ? '🙂' : '🔧'}</div>
                <div className="tc-bubble">
                  {isTyping ? (
                    <div className="tc-typing"><span /><span /><span /></div>
                  ) : m.text}
                </div>
              </div>
            );
          })}
        </div>

        {latestState?.readyToEscalate && (
          <div className="tc-banner escalate">
            ⚠️ It looks like this needs a technician. When you're ready, continue to file a report — we'll include everything discussed here.
          </div>
        )}

        {latestState?.fixed && (
          <div className="tc-banner fixed">
            ✅ Glad that's resolved! No report needed — feel free to close this.
          </div>
        )}

        <form onSubmit={handleSend} className="tc-form">
          <input
            className="tc-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your reply..."
            disabled={sending}
          />
          <button type="submit" className="btn-primary tc-send" disabled={!input.trim() || sending}>
            Send
          </button>
        </form>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button
            className="btn-report"
            onClick={() => onEscalate(latestState)}
            disabled={!latestState}
          >
            Continue to Report →
          </button>
        </div>
      </div>
    </div>
  );
}