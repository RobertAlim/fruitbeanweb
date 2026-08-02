import { getConversationById, getMessages, setStatus, addMessage } from '../../../chat/conversations';

export const runtime = 'nodejs';

// GET /api/admin/conversations/:id
export async function GET(_req, { params }) {
  try {
    const conversationId = Number(params.id);
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return Response.json({ error: 'Conversation not found.' }, { status: 404 });
    }
    const messages = await getMessages({ conversationId });
    return Response.json({ ok: true, conversation, messages }, { status: 200 });
  } catch (err) {
    console.error('admin/conversations/:id GET error:', err);
    return Response.json({ error: 'Failed to fetch conversation.' }, { status: 500 });
  }
}

// PATCH /api/admin/conversations/:id
// Body: { action: 'close' | 'reopen_ai' | 'reopen_human', adminId, adminName }
export async function PATCH(req, { params }) {
  try {
    const conversationId = Number(params.id);
    const { action, adminId, adminName } = await req.json();

    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return Response.json({ error: 'Conversation not found.' }, { status: 404 });
    }

    let updated;
    if (action === 'close') {
      updated = await setStatus({ conversationId, status: 'closed' });
      await addMessage({
        conversationId,
        senderType: 'system',
        text: adminName ? `Conversation closed by ${adminName}.` : 'Conversation closed.',
      });
    } else if (action === 'reopen_ai') {
      updated = await setStatus({ conversationId, status: 'ai', claimedBy: null, claimedByName: null });
      await addMessage({
        conversationId,
        senderType: 'system',
        text: 'Handed back to the AI assistant.',
      });
    } else if (action === 'reopen_human') {
      updated = await setStatus({
        conversationId,
        status: 'awaiting_human',
        claimedBy: adminId || null,
        claimedByName: adminName || null,
      });
    } else {
      return Response.json({ error: 'Unknown action.' }, { status: 400 });
    }

    return Response.json({ ok: true, conversation: updated }, { status: 200 });
  } catch (err) {
    console.error('admin/conversations/:id PATCH error:', err);
    return Response.json({ error: 'Failed to update conversation.' }, { status: 500 });
  }
}
