import { DatabaseSync } from "node:sqlite";
import type { Message } from "./types.ts";

export interface DaemonStore {
  saveMessage(message: Message): void;
  getMessages(groupId: string, opts: { before?: string; limit?: number }): Message[];
  applyMutation(
    m:
      | { kind: "addReaction"; messageId: string; userId: string; emoji: string }
      | { kind: "removeReaction"; messageId: string; userId: string; emoji: string }
      | { kind: "deleteMessage"; messageId: string; userId: string }
  ): void;
}

/** Open (or create) a local SQLite message store at `path` (":memory:" for tests). */
export function openStore(path: string): DaemonStore {
  const db = new DatabaseSync(path);
  db.exec(
    `CREATE TABLE IF NOT EXISTS messages (
       group_id TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL,
       PRIMARY KEY (group_id, id)
     )`
  );

  const upsert = db.prepare(
    `INSERT INTO messages (group_id, id, json) VALUES (@group_id, @id, @json)
     ON CONFLICT(group_id, id) DO UPDATE SET json = excluded.json`
  );
  const selectOne = db.prepare(`SELECT json FROM messages WHERE id = @id`);
  const updateOne = db.prepare(`UPDATE messages SET json = @json WHERE id = @id`);

  function readOne(messageId: string): Message | null {
    const row = selectOne.get({ id: messageId }) as { json: string } | undefined;
    return row ? (JSON.parse(row.json) as Message) : null;
  }

  return {
    saveMessage(message) {
      upsert.run({ group_id: message.groupId, id: message.id, json: JSON.stringify(message) });
    },

    getMessages(groupId, opts) {
      const limit = opts.limit ?? 50;
      const rows = opts.before
        ? db
            .prepare(`SELECT json FROM messages WHERE group_id = ? AND id < ? ORDER BY id DESC LIMIT ?`)
            .all(groupId, opts.before, limit)
        : db
            .prepare(`SELECT json FROM messages WHERE group_id = ? ORDER BY id DESC LIMIT ?`)
            .all(groupId, limit);
      return (rows as { json: string }[]).map((r) => JSON.parse(r.json) as Message).reverse();
    },

    applyMutation(m) {
      const existing = readOne(m.messageId);
      if (!existing) return;
      if (m.kind === "addReaction") {
        const reactions = existing.reactions ?? [];
        if (!reactions.some((r) => r.emoji === m.emoji && r.userId === m.userId)) {
          reactions.push({ emoji: m.emoji, userId: m.userId, timestamp: Date.now() });
        }
        existing.reactions = reactions;
      } else if (m.kind === "removeReaction") {
        existing.reactions = (existing.reactions ?? []).filter(
          (r) => !(r.emoji === m.emoji && r.userId === m.userId)
        );
      } else {
        existing.deleted = true;
        existing.content = "";
        delete existing.reactions;
        delete existing.replyTo;
      }
      updateOne.run({ id: m.messageId, json: JSON.stringify(existing) });
    },
  };
}
