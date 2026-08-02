import { listConversations } from '../../chat/conversations';

export const runtime = 'nodejs';

// GET /api/admin/conversations?status=awaiting_human|human|ai|closed|all
// Defaults to everything that isn't closed, so the dashboard shows chats
// waiting for a human first, then ones already being handled, then AI-only.
// Any admin can see and respond to any conversation here — there's no
// per-admin ownership/locking, by design (shared inbox).
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');

    const status = statusParam
      ? statusParam === 'all' ? 'all' : statusParam.split(',')
      : ['awaiting_human', 'human', 'ai'];

    const conversations = await listConversations({ status });
    return Response.json({ ok: true, conversations }, { status: 200 });
  } catch (err) {
    console.error('admin/conversations GET error:', err);
    return Response.json({ error: 'Failed to fetch conversations.' }, { status: 500 });
  }
}
