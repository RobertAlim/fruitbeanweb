'use client';
import { useState, useRef, useEffect } from 'react';
import './chatwidget.css';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm Fruitbean's assistant. Looking to rent a printer, or have a question about our ink refill service?" }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMessage = { role: 'user', text };
    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, { role: 'bot', text: '' }]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'bot', text: fullText };
          return next;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'bot',
          text: `⚠️ ${err.message || "Sorry, I couldn't connect right now."}`,
        };
        return next;
      });
    } finally {
      setSending(false);
    }
  }
      const textareaRef = useRef(null);

      useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 100) + 'px';
      }, [input]);
  return (
    <div className="chatwidget-root">
      {open && (
        <div className="chatwidget-panel" role="dialog" aria-label="Fruitbean chat assistant">
          <div className="chatwidget-header">
            <div className="chatwidget-header-info">
              <span className="chatwidget-droplet chatwidget-droplet--sm" aria-hidden="true"></span>
              <div>
                <div className="chatwidget-title">Fruitbean Assistant</div>
                <div className="chatwidget-subtitle">Usually replies in a minute</div>
              </div>
            </div>
            <button className="chatwidget-close" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>

          <div className="chatwidget-messages" ref={scrollRef}>
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const isEmptyBotTyping = m.role === 'bot' && m.text === '' && isLast && sending;
              return (
                <div key={i} className={`chatwidget-row chatwidget-row--${m.role}`}>
                  {m.role === 'bot' && (
                    <span className="chatwidget-droplet chatwidget-droplet--xs" aria-hidden="true"></span>
                  )}
                  <div className={`chatwidget-bubble chatwidget-bubble--${m.role}`}>
                    {isEmptyBotTyping ? (
                      <span className="chatwidget-typing"><span></span><span></span><span></span></span>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form className="chatwidget-inputbar" onSubmit={handleSend}>
            
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
                // Shift+Enter falls through to default behavior — inserts a newline
              }}
              placeholder="Ask about renting a printer…"
              aria-label="Type a message"
              rows={1}
            />
            <button type="submit" disabled={!input.trim() || sending} aria-label="Send message">➤</button>
          </form>
        </div>
      )}

      <button className="chatwidget-toggle" onClick={() => setOpen(o => !o)} aria-label={open ? 'Close chat' : 'Open chat'}>
        <span className="chatwidget-droplet chatwidget-droplet--lg" aria-hidden="true"></span>
        {!open && <span className="chatwidget-toggle-badge">1</span>}
      </button>
    </div>
  );
}