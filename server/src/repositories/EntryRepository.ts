import type { EntryKind, EntryPriority, EntryStatus, Prisma, RecurRule } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../errors/AppError.js";
import type { CreateEntryInput, UpdateEntryInput } from "../schemas/entries.js";
import { entryParserService } from "../services/EntryParserService.js";
import { splitIngestTexts } from "../services/ingestSplit.js";
import { addDays, recurOffsetDays, shiftDate, snoozeDays } from "../services/dateShift.js";
import { categoryRepository } from "./CategoryRepository.js";

const include = { category: true } satisfies Prisma.LifeEntryInclude;

export class EntryRepository {
  async list(filters: {
    status?: EntryStatus;
    kind?: EntryKind;
    categoryId?: string;
    dueBefore?: Date;
    dueAfter?: Date;
    rangeStart?: Date;
    rangeEnd?: Date;
    q?: string;
    needsReview?: boolean;
    trashed?: boolean;
  } = {}) {
    const where: Prisma.LifeEntryWhereInput = {};
    if (filters.trashed) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }
    if (filters.status) where.status = filters.status;
    if (filters.kind) where.kind = filters.kind;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.needsReview !== undefined) where.needsReview = filters.needsReview;
    if (filters.dueBefore || filters.dueAfter) {
      where.dueAt = {
        ...(filters.dueAfter ? { gte: filters.dueAfter } : {}),
        ...(filters.dueBefore ? { lte: filters.dueBefore } : {}),
      };
    }
    if (filters.rangeStart || filters.rangeEnd) {
      const range = {
        ...(filters.rangeStart ? { gte: filters.rangeStart } : {}),
        ...(filters.rangeEnd ? { lte: filters.rangeEnd } : {}),
      };
      where.OR = [{ dueAt: range }, { startsAt: range }];
    }
    if (filters.q?.trim()) {
      const textFilter = [
        { title: { contains: filters.q.trim() } },
        { rawText: { contains: filters.q.trim() } },
        { notes: { contains: filters.q.trim() } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: textFilter }];
        delete where.OR;
      } else {
        where.OR = textFilter;
      }
    }

    return prisma.lifeEntry.findMany({
      where,
      include,
      orderBy: filters.trashed
        ? [{ deletedAt: "desc" }]
        : [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
  }

  async findById(id: string) {
    const item = await prisma.lifeEntry.findFirst({
      where: { id, deletedAt: null },
      include,
    });
    if (!item) throw new NotFoundError("Kayıt bulunamadı");
    return item;
  }

  async findByIdIncludingDeleted(id: string) {
    const item = await prisma.lifeEntry.findUnique({ where: { id }, include });
    if (!item) throw new NotFoundError("Kayıt bulunamadı");
    return item;
  }

  async createManyFromText(input: { text: string; source?: string; notes?: string | null }) {
    const parts = splitIngestTexts(input.text);
    const entries = [];
    for (const part of parts) {
      entries.push(
        await this.createFromText({
          text: part,
          source: input.source,
          notes: input.notes,
        })
      );
    }
    return entries;
  }

  async createFromText(input: { text: string; source?: string; notes?: string | null }) {
    const parsed = await entryParserService.parseAsync(input.text);
    const category = await categoryRepository.findBySlug(parsed.categorySlug);
    const notes = input.notes?.trim() || parsed.notes || null;

    return prisma.lifeEntry.create({
      data: {
        rawText: input.text.trim(),
        title: parsed.title,
        notes,
        kind: parsed.kind,
        status: parsed.status,
        priority: parsed.priority,
        source: input.source ?? "panel",
        dueAt: parsed.dueAt,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        remindAt: parsed.remindAt,
        completedAt: parsed.completedAt,
        categoryId: category?.id ?? null,
        needsReview: parsed.needsReview,
        parseMeta: JSON.stringify({
          confidence: parsed.confidence,
          signals: parsed.signals,
          categorySlug: parsed.categorySlug,
          engine: parsed.engine,
          model: parsed.model ?? null,
          needsReview: parsed.needsReview,
          status: parsed.status,
        }),
      },
      include,
    });
  }

  async createManual(input: CreateEntryInput) {
    return prisma.lifeEntry.create({
      data: {
        rawText: input.rawText ?? input.title,
        title: input.title,
        notes: input.notes ?? null,
        kind: input.kind ?? "NOTE",
        status: input.status ?? "OPEN",
        priority: input.priority ?? "NORMAL",
        source: input.source ?? "panel",
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        remindAt: input.remindAt ? new Date(input.remindAt) : null,
        categoryId: input.categoryId ?? null,
        recurRule: input.recurRule ?? null,
        needsReview: input.needsReview ?? false,
      },
      include,
    });
  }

  async update(id: string, input: UpdateEntryInput) {
    const existing = await this.findById(id);
    const data: Prisma.LifeEntryUpdateInput = {};

    if (input.title !== undefined) data.title = input.title;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.kind !== undefined) data.kind = input.kind;
    if (input.status !== undefined) {
      data.status = input.status;
      data.completedAt = input.status === "DONE" ? new Date() : null;
    }
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.needsReview !== undefined) data.needsReview = input.needsReview;
    if (input.recurRule !== undefined) data.recurRule = input.recurRule;
    if (input.dueAt !== undefined) data.dueAt = input.dueAt ? new Date(input.dueAt) : null;
    if (input.startsAt !== undefined) data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (input.remindAt !== undefined) data.remindAt = input.remindAt ? new Date(input.remindAt) : null;
    if (input.categoryId !== undefined) {
      data.category = input.categoryId
        ? { connect: { id: input.categoryId } }
        : { disconnect: true };
    }

    const updated = await prisma.lifeEntry.update({ where: { id }, data, include });

    if (
      input.status === "DONE" &&
      existing.status !== "DONE" &&
      existing.recurRule
    ) {
      await this.spawnRecurrence(existing);
    }

    return updated;
  }

  async snooze(id: string, amount: "1d" | "1w") {
    const existing = await this.findById(id);
    const days = snoozeDays(amount);
    const baseDue = existing.dueAt ?? existing.startsAt ?? new Date();
    return prisma.lifeEntry.update({
      where: { id },
      data: {
        dueAt: addDays(baseDue, days),
        startsAt: shiftDate(existing.startsAt, days),
        endsAt: shiftDate(existing.endsAt, days),
        remindAt: shiftDate(existing.remindAt, days),
        needsReview: false,
      },
      include,
    });
  }

  private async spawnRecurrence(entry: {
    rawText: string;
    title: string;
    notes: string | null;
    kind: EntryKind;
    priority: EntryPriority;
    source: string;
    dueAt: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
    remindAt: Date | null;
    categoryId: string | null;
    recurRule: RecurRule | null;
  }) {
    if (!entry.recurRule) return null;
    const days = recurOffsetDays(entry.recurRule);
    const baseDue = entry.dueAt ?? entry.startsAt ?? new Date();
    return prisma.lifeEntry.create({
      data: {
        rawText: entry.rawText,
        title: entry.title,
        notes: entry.notes,
        kind: entry.kind,
        status: "OPEN",
        priority: entry.priority,
        source: entry.source,
        dueAt: addDays(baseDue, days),
        startsAt: shiftDate(entry.startsAt, days),
        endsAt: shiftDate(entry.endsAt, days),
        remindAt: shiftDate(entry.remindAt, days),
        categoryId: entry.categoryId,
        recurRule: entry.recurRule,
        needsReview: false,
      },
      include,
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return prisma.lifeEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
      include,
    });
  }

  async restore(id: string) {
    const item = await this.findByIdIncludingDeleted(id);
    if (!item.deletedAt) throw new NotFoundError("Kayıt çöpte değil");
    return prisma.lifeEntry.update({
      where: { id },
      data: { deletedAt: null },
      include,
    });
  }

  async purge(id: string) {
    const item = await this.findByIdIncludingDeleted(id);
    if (!item.deletedAt) throw new NotFoundError("Kalıcı silmek için önce çöpe taşı");
    await prisma.lifeEntry.delete({ where: { id } });
  }

  async purgeTrash() {
    const result = await prisma.lifeEntry.deleteMany({ where: { deletedAt: { not: null } } });
    return { deleted: result.count };
  }

  async bulk(input: {
    ids: string[];
    action: "done" | "archive" | "delete" | "category";
    categoryId?: string | null;
  }) {
    const ids = [...new Set(input.ids)];
    let updated = 0;

    if (input.action === "delete") {
      const result = await prisma.lifeEntry.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return { updated: result.count };
    }

    if (input.action === "done") {
      for (const id of ids) {
        try {
          await this.update(id, { status: "DONE" });
          updated += 1;
        } catch {
          /* skip missing */
        }
      }
      return { updated };
    }

    if (input.action === "archive") {
      const result = await prisma.lifeEntry.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { status: "ARCHIVED", completedAt: null },
      });
      return { updated: result.count };
    }

    // category
    const result = await prisma.lifeEntry.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { categoryId: input.categoryId ?? null },
    });
    return { updated: result.count };
  }

  async stats() {
    const [total, open, done, needsReview, trashed, byKind, byCategory] = await Promise.all([
      prisma.lifeEntry.count({ where: { deletedAt: null } }),
      prisma.lifeEntry.count({ where: { status: "OPEN", deletedAt: null } }),
      prisma.lifeEntry.count({ where: { status: "DONE", deletedAt: null } }),
      prisma.lifeEntry.count({ where: { needsReview: true, status: "OPEN", deletedAt: null } }),
      prisma.lifeEntry.count({ where: { deletedAt: { not: null } } }),
      prisma.lifeEntry.groupBy({
        by: ["kind"],
        where: { deletedAt: null },
        _count: true,
      }),
      prisma.lifeEntry.groupBy({
        by: ["categoryId"],
        where: { deletedAt: null },
        _count: true,
      }),
    ]);

    return {
      total,
      open,
      done,
      needsReview,
      trashed,
      byKind: Object.fromEntries(byKind.map((r) => [r.kind, r._count])),
      byCategory: byCategory,
    };
  }
}

export const entryRepository = new EntryRepository();
