import { createService } from "../_shared/service.ts";
import { badRequest, json, serverError, errorResponse } from "../_shared/http/responses.ts";
import { apiKey, parseJsonCompletion } from "../_shared/ai/gateway.ts";
import { clampNumber, sanitizeList, sanitizeText } from "../_shared/validation/sanitize.ts";

const MODEL = "openai/gpt-6-astra";
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_TEXT = 100_000;

function detectMime(b: Uint8Array): string | null {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  return null;
}

Deno.serve(
  createService({ name: "extract-scheme", rateLimit: { max: 10, windowSeconds: 60 } }, async ({ body }) => {
    const key = apiKey();
    if (!key) return serverError("AI service is not configured");

    const subject = sanitizeText(body.subject, 100);
    const classLevel = sanitizeText(body.classLevel, 60);
    const filename = sanitizeText(body.filename, 120) || "scheme";
    if (!subject || !classLevel) return badRequest("Subject and class level are required");

    const parts: Record<string, unknown>[] = [];
    const instructions = `You extract a Nigerian Scheme of Work for ${subject}, ${classLevel} only. Ignore other classes/subjects. Return ONLY JSON: {"weeks":[{"term":1-3,"week":1-13,"topic":"","subTopic":"","objectives":[],"materials":[]}]}. Use exact topics from the document; do not invent weeks that are not present.`;
    parts.push({ type: "input_text", text: instructions });

    if (typeof body.text === "string") {
      const text = body.text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, MAX_TEXT);
      if (text.trim().length < 40) return badRequest("The document has too little text");
      parts.push({ type: "input_text", text: `DOCUMENT:\n${text}` });
    } else if (typeof body.fileBase64 === "string") {
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(body.fileBase64), (c) => c.charCodeAt(0));
      } catch {
        return badRequest("Invalid file data");
      }
      if (bytes.length === 0 || bytes.length > MAX_BYTES) return badRequest("File must be under 4MB");
      const mime = detectMime(bytes);
      if (!mime) return badRequest("Unsupported or corrupted file type");
      const b64 = body.fileBase64 as string;
      parts.push(
        mime === "application/pdf"
          ? { type: "input_file", filename: filename.replace(/[^\w.\- ]/g, "_"), file_data: `data:${mime};base64,${b64}` }
          : { type: "input_image", image_url: `data:${mime};base64,${b64}` },
      );
    } else {
      return badRequest("No file content provided");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: "user", content: parts }],
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });
    if (!res.ok || !res.body) {
      if (res.status === 429) return errorResponse("AI service is busy. Try again shortly.", 429);
      if (res.status === 402) return errorResponse("AI credits exhausted.", 402);
      if (res.status === 403) return errorResponse("AI access is currently unavailable.", 403);
      console.error("extract-scheme gateway", res.status);
      return serverError("Failed to extract scheme");
    }

    let text = "";
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta;
        } catch { /* ignore */ }
      }
    }

    const parsed = parseJsonCompletion<{ weeks?: unknown }>(text);
    if (!parsed || !Array.isArray(parsed.weeks)) return serverError("Could not read the scheme from this file");

    const weeks = (parsed.weeks as Record<string, unknown>[]).slice(0, 39).map((w) => ({
      term: clampNumber(w.term, 1, 3, 1),
      week: clampNumber(w.week, 1, 13, 1),
      topic: sanitizeText(w.topic, 200),
      subTopic: sanitizeText(w.subTopic, 200),
      objectives: sanitizeList(w.objectives, 200, 10),
      materials: sanitizeList(w.materials, 100, 10),
    }));
    return json({ weeks });
  }),
);
