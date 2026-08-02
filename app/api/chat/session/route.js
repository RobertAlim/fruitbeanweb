import { getOrCreateConversation, getMessages } from '../conversations';

export const runtime = 'nodejs';

// POST /api/chat/session
// Body: { sessionId, clientId?, visitorName?, visitorEmail? }
// Called when the chat widget mounts/opens. Creates a conversation the
// first time a visitor chats, or resumes an existing one (so refreshing the
// page doesn't lose the conversation or an admin's replies).
export async function POST(req) {
  try {
    const { sessionId, clientId, visitorName, visitorEmail } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'sessionId is required.' }, { status: 400 });
    }

    const conversation = await getOrCreateConversation({
      sessionId,
      clientId: clientId || null,
      visitorName: visitorName || null,
      visitorEmail: visitorEmail || null,
    });

    const messages = await getMessages({ conversationId: conversation.conversation_id });

    return Response.json({ ok: true, conversation, messages }, { status: 200 });
  } catch (err) {
    console.error('chat/session error:', err);
    return Response.json({ error: 'Could not start chat session.' }, { status: 500 });
  }
}
