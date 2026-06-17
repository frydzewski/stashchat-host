import type { Message } from "./types.ts";
import type { DaemonStore } from "./store.ts";

export type Mutation =
  | { kind: "addReaction"; messageId: string; userId: string; emoji: string }
  | { kind: "removeReaction"; messageId: string; userId: string; emoji: string }
  | { kind: "deleteMessage"; messageId: string; userId: string };

/** Relay→daemon frames use `type`. */
export type InboundFrame =
  | { type: "storeWrite"; msgId: string; message: Message }
  | { type: "storeMutation"; groupId: string; mutation: Mutation }
  | { type: "storeQuery"; requestId: string; replyTo: string; groupId: string; before?: string; limit?: number };

/** Daemon→relay frames use `action` (to match the relay's `body.action` switch). */
export type OutboundFrame =
  | { action: "storeAck"; groupId: string; msgId: string }
  | { action: "storeResult"; requestId: string; replyTo: string; groupId: string; messages: Message[] };

/** Apply one inbound frame to the store; return the reply frame (or null). */
export function handleDaemonFrame(frame: InboundFrame, store: DaemonStore): OutboundFrame | null {
  switch (frame.type) {
    case "storeWrite":
      store.saveMessage(frame.message);
      return { action: "storeAck", groupId: frame.message.groupId, msgId: frame.msgId };
    case "storeMutation":
      store.applyMutation(frame.mutation);
      return null;
    case "storeQuery":
      return {
        action: "storeResult",
        requestId: frame.requestId,
        replyTo: frame.replyTo,
        groupId: frame.groupId,
        messages: store.getMessages(frame.groupId, { before: frame.before, limit: frame.limit }),
      };
    default:
      return null;
  }
}
