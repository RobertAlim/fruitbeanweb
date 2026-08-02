import { getConversationById, addMessage, getMessages, setStatus } from '../../../../chat/conversations';

export const runtime = 'nodejs';

// GET /api/admin/conversations/:id/messages?afterId=0
// Used by the admin chat panel to poll for new visitor/AI messages.
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const conversationId = Number(id);
    const { searchParams } = new URL(req.url);
    const afterId = Number(searchParams.get('afterId') || 0);

    const messages = await getMessages({ conversationId, afterId });
    return Response.json({ ok: true, messages }, { status: 200 });
  } catch (err) {
    console.error('admin/conversations/:id/messages GET error:', err);
    return Response.json({ error: 'Failed to fetch messages.' }, { status: 500 });
  }
}

// POST /api/admin/conversations/:id/messages
// Body: { adminId, adminName, text }
// Any logged-in admin can post here for any conversation — sending a
// message automatically marks the conversation as actively 'human'-handled
// and records this admin as the most recent responder (informational only,
// not an exclusive lock — other admins can still jump in).
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const conversationId = Number(id);
    const { adminId, adminName, text } = await req.json();

    if (!text?.trim()) {
      return Response.json({ error: 'text is required.' }, { status: 400 });
    }

    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return Response.json({ error: 'Conversation not found.' }, { status: 404 });
    }
    if (conversation.status === 'closed') {
      return Response.json({ error: 'This conversation is closed. Reopen it first.' }, { status: 400 });
    }

    const message = await addMessage({
      conversationId,
      senderType: 'admin',
      senderId: adminId || null,
      senderName: adminName || 'Support',
      text: text.trim(),
    });

    const updated = await setStatus({
      conversationId,
      status: 'human',
      claimedBy: adminId || null,
      claimedByName: adminName || null,
    });

    return Response.json({ ok: true, message, conversation: updated }, { status: 200 });
  } catch (err) {
    console.error('admin/conversations/:id/messages POST error:', err);
    return Response.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
