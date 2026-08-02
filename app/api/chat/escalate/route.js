import { getOrCreateConversation, addMessage, setStatus, getMessages } from '../conversations';
import { notifyAdminsOfEscalation } from '../adminNotify';

export const runtime = 'nodejs';

// POST /api/chat/escalate
// Body: { sessionId, clientId?, visitorName?, visitorEmail? }
// The "Talk to a person" button in the widget calls this. Works regardless
// of what the n8n workflow does — this is the guaranteed path to a human.
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

    let updated = conversation;
    if (conversation.status === 'ai') {
      updated = await setStatus({ conversationId: conversation.conversation_id, status: 'awaiting_human' });
      await addMessage({
        conversationId: conversation.conversation_id,
        senderType: 'system',
        text: "You're being connected with a team member. Someone will be with you shortly.",
      });
      notifyAdminsOfEscalation({ conversation: updated }).catch(err =>
        console.error('notifyAdminsOfEscalation failed:', err)
      );
    }

    const messages = await getMessages({ conversationId: updated.conversation_id });
    return Response.json({ ok: true, conversation: updated, messages }, { status: 200 });
  } catch (err) {
    console.error('chat/escalate error:', err);
    return Response.json({ error: 'Could not reach a team member right now.' }, { status: 500 });
  }
}
