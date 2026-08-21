/**
 * Client-side pre-flight validation for user file uploads.
 * The authoritative check lives server-side in the `secure-upload` service —
 * this only gives fast feedback and blocks obvious mistakes.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Byte signatures we refuse outright, regardless of extension. */
const FORBIDDEN_SIGNATURES: { name: string; bytes: number[] }[] = [
  { name: 'Windows executable', bytes: [0x4d, 0x5a] }, // MZ
  { name: 'ELF binary', bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: 'Mach-O binary', bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { name: 'ZIP/Office archive', bytes: [0x50, 0x4b, 0x03, 0x04] },
  { name: 'RAR archive', bytes: [0x52, 0x61, 0x72, 0x21] },
  { name: 'GZip archive', bytes: [0x1f, 0x8b] },
  { name: 'PDF document', bytes: [0x25, 0x50, 0x44, 0x46] },
  { name: 'Java class', bytes: [0xca, 0xfe, 0xba, 0xbe] },
];

export interface UploadCheck {
  ok: boolean;
  error?: string;
}

function startsWith(head: Uint8Array, sig: number[]): boolean {
  return sig.every((b, i) => head[i] === b);
}

/**
 * Validate a JSON backup file: size limit, extension and magic bytes.
 * JSON has no formal magic number, so we assert the first non-whitespace
 * byte opens an object and that no binary signature is present.
 */
export async function validateJsonUpload(file: File): Promise<UploadCheck> {
  if (file.size === 0) return { ok: false, error: 'That file is empty.' };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File is too large. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  }
  if (!/\.json$/i.test(file.name)) {
    return { ok: false, error: 'Only .json backup files can be restored.' };
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  for (const sig of FORBIDDEN_SIGNATURES) {
    if (startsWith(head, sig.bytes)) {
      return { ok: false, error: `This looks like a ${sig.name}, not a Syllabix backup.` };
    }
  }

  // First meaningful character of a Syllabix backup must be '{'.
  const firstChar = Array.from(head).find((b) => ![0x20, 0x09, 0x0a, 0x0d, 0xef, 0xbb, 0xbf].includes(b));
  if (firstChar !== 0x7b) {
    return { ok: false, error: 'That file is not a valid Syllabix backup.' };
  }

  return { ok: true };
}
