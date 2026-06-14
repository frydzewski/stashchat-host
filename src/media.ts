import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";

/** Relay→daemon media frames (keyed by `type`, like the other inbound frames). */
export type MediaFrame =
  | { type: "mediaStore"; groupId: string; mediaId: string; stagingGetUrl: string }
  | { type: "mediaFetch"; groupId: string; mediaId: string; stagingPutUrl: string };

export function mediaPath(baseDir: string, groupId: string, mediaId: string): string {
  return join(baseDir, groupId, mediaId);
}

export function isMediaFrame(frame: unknown): frame is MediaFrame {
  const t = (frame as { type?: string } | null)?.type;
  return t === "mediaStore" || t === "mediaFetch";
}

/** Download a staged object to local disk — the durable copy. */
export async function storeMediaFromUrl(
  baseDir: string,
  groupId: string,
  mediaId: string,
  url: string
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`mediaStore download failed: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const path = mediaPath(baseDir, groupId, mediaId);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

/** Re-upload a locally-held object to staging on a cold miss. False if not on disk. */
export async function uploadMediaToUrl(
  baseDir: string,
  groupId: string,
  mediaId: string,
  putUrl: string
): Promise<boolean> {
  const path = mediaPath(baseDir, groupId, mediaId);
  try {
    await access(path);
  } catch {
    return false;
  }
  const bytes = await readFile(path);
  const res = await fetch(putUrl, { method: "PUT", body: bytes });
  if (!res.ok) throw new Error(`mediaFetch upload failed: ${res.status}`);
  return true;
}

export async function handleMediaFrame(frame: MediaFrame, baseDir: string): Promise<void> {
  if (frame.type === "mediaStore") {
    await storeMediaFromUrl(baseDir, frame.groupId, frame.mediaId, frame.stagingGetUrl);
  } else {
    await uploadMediaToUrl(baseDir, frame.groupId, frame.mediaId, frame.stagingPutUrl);
  }
}
