import type { EntryKind } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { NotFoundError, ValidationError } from "../errors/AppError.js";
import { extractLearnPhrases } from "../services/learnPhrases.js";

export type ParseHintRow = {
  id: string;
  phrase: string;
  kind: EntryKind | null;
  categoryId: string | null;
  source: string;
  category: { id: string; name: string; slug: string; color: string } | null;
};

const include = {
  category: { select: { id: true, name: true, slug: true, color: true } },
} as const;

export class ParseHintRepository {
  async list(filters: { categoryId?: string; kind?: EntryKind } = {}) {
    return prisma.parseHint.findMany({
      where: {
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.kind ? { kind: filters.kind } : {}),
      },
      include,
      orderBy: [{ phrase: "asc" }],
    });
  }

  async listForParser() {
    return prisma.parseHint.findMany({
      select: {
        phrase: true,
        kind: true,
        categoryId: true,
        category: { select: { slug: true } },
      },
      orderBy: [{ phrase: "desc" }], // longer-ish phrases tend to sort later; we sort in parser by length
    });
  }

  async create(input: {
    phrase: string;
    kind?: EntryKind | null;
    categoryId?: string | null;
    source?: string;
  }) {
    const phrase = input.phrase.trim().toLocaleLowerCase("tr-TR");
    if (phrase.length < 2) throw new ValidationError("İpucu çok kısa");
    if (!input.kind && !input.categoryId) {
      throw new ValidationError("Tür veya kategori gerekli");
    }

    if (input.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!cat) throw new NotFoundError("Kategori bulunamadı");
    }

    const existing = await prisma.parseHint.findFirst({
      where: {
        phrase,
        kind: input.kind ?? null,
        categoryId: input.categoryId ?? null,
      },
      include,
    });
    if (existing) return existing;

    return prisma.parseHint.create({
      data: {
        phrase,
        kind: input.kind ?? null,
        categoryId: input.categoryId ?? null,
        source: input.source ?? "manual",
      },
      include,
    });
  }

  async learnFromCorrection(input: {
    rawText: string;
    kind?: EntryKind | null;
    categoryId?: string | null;
  }) {
    if (!input.kind && !input.categoryId) {
      throw new ValidationError("Öğrenmek için tür veya kategori değiştirilmiş olmalı");
    }

    const phrases = extractLearnPhrases(input.rawText);
    if (phrases.length === 0) {
      throw new ValidationError("Öğrenilecek anlamlı kelime bulunamadı");
    }

    const created = [];
    for (const phrase of phrases) {
      if (input.categoryId) {
        created.push(
          await this.create({
            phrase,
            categoryId: input.categoryId,
            source: "learned",
          })
        );
      }
      if (input.kind) {
        created.push(
          await this.create({
            phrase,
            kind: input.kind,
            source: "learned",
          })
        );
      }
    }
    return created;
  }

  async delete(id: string) {
    const existing = await prisma.parseHint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("İpucu bulunamadı");
    await prisma.parseHint.delete({ where: { id } });
  }
}

export const parseHintRepository = new ParseHintRepository();
