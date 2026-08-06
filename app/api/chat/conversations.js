// app/api/chat/conversations.js
//
// Shared data-access layer for the live chat / human-handoff system.
// Used by:
//   - app/api/chat/session/route.js     (widget opens / resumes a chat)
//   - app/api/chat/messages/route.js    (visitor sends a message, AI replies,
//                                        and — after visitor confirmation —
//                                        hands off to a human)
//   - app/api/admin/conversations/*     (admin dashboard reads/writes)
//
// Requires the two tables created by chat_schema.sql:
//   chat_conversations, chat_messages

import { getPool } from '@/lib/db';

// ── Conversation status values ────────────────────────────────────────────
// 'ai'             -> the AI (via n8n) is handling replies
// 'awaiting_human' -> escalated, waiting for an admin to jump in
// 'human'          -> an admin has replied at least once, actively handled
// 'closed'         -> conversation ended / resolved

export async function getConversationBySession(sessionId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM chat_conversations WHERE session_id = $1 LIMIT 1`,
    [sessionId]
  );
  return rows[0] || null;
}

export async function getConversationById(conversationId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM chat_conversations WHERE conversation_id = $1 LIMIT 1`,
    [conversationId]
  );
  return rows[0] || null;
}

// Creates a conversation for a brand-new session, or returns the existing
// one. If a logged-in client is chatting, pass clientId/visitorName/
// visitorEmail so admins can see who they're talking to.
export async function getOrCreateConversation({
  sessionId,
  clientId = null,
  visitorName = null,
  visitorEmail = null,
}) {
  if (!sessionId) throw new Error('sessionId is required');

  const pool = getPool();

  const existing = await getConversationBySession(sessionId);
  if (existing) {
    // Backfill identity if the visitor has since logged in.
    if (clientId && !existing.client_id) {
      const { rows } = await pool.query(
        `UPDATE chat_conversations
         SET client_id = $1,
             visitor_name = COALESCE($2, visitor_name),
             visitor_email = COALESCE($3, visitor_email)
         WHERE conversation_id = $4
         RETURNING *`,
        [clientId, visitorName, visitorEmail, existing.conversation_id]
      );
      return rows[0];
    }
    return existing;
  }

  const { rows } = await pool.query(
    `INSERT INTO chat_conversations
      (session_id, client_id, visitor_name, visitor_email, status, last_message_at, created_at)
     VALUES ($1, $2, $3, $4, 'ai', NOW(), NOW())
     RETURNING *`,
    [sessionId, clientId, visitorName, visitorEmail]
  );
  return rows[0];
}

export async function addMessage({
  conversationId,
  senderType, // 'visitor' | 'ai' | 'admin' | 'system'
  senderId = null,
  senderName = null,
  text,
}) {
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (conversation_id, sender_type, sender_id, sender_name, text, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [conversationId, senderType, senderId, senderName, text]
  );

  await pool.query(
    `UPDATE chat_conversations SET last_message_at = NOW() WHERE conversation_id = $1`,
    [conversationId]
  );

  return rows[0];
}

export async function getMessages({ conversationId, afterId = 0 }) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM chat_messages
     WHERE conversation_id = $1 AND message_id > $2
     ORDER BY message_id ASC`,
    [conversationId, afterId]
  );
  return rows;
}

export async function setStatus({
  conversationId,
  status,
  claimedBy,        // pass undefined to leave unchanged
  claimedByName,     // pass undefined to leave unchanged
}) {
  const pool = getPool();
  const fields = ['status = $2'];
  const params = [conversationId, status];

  if (claimedBy !== undefined) {
    params.push(claimedBy);
    fields.push(`claimed_by = $${params.length}`);
  }
  if (claimedByName !== undefined) {
    params.push(claimedByName);
    fields.push(`claimed_by_name = $${params.length}`);
  }

  const { rows } = await pool.query(
    `UPDATE chat_conversations SET ${fields.join(', ')} WHERE conversation_id = $1 RETURNING *`,
    params
  );
  return rows[0];
}

// Admin dashboard: list conversations, most recently active first.
// status: 'awaiting_human' | 'human' | 'ai' | 'closed' | 'all' | array of statuses
export async function listConversations({ status = 'all' } = {}) {
  const pool = getPool();

  let where = '';
  const params = [];
  if (status !== 'all') {
    const statuses = Array.isArray(status) ? status : [status];
    params.push(statuses);
    where = `WHERE cc.status = ANY($1)`;
  }

  const { rows } = await pool.query(
    `SELECT
       cc.*,
       cl.company_name AS client_company_name,
       cl.email AS client_email,
       (SELECT text FROM chat_messages m
         WHERE m.conversation_id = cc.conversation_id
         ORDER BY m.message_id DESC LIMIT 1) AS last_message_text,
       (SELECT sender_type FROM chat_messages m
         WHERE m.conversation_id = cc.conversation_id
         ORDER BY m.message_id DESC LIMIT 1) AS last_message_sender_type
     FROM chat_conversations cc
     LEFT JOIN clients cl ON cl.client_id = cc.client_id
     ${where}
     ORDER BY
       CASE cc.status WHEN 'awaiting_human' THEN 0 WHEN 'human' THEN 1 WHEN 'ai' THEN 2 ELSE 3 END,
       cc.last_message_at DESC`,
    params
  );
  return rows;
}
