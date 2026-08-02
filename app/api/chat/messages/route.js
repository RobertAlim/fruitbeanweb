import {
  getConversationBySession,
  getOrCreateConversation,
  addMessage,
  getMessages,
  setStatus,
} from '../conversations';
import { callN8nChat } from '../n8n';
import { notifyAdminsOfEscalation } from '../adminNotify';

export const runtime = 'nodejs';

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
// and escalates automatically if n8n says to. If the conversation has
// already been escalated ('awaiting_human' or 'human'), the message is
// just stored — an admin will see and answer it from the dashboard, and
// the widget picks up the reply via polling.
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

    // Still AI-handled — build the transcript and ask n8n for a reply.
    const history = await getMessages({ conversationId: conversation.conversation_id });
    const n8nMessages = history
      .filter(m => m.sender_type === 'visitor' || m.sender_type === 'ai')
      .map(m => ({ role: m.sender_type === 'ai' ? 'bot' : 'user', text: m.text }));

    let finalConversation = conversation;

    try {
      const { reply, escalate } = await callN8nChat({ messages: n8nMessages });

      if (reply) {
        await addMessage({
          conversationId: conversation.conversation_id,
          senderType: 'ai',
          text: reply,
        });
      }

      if (escalate) {
        finalConversation = await setStatus({
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
      }
    } catch (err) {
      console.error('n8n call failed:', err);
      await addMessage({
        conversationId: conversation.conversation_id,
        senderType: 'system',
        text: "⚠️ I'm having trouble connecting right now. You can tap \"Talk to a person\" below and a team member will help you directly.",
      });
    }

    const messages = await getMessages({ conversationId: conversation.conversation_id });
    return Response.json({ ok: true, conversation: finalConversation, messages }, { status: 200 });
  } catch (err) {
    console.error('chat/messages POST error:', err);
    return Response.json({ error: 'Something went wrong sending your message.' }, { status: 500 });
  }
}
