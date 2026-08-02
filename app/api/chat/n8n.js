// app/api/chat/n8n.js
//
// Server-side call to the n8n AI workflow. Moved out of the browser (it used
// to be called directly from ChatWidget.jsx) so that:
//   1. Every message — visitor and AI — passes through our DB and gets saved.
//   2. We can inspect the AI's response and decide whether to hand the
//      conversation off to a human admin.
//   3. The webhook URL isn't hardcoded/public in client-side JS.
//
// Set N8N_CHAT_WEBHOOK_URL in your environment. Falls back to the URL that
// was previously hardcoded in ChatWidget.jsx so nothing breaks if you
// haven't set the env var yet.
//
// Expected n8n response shape: { reply: string, escalate?: boolean }
// "escalate: true" is optional — if your n8n workflow can detect that a
// human is needed (e.g. the visitor explicitly asks for a person, or the
// AI is stuck), have it include that field and this file will automatically
// flip the conversation into "awaiting_human" mode. If your workflow doesn't
// send it, visitors can still always reach a human via the "Talk to a
// person" button in the widget, which calls /api/chat/escalate directly.

const WEBHOOK_URL =
  process.env.N8N_CHAT_WEBHOOK_URL ||
  'https://fruitbean.app.n8n.cloud/webhook/fruitbean-chat';

export async function callN8nChat({ messages }) {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `n8n webhook failed (${res.status})`);
  }

  const data = await res.json();
  return {
    reply: data.reply,
    escalate: data.escalate === true,
  };
}
