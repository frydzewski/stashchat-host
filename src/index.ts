import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";
import { openStore } from "./store.ts";
import { handleDaemonFrame, type InboundFrame } from "./protocol.ts";

const RELAY_WS_URL = process.env.RELAY_WS_URL; // wss://…/$default
const DAEMON_TOKEN = process.env.DAEMON_TOKEN; // your Talk session token (wsToken)
const DB_PATH = process.env.DB_PATH ?? `${homedir()}/.stashchat/store.db`;

if (!RELAY_WS_URL || !DAEMON_TOKEN) {
  console.error("Set RELAY_WS_URL and DAEMON_TOKEN (see README.md)");
  process.exit(1);
}

mkdirSync(dirname(DB_PATH), { recursive: true });
const store = openStore(DB_PATH);
console.log(`storing to ${DB_PATH}`);
let backoffMs = 1000;

function connect(): void {
  const ws = new WebSocket(`${RELAY_WS_URL}?token=${DAEMON_TOKEN}&role=daemon`);

  ws.addEventListener("open", () => {
    backoffMs = 1000;
    ws.send(JSON.stringify({ action: "registerDaemon" }));
    console.log("daemon connected + registered");
  });

  ws.addEventListener("message", (ev: MessageEvent) => {
    let frame: InboundFrame;
    try {
      frame = JSON.parse(typeof ev.data === "string" ? ev.data : String(ev.data));
    } catch {
      return;
    }
    const reply = handleDaemonFrame(frame, store);
    if (reply) ws.send(JSON.stringify(reply));
  });

  ws.addEventListener("close", () => {
    console.log(`daemon disconnected; reconnecting in ${backoffMs}ms`);
    setTimeout(connect, backoffMs);
    backoffMs = Math.min(backoffMs * 2, 30_000);
  });

  ws.addEventListener("error", () => ws.close());
}

connect();
