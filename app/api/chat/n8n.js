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
// AI is stuck), have it include that field. The caller (see
// api/chat/messages/route.js) doesn't hand off immediately on this flag —
// it asks the visitor to confirm first, and only escalates to
// "awaiting_human" once they say yes.
//
// Request body sent to n8n: { messages, account }
// "account" is null for anonymous visitors. If the visitor is signed in as
// an existing client, it's { clientId, companyName, email, contactNumber,
// companyAddress } — this lets the AI Agent recognize them as an existing
// account instead of treating every chat as a brand-new company signing up,
// and lets a follow-up printer request get attached to their account
// instead of hitting the "looks like you already have an account" dead end.

const WEBHOOK_URL =
  process.env.N8N_CHAT_WEBHOOK_URL ||
  'https://fruitbean.app.n8n.cloud/webhook/fruitbean-chat';

// n8n workflows can occasionally hang (a stuck node, a slow LLM call, etc).
// Without a timeout, a single hung request would leave the visitor staring
// at a typing indicator forever with no fallback. 20s is generous for a
// chat reply but still well inside typical serverless function limits.
const REQUEST_TIMEOUT_MS = 20_000;

export async function callN8nChat({ messages, account = null }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, account }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The assistant is taking too long to respond.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

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
