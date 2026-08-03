import {
  getConversationBySession,
  getOrCreateConversation,
  addMessage,
  getMessages,
  setStatus,
} from '../conversations';
import { callN8nChat } from '../n8n';
import { notifyAdminsOfEscalation } from '../adminNotify';
import { getClientAccountForChat } from '../accounts';

export const runtime = 'nodejs';

// ── AI-initiated human handoff now requires visitor confirmation ─────────
// n8n's "escalate: true" used to flip the conversation to a human
// immediately — one stray "I want to chat!" and the visitor would suddenly
// be talking to an admin with no say in it. Now, when the AI (via n8n)
// decides a human is needed, we DON'T touch n8n's script/logic at all —
// we just don't act on "escalate" right away. Instead we ask the visitor
// to confirm, and only hand off once they actually say yes. This constant
// is the exact question we ask; the trailing zero-width marker is invisible
// in the chat bubble but lets us recognize, on the visitor's very next
// message, that we're waiting on a yes/no rather than a normal chat reply.
const HANDOFF_CONFIRM_MARKER = '\u200b\u200b';
const HANDOFF_CONFIRM_TEXT =
  "Just to check first — would you like me to connect you with one of our team members? (yes / no)";
const HANDOFF_CONFIRM_RETRY_TEXT =
  "Sorry, just to be clear — should I connect you with a team member? Please reply yes or no.";
const HANDOFF_DECLINED_TEXT =
  "No problem, I'll keep helping you here! What can I do for you?";

function isPendingHandoffConfirmation(message) {
  return Boolean(
    message &&
    message.sender_type === 'ai' &&
    typeof message.text === 'string' &&
    message.text.endsWith(HANDOFF_CONFIRM_MARKER)
  );
}

// Small, deliberately conservative yes/no reader (English/Tagalog/Taglish).
// Returns 'yes', 'no', or null if the reply isn't a clear answer — in which
// case we ask again rather than guessing which way to go.
function classifyHandoffReply(text) {
  const t = text.trim().toLowerCase();
  if (/^(yes|yeah|yep|yup|sure|please|ok(ay)?|go ahead|connect me|i do|oo+|opo|sige|game|tara)\b/.test(t)) {
    return 'yes';
  }
  if (/^(no|nope|nah|not now|never ?mind|huwag|hindi|ayaw|no thanks|i'?m good|no need)\b/.test(t)) {
    return 'no';
  }
  return null;
}

// GET /api/chat/messages?sessionId=...&afterId=0
// Used by the widget to poll for admin replies while a human is handling
// the conversation.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const afterId = Number(searchParams.get('afterId') || 0);

    if (!sessionId) {
      return Response.json({ error: 'sessionId is required.' }, { status: 400 });
    }

    const conversation = await getConversationBySession(sessionId);
    if (!conversation) {
      return Response.json({ error: 'Conversation not found.' }, { status: 404 });
    }

    const messages = await getMessages({
      conversationId: conversation.conversation_id,
      afterId,
    });

    return Response.json({ ok: true, conversation, messages }, { status: 200 });
  } catch (err) {
    console.error('chat/messages GET error:', err);
    return Response.json({ error: 'Could not fetch messages.' }, { status: 500 });
  }
}

