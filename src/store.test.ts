import { test } from "node:test";
import assert from "node:assert/strict";
import { openStore } from "./store.ts";

const msg = (id: string, content = "hi") => ({
  id,
  groupId: "g1",
  senderId: "u1",
  type: "text" as const,
  content,
  timestamp: Number(id),
});

test("saves and reads back messages chronological within a limit", () => {
  const s = openStore(":memory:");
  s.saveMessage(msg("1"));
  s.saveMessage(msg("2"));
  s.saveMessage(msg("3"));
  assert.deepEqual(s.getMessages("g1", {}).map((m) => m.id), ["1", "2", "3"]);
});

test("pages with before + limit", () => {
  const s = openStore(":memory:");
  ["1", "2", "3", "4"].forEach((id) => s.saveMessage(msg(id)));
  assert.deepEqual(s.getMessages("g1", { before: "3", limit: 2 }).map((m) => m.id), ["1", "2"]);
});

test("upserts by id (idempotent replay)", () => {
  const s = openStore(":memory:");
  s.saveMessage(msg("1", "first"));
  s.saveMessage(msg("1", "second"));
  assert.equal(s.getMessages("g1", {}).length, 1);
  assert.equal(s.getMessages("g1", {})[0].content, "second");
});

test("applies addReaction / removeReaction / deleteMessage", () => {
  const s = openStore(":memory:");
  s.saveMessage(msg("1"));
  s.applyMutation({ kind: "addReaction", messageId: "1", userId: "u2", emoji: "👍" });
  assert.equal(s.getMessages("g1", {})[0].reactions?.length, 1);
  s.applyMutation({ kind: "removeReaction", messageId: "1", userId: "u2", emoji: "👍" });
  assert.deepEqual(s.getMessages("g1", {})[0].reactions, []);
  s.applyMutation({ kind: "deleteMessage", messageId: "1", userId: "u1" });
  assert.equal(s.getMessages("g1", {})[0].deleted, true);
});
