import { createService } from "../_shared/service.ts";
import { badRequest, errorResponse, json } from "../_shared/http/responses.ts";
import { serviceClient } from "../_shared/clients.ts";

/**
 * secure-upload — the only write path into the private `user-backups` bucket.
 *
 * Every payload is validated server-side before it touches storage:
 *  - hard size limit (5 MB)
 *  - magic-byte inspection (rejects executables/archives disguised as JSON)
 *  - structural validation of the backup envelope
 *  - path is derived from the JWT, never from client input
 *
 * Downloads are issued as short-lived signed URLs that force
 * `Content-Disposition: attachment`, so a poisoned file can never be
 * rendered inline in the app's origin.
 */

const BUCKET = "user-backups";
const MAX_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL = 60; // seconds

/** Binary signatures that must never be accepted as a JSON backup. */
const FORBIDDEN: { name: string; bytes: number[] }[] = [
  { name: "executable", bytes: [0x4d, 0x5a] },
  { name: "ELF binary", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "Mach-O binary", bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { name: "archive", bytes: [0x50, 0x4b, 0x03, 0x04] },
  { name: "archive", bytes: [0x52, 0x61, 0x72, 0x21] },
  { name: "archive", bytes: [0x1f, 0x8b] },
  { name: "PDF", bytes: [0x25, 0x50, 0x44, 0x46] },
];

function magicByteError(bytes: Uint8Array): string | null {
  for (const sig of FORBIDDEN) {
    if (sig.bytes.every((b, i) => bytes[i] === b)) return `Rejected: file looks like a ${sig.name}.`;
  }
  const first = Array.from(bytes.slice(0, 16)).find(
    (b) => ![0x20, 0x09, 0x0a, 0x0d, 0xef, 0xbb, 0xbf].includes(b),
  );
  if (first !== 0x7b) return "Rejected: payload is not a JSON object.";
  return null;
}

Deno.serve(
  createService(
    { name: "secure-upload", requireAuth: true, rateLimit: { max: 10, windowSeconds: 60 } },
    async ({ user, body }) => {
      const action = String(body.action ?? "upload");
      const svc = serviceClient();
      const path = `${user!.id}/backup.json`; // derived from the JWT — no client-controlled paths

      if (action === "download") {
        const { data, error } = await svc.storage
          .from(BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL, { download: "syllabix-backup.json" });
        if (error || !data) return errorResponse("No backup found", 404);
        return json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL });
      }

      if (action !== "upload") return badRequest("Unknown action");

      const content = typeof body.content === "string" ? body.content : "";
      if (!content) return badRequest("Missing backup content");

      const bytes = new TextEncoder().encode(content);
      if (bytes.byteLength > MAX_BYTES) {
        return badRequest(`Backup is too large (limit ${MAX_BYTES / 1024 / 1024} MB).`);
      }

      const magicError = magicByteError(bytes);
      if (magicError) {
        console.warn(JSON.stringify({ evt: "upload.rejected", user: user!.id, reason: magicError }));
        return badRequest(magicError);
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content);
      } catch {
        return badRequest("Backup is not valid JSON.");
      }
      if (typeof parsed.version !== "number" || typeof parsed.createdAt !== "string") {
        return badRequest("Backup envelope is invalid.");
      }

      const { error } = await svc.storage.from(BUCKET).upload(path, new Blob([bytes]), {
        upsert: true,
        contentType: "application/json",
      });
      if (error) return errorResponse("Could not save backup", 500);

      console.log(JSON.stringify({ evt: "upload.accepted", user: user!.id, bytes: bytes.byteLength }));
      return json({ success: true, bytes: bytes.byteLength });
    },
  ),
);
