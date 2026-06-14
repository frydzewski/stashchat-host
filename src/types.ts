/** The message shape persisted by the daemon. Vendored from the Talk relay's
 *  storage types — keep in sync with the relay's `Message`. */
export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  senderName?: string;
  type: "text" | "image" | "video" | "link";
  content: string;
  mediaKey?: string;
  timestamp: number;
  reactions?: Array<{ emoji: string; userId: string; timestamp: number }>;
  replyTo?: { messageId: string; senderId: string; senderName?: string; content: string };
  deleted?: boolean;
  metadata?: {
    linkPreview?: { title: string; description: string; image?: string };
    dimensions?: { width: number; height: number };
    duration?: number;
  };
}
