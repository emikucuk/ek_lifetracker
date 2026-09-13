import { prisma } from "../lib/prisma.js";
import { ValidationError } from "../errors/AppError.js";
import { z } from "zod";
import { entryKindSchema, entryPrioritySchema, entryStatusSchema, recurRuleSchema } from "../schemas/entries.js";

const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  categories: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
      color: z.string(),
      icon: z.string().nullable().optional(),
      isSystem: z.boolean().optional(),
    })
  ),
  entries: z.array(
    z.object({
      rawText: z.string(),
      title: z.string(),
      notes: z.string().nullable().optional(),
      kind: entryKindSchema,
      status: entryStatusSchema,
      priority: entryPrioritySchema,
      source: z.string().optional(),
      dueAt: z.string().nullable().optional(),
      startsAt: z.string().nullable().optional(),
      endsAt: z.string().nullable().optional(),
      remindAt: z.string().nullable().optional(),
      completedAt: z.string().nullable().optional(),
      parseMeta: z.string().nullable().optional(),
      needsReview: z.boolean().optional(),
      recurRule: recurRuleSchema.nullable().optional(),
      categorySlug: z.string().nullable().optional(),
    })
  ),
  hints: z.array(
    z.object({
      phrase: z.string(),
      kind: entryKindSchema.nullable().optional(),
      categorySlug: z.string().nullable().optional(),
      source: z.string().optional(),
    })
  ),
});

export type BackupPayload = z.infer<typeof backupSchema>;

export class BackupService {
  async exportJson(): Promise<BackupPayload> {
    const [categories, entries, hints] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.lifeEntry.findMany({
        where: { deletedAt: null },
        include: { category: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.parseHint.findMany({ include: { category: true }, orderBy: { phrase: "asc" } }),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        color: c.color,
        icon: c.icon,
        isSystem: c.isSystem,
      })),
      entries: entries.map((e) => ({
        rawText: e.rawText,
        title: e.title,
        notes: e.notes,
        kind: e.kind,
        status: e.status,
        priority: e.priority,
        source: e.source,
        dueAt: e.dueAt?.toISOString() ?? null,
        startsAt: e.startsAt?.toISOString() ?? null,
        endsAt: e.endsAt?.toISOString() ?? null,
        remindAt: e.remindAt?.toISOString() ?? null,
        completedAt: e.completedAt?.toISOString() ?? null,
        parseMeta: e.parseMeta,
        needsReview: e.needsReview,
        recurRule: e.recurRule,
        categorySlug: e.category?.slug ?? null,
      })),
      hints: hints.map((h) => ({
        phrase: h.phrase,
        kind: h.kind,
        categorySlug: h.category?.slug ?? null,
        source: h.source,
      })),
    };
  }

  async exportMarkdown(): Promise<string> {
    const data = await this.exportJson();
    const lines = [
      `# EK LifeTracker yedek`,
      ``,
      `Dışa aktarım: ${data.exportedAt}`,
      ``,
      `## Kategoriler`,
      ...data.categories.map((c) => `- **${c.name}** (\`${c.slug}\`)`),
      ``,
      `## Kayıtlar`,
    ];
    for (const e of data.entries) {
      lines.push(
        `- **${e.title}** · ${e.kind} · ${e.status}${e.categorySlug ? ` · ${e.categorySlug}` : ""}${
          e.dueAt ? ` · due ${e.dueAt.slice(0, 10)}` : ""
        }${e.recurRule ? ` · tekrar ${e.recurRule}` : ""}`
      );
      if (e.notes) lines.push(`  - ${e.notes}`);
    }
    lines.push(``, `## Parse ipuçları`);
    for (const h of data.hints) {
      lines.push(
        `- \`${h.phrase}\`${h.kind ? ` → ${h.kind}` : ""}${h.categorySlug ? ` → ${h.categorySlug}` : ""}`
      );
    }
    return lines.join("\n");
  }

  async exportCsv(): Promise<string> {
    const data = await this.exportJson();
    const header = [
      "title",
      "kind",
      "status",
      "priority",
      "category",
      "dueAt",
      "startsAt",
      "endsAt",
      "remindAt",
      "recurRule",
      "rawText",
      "notes",
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = data.entries.map((e) =>
      [
        e.title,
        e.kind,
        e.status,
        e.priority,
        e.categorySlug ?? "",
        e.dueAt ?? "",
        e.startsAt ?? "",
        e.endsAt ?? "",
        e.remindAt ?? "",
        e.recurRule ?? "",
        e.rawText,
        e.notes ?? "",
      ]
        .map((cell) => escape(String(cell)))
        .join(",")
    );
    return [header.join(","), ...rows].join("\n");
  }

  async importJson(raw: unknown, mode: "merge" | "replace" = "merge") {
    const data = backupSchema.parse(raw);

    if (mode === "replace") {
      await prisma.parseHint.deleteMany();
      await prisma.lifeEntry.deleteMany();
      await prisma.category.deleteMany({ where: { isSystem: false } });
    }

    for (const cat of data.categories) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        create: {
          name: cat.name,
          slug: cat.slug,
          color: cat.color,
          icon: cat.icon ?? null,
          isSystem: cat.isSystem ?? false,
        },
        update: {
          name: cat.name,
          color: cat.color,
          icon: cat.icon ?? null,
        },
      });
    }

    const categories = await prisma.category.findMany();
    const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

    let entriesCreated = 0;
    for (const e of data.entries) {
      await prisma.lifeEntry.create({
        data: {
          rawText: e.rawText,
          title: e.title,
          notes: e.notes ?? null,
          kind: e.kind,
          status: e.status,
          priority: e.priority,
          source: e.source ?? "backup",
          dueAt: e.dueAt ? new Date(e.dueAt) : null,
          startsAt: e.startsAt ? new Date(e.startsAt) : null,
          endsAt: e.endsAt ? new Date(e.endsAt) : null,
          remindAt: e.remindAt ? new Date(e.remindAt) : null,
          completedAt: e.completedAt ? new Date(e.completedAt) : null,
          parseMeta: e.parseMeta ?? null,
          needsReview: e.needsReview ?? false,
          recurRule: e.recurRule ?? null,
          categoryId: e.categorySlug ? bySlug.get(e.categorySlug) ?? null : null,
        },
      });
      entriesCreated += 1;
    }

    let hintsCreated = 0;
    for (const h of data.hints) {
      const categoryId = h.categorySlug ? bySlug.get(h.categorySlug) ?? null : null;
      if (!h.kind && !categoryId) continue;
      const existing = await prisma.parseHint.findFirst({
        where: {
          phrase: h.phrase.toLocaleLowerCase("tr-TR"),
          kind: h.kind ?? null,
          categoryId,
        },
      });
      if (existing) continue;
      await prisma.parseHint.create({
        data: {
          phrase: h.phrase.toLocaleLowerCase("tr-TR"),
          kind: h.kind ?? null,
          categoryId,
          source: h.source ?? "backup",
        },
      });
      hintsCreated += 1;
    }

    return {
      mode,
      categories: data.categories.length,
      entriesCreated,
      hintsCreated,
    };
  }

  parseImportBody(body: unknown) {
    if (!body || typeof body !== "object") {
      throw new ValidationError("Geçersiz yedek gövdesi");
    }
    const obj = body as { mode?: string; backup?: unknown; version?: number };
    if (obj.version === 1) {
      return { mode: "merge" as const, payload: body };
    }
    const mode = obj.mode === "replace" ? "replace" : "merge";
    const payload = obj.backup ?? body;
    return { mode: mode as "merge" | "replace", payload };
  }
}

export const backupService = new BackupService();