// POST /api/chat/messages
// Body: { sessionId, text, clientId?, visitorName?, visitorEmail? }
//
// Always saves the visitor's message. If the conversation is still
// AI-handled, forwards the full transcript to n8n, saves the AI's reply,
// and asks the visitor to confirm before handing off if n8n says a human
// is needed. If the conversation has already been escalated
// ('awaiting_human' or 'human'), the message is just stored — an admin
// will see and answer it from the dashboard, and the widget picks up the
// reply via polling.
export async function POST(req) {
  try {
    const { sessionId, text, clientId, visitorName, visitorEmail } = await req.json();

    if (!sessionId || !text?.trim()) {
      return Response.json({ error: 'sessionId and text are required.' }, { status: 400 });
    }

    const conversation = await getOrCreateConversation({
      sessionId,
      clientId: clientId || null,
      visitorName: visitorName || null,
      visitorEmail: visitorEmail || null,
    });

    await addMessage({
      conversationId: conversation.conversation_id,
      senderType: 'visitor',
      senderName: visitorName || null,
      text: text.trim(),
    });

    // Human already handling (or waiting for one) — don't let the AI butt in.
    if (conversation.status !== 'ai') {
      const messages = await getMessages({ conversationId: conversation.conversation_id });
      return Response.json({ ok: true, conversation, messages }, { status: 200 });
    }

    const history = await getMessages({ conversationId: conversation.conversation_id });

    // If our previous reply was "do you want a human?", resolve that here
    // instead of forwarding this message to the AI at all.
    const previousMessage = history.length >= 2 ? history[history.length - 2] : null;
    if (isPendingHandoffConfirmation(previousMessage)) {
      const answer = classifyHandoffReply(text);

      if (answer === 'yes') {
        const finalConversation = await setStatus({
          conversationId: conversation.conversation_id,
          status: 'awaiting_human',
        });
        await addMessage({
          conversationId: conversation.conversation_id,
          senderType: 'system',
          text: "You're being connected with a team member. Someone will be with you shortly.",
        });
        notifyAdminsOfEscalation({ conversation: finalConversation }).catch(err =>
          console.error('notifyAdminsOfEscalation failed:', err)
        );
        const messages = await getMessages({ conversationId: conversation.conversation_id });
        return Response.json({ ok: true, conversation: finalConversation, messages }, { status: 200 });
      }

      if (answer === 'no') {
        await addMessage({
          conversationId: conversation.conversation_id,
          senderType: 'ai',
          text: HANDOFF_DECLINED_TEXT,
        });
        const messages = await getMessages({ conversationId: conversation.conversation_id });
        return Response.json({ ok: true, conversation, messages }, { status: 200 });
      }

      // Unclear reply — ask again rather than assuming either way.
      await addMessage({
        conversationId: conversation.conversation_id,
        senderType: 'ai',
        text: HANDOFF_CONFIRM_RETRY_TEXT + HANDOFF_CONFIRM_MARKER,
      });
      const messages = await getMessages({ conversationId: conversation.conversation_id });
      return Response.json({ ok: true, conversation, messages }, { status: 200 });
    }

    // Still AI-handled — build the transcript and ask n8n for a reply.
    const n8nMessages = history
      .filter(m => m.sender_type === 'visitor' || m.sender_type === 'ai')
      .map(m => ({ role: m.sender_type === 'ai' ? 'bot' : 'user', text: m.text }));

    // If this visitor is signed in, tell the AI which account it's
    // talking to — otherwise every chat looks like a brand-new company.
    const account = conversation.client_id
      ? await getClientAccountForChat(conversation.client_id)
      : null;

    let finalConversation = conversation;

    try {
      const { reply, escalate } = await callN8nChat({ messages: n8nMessages, account });

      if (escalate) {
        // The AI (via n8n) thinks this needs a human — but per the
        // n8n script's own wording it just announces the handoff instead
        // of asking. We don't touch the n8n workflow; we simply don't act
        // on that announcement yet. Swap it for an explicit yes/no
        // question and wait for the visitor's next message to decide.
        await addMessage({
          conversationId: conversation.conversation_id,
          senderType: 'ai',
          text: HANDOFF_CONFIRM_TEXT + HANDOFF_CONFIRM_MARKER,
        });
      } else if (reply) {
        await addMessage({
          conversationId: conversation.conversation_id,
          senderType: 'ai',
          text: reply,
        });
      }
    } catch (err) {
      console.error('n8n call failed:', err);
      // The AI path is broken (timeout, webhook down, etc.) — don't make the
      // visitor take an extra action to reach a person. Escalate for them.
      finalConversation = await setStatus({
        conversationId: conversation.conversation_id,
        status: 'awaiting_human',
      });
      await addMessage({
        conversationId: conversation.conversation_id,
        senderType: 'system',
        text: "⚠️ I'm having trouble connecting right now, so I'm bringing in a team member to help you directly.",
      });
      notifyAdminsOfEscalation({ conversation: finalConversation }).catch(e =>
        console.error('notifyAdminsOfEscalation failed:', e)
      );
    }

    const messages = await getMessages({ conversationId: conversation.conversation_id });
    return Response.json({ ok: true, conversation: finalConversation, messages }, { status: 200 });
  } catch (err) {
    console.error('chat/messages POST error:', err);
    return Response.json({ error: 'Something went wrong sending your message.' }, { status: 500 });
  }
}
