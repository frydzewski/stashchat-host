import { test } from "node:test";
import assert from "node:assert/strict";
import { openStore } from "./store.ts";
import { handleDaemonFrame } from "./protocol.ts";

const baseMsg = { id: "1", groupId: "g1", senderId: "u1", type: "text" as const, content: "hi", timestamp: 1 };

test("storeWrite persists + returns storeAck", () => {
  const s = openStore(":memory:");
  const reply = handleDaemonFrame({ type: "storeWrite", msgId: "1", message: baseMsg }, s);
  assert.deepEqual(reply, { action: "storeAck", groupId: "g1", msgId: "1" });
  assert.equal(s.getMessages("g1", {}).length, 1);
});

test("storeQuery returns storeResult echoing replyTo", () => {
  const s = openStore(":memory:");
  s.saveMessage(baseMsg);
  const reply = handleDaemonFrame(
    { type: "storeQuery", requestId: "r1", replyTo: "conn-9", groupId: "g1", limit: 50 },
    s
  );
  assert.equal(reply?.action, "storeResult");
  if (reply && reply.action === "storeResult") {
    assert.equal(reply.replyTo, "conn-9");
    assert.equal(reply.groupId, "g1");
    assert.equal(reply.messages.length, 1);
  }
});

test("storeMutation applies + returns null", () => {
  const s = openStore(":memory:");
  s.saveMessage(baseMsg);
  const reply = handleDaemonFrame(
    { type: "storeMutation", groupId: "g1", mutation: { kind: "deleteMessage", messageId: "1", userId: "u1" } },
    s
  );
  assert.equal(reply, null);
  assert.equal(s.getMessages("g1", {})[0].deleted, true);
});
