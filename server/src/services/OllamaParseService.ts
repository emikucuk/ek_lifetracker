import { z } from "zod";
import type { EntryKind, EntryPriority, EntryStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const KIND_SET = new Set<EntryKind>([
  "TASK",
  "EVENT",
  "DEADLINE",
  "NOTE",
  "REMINDER",
  "IDEA",
  "OTHER",
]);

const PRIORITY_SET = new Set<EntryPriority>(["LOW", "NORMAL", "HIGH", "URGENT"]);
const STATUS_SET = new Set<EntryStatus>(["OPEN", "DONE", "CANCELLED", "ARCHIVED"]);

const CATEGORY_SLUGS = new Set([
  "genel",
  "is",
  "okul",
  "saglik",
  "finans",
  "sosyal",
  "ev",
  "kisisel",
]);

const ollamaJsonSchema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  kind: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  categorySlug: z.string().optional(),
  dueAt: z.string().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  remindAt: z.string().nullable().optional(),
});

export interface OllamaParsedFields {
  title?: string;
  notes?: string | null;
  kind?: EntryKind;
  status?: EntryStatus;
  priority?: EntryPriority;
  categorySlug?: string;
  dueAt: Date | null | undefined;
  startsAt: Date | null | undefined;
  endsAt: Date | null | undefined;
  remindAt: Date | null | undefined;
  model: string;
}

function parseMaybeDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Ollama yanıtında JSON bulunamadı");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

export class OllamaParseService {
  async parse(text: string, now = new Date(), modelOverride?: string): Promise<OllamaParsedFields | null> {
    const base = env.ollamaBaseUrl.replace(/\/$/, "");
    const model = modelOverride || env.ollamaModel;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.ollamaTimeoutMs);

    const system = `Sen Türkçe hayat kaydı asistanısın. Kullanıcı müdahale etmeden doğru kayıt üret.
Sadece geçerli JSON döndür, açıklama yazma.

Alanlar:
- title: kısa, temiz başlık (tarih kalabalığı olmadan; kişi/nesne kalsın)
- notes: SADECE kullanıcı "not olarak …" / "not: …" dediyse o kısmın metni. Yoksa null. Asla özet/yorum/şablon yazma.
- kind: TASK|EVENT|DEADLINE|NOTE|REMINDER|IDEA|OTHER
- status: OPEN|DONE|CANCELLED|ARCHIVED
- priority: LOW|NORMAL|HIGH|URGENT
- categorySlug: genel|is|okul|saglik|finans|sosyal|ev|kisisel
- dueAt, startsAt, endsAt, remindAt: ISO 8601 veya null

Kurallar:
1) Geçmiş anlatım ("… aldık/oldu/yaptık/gittik"): kind=EVENT, status=DONE.
   startsAt=o gün 00:00, endsAt=o gün 23:59, dueAt=o gün ~12:00, remindAt=null.
   Yıl yoksa: tarih bugünden sonraysa geçen yıl, değilse bu yıl.
2) Gelecek ("… gideceğim/olacak"): status=OPEN. Saat yoksa 09:00. remindAt ≈ 1 saat önce.
3) "Cuma günü" → en yakın Cuma (bugün cumaysa bugün). "Haftaya cuma" → gelecek haftanın cuması.
4) Deadline/teslim → DEADLINE, status=OPEN; remindAt bir gün önce 18:00 veya sabah 09:00.
5) Tarih alanlarını ASLA boş bırakma eğer metinde gün/ay/hafta varsa.
6) "not olarak X" → notes=X, başlık/tarih kısmından "not olarak…" çıkar.
7) notes alanına sistem özeti, tür, kategori, kaynak yazma — sadece kullanıcının notu.
Bugünün tarihi (ISO): ${now.toISOString()}
Yerel referans: ${now.toLocaleString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;

    try {
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
          messages: [
            { role: "system", content: system },
            { role: "user", content: text },
          ],
        }),
      });

      if (!res.ok) {
        logger.warn("Ollama parse HTTP error", { status: res.status });
        return null;
      }

      const body = (await res.json()) as { message?: { content?: string } };
      const content = body.message?.content;
      if (!content) return null;

      const parsed = ollamaJsonSchema.parse(extractJson(content));
      const kind = parsed.kind && KIND_SET.has(parsed.kind as EntryKind) ? (parsed.kind as EntryKind) : undefined;
      const status =
        parsed.status && STATUS_SET.has(parsed.status as EntryStatus)
          ? (parsed.status as EntryStatus)
          : undefined;
      const priority =
        parsed.priority && PRIORITY_SET.has(parsed.priority as EntryPriority)
          ? (parsed.priority as EntryPriority)
          : undefined;
      const categorySlug =
        parsed.categorySlug && CATEGORY_SLUGS.has(parsed.categorySlug)
          ? parsed.categorySlug
          : undefined;

      return {
        title: parsed.title?.trim() || undefined,
        notes: parsed.notes?.trim() || null,
        kind,
        status,
        priority,
        categorySlug,
        dueAt: parseMaybeDate(parsed.dueAt),
        startsAt: parseMaybeDate(parsed.startsAt),
        endsAt: parseMaybeDate(parsed.endsAt),
        remindAt: parseMaybeDate(parsed.remindAt),
        model,
      };
    } catch (error) {
      logger.warn("Ollama parse failed, using rules", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const ollamaParseService = new OllamaParseService();
