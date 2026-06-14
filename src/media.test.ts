import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  mediaPath,
  isMediaFrame,
  storeMediaFromUrl,
  uploadMediaToUrl,
} from "./media.ts";

test("mediaPath nests base/group/media", () => {
  assert.equal(mediaPath("/base", "g1", "m1.png"), "/base/g1/m1.png");
});

test("isMediaFrame recognizes only media frames", () => {
  assert.equal(isMediaFrame({ type: "mediaStore" }), true);
  assert.equal(isMediaFrame({ type: "mediaFetch" }), true);
  assert.equal(isMediaFrame({ type: "storeWrite" }), false);
  assert.equal(isMediaFrame(null), false);
});

test("storeMediaFromUrl writes to disk; uploadMediaToUrl round-trips", async () => {
  const base = mkdtempSync(join(tmpdir(), "stash-media-"));
  const original = globalThis.fetch;
  const payload = Buffer.from("PNGDATA");
  let putBody: Buffer | null = null;
  globalThis.fetch = (async (_url: string, init?: { method?: string; body?: Buffer }) => {
    if (init?.method === "PUT") {
      putBody = init.body as Buffer;
      return { ok: true } as Response;
    }
    return {
      ok: true,
      arrayBuffer: async () =>
        payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
    } as Response;
  }) as typeof fetch;
  try {
    await storeMediaFromUrl(base, "g1", "m1.png", "https://staging/get");
    assert.deepEqual(readFileSync(mediaPath(base, "g1", "m1.png")), payload);

    const ok = await uploadMediaToUrl(base, "g1", "m1.png", "https://staging/put");
    assert.equal(ok, true);
    assert.deepEqual(putBody, payload);

    const missing = await uploadMediaToUrl(base, "g1", "nope.png", "https://staging/put");
    assert.equal(missing, false);
  } finally {
    globalThis.fetch = original;
    rmSync(base, { recursive: true, force: true });
  }
});
