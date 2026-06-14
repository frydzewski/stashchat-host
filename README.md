# @stashchat/host

The **local-disk storage daemon** for [Talk](https://stashedchat.com) (a group chat
app where you own your data). Run this on a computer you control and your group's
message history lives on **your disk** — no cloud account, no third party holding
your data. The relay routes messages to this daemon over a WebSocket; it persists
them to a local SQLite file.

## Requirements

- **Node 24+** only. No `npm install`, no native build — the daemon uses Node's
  built-in `node:sqlite`, `WebSocket`, and TypeScript type-stripping.

## Run

In Talk, open your group → **Settings → "Run Talk Storage on your device"**. It
shows a ready-to-paste command with your relay URL and token filled in. It looks
like:

```sh
git clone https://github.com/frydzewski/stashchat-host && cd stashchat-host

# single-quote the URL — it contains a literal `$default` stage path
RELAY_WS_URL='wss://<ws-id>.execute-api.us-east-1.amazonaws.com/$default' \
DAEMON_TOKEN='<your Talk session token>' \
node src/index.ts
```

On success it prints `daemon connected + registered`. Leave it running.

### Environment

| Var | Meaning |
|-----|---------|
| `RELAY_WS_URL` | the Talk relay WebSocket URL (shown in the app) |
| `DAEMON_TOKEN` | your Talk session token (shown in the app) |
| `DB_PATH` | where the SQLite store lives (default `~/.stashchat/store.db`) — **back this up** to preserve your history |

## Behavior

- Persists every message/reaction/delete the relay routes to it, and serves
  history on request.
- **Auto-reconnects.** While it's down, your group is read-only-from-cache and new
  messages buffer on the relay, **draining** to your disk when the daemon returns.
- This daemon is your group's storage; your browser is just a normal chat client.

## Test

```sh
npm test   # node --test (zero deps)
```

## Protocol

Relay→daemon frames (`type`-keyed): `storeWrite`, `storeMutation`, `storeQuery`.
Daemon→relay frames (`action`-keyed): `storeAck`, `storeResult`, plus
`registerDaemon` on connect. See `src/protocol.ts`. Kept in sync with the Talk
relay.

## License

MIT
