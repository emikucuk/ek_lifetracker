import { prisma } from "../lib/prisma.js";
import { NotFoundError, ValidationError } from "../errors/AppError.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "../schemas/categories.js";

export const SYSTEM_CATEGORIES = [
  { name: "Genel", slug: "genel", color: "#5C7A6B", icon: "inbox" },
  { name: "İş", slug: "is", color: "#1A4731", icon: "briefcase" },
  { name: "Okul", slug: "okul", color: "#3B82F6", icon: "book" },
  { name: "Sağlık", slug: "saglik", color: "#EF4444", icon: "heart" },
  { name: "Finans", slug: "finans", color: "#C4A63A", icon: "wallet" },
  { name: "Sosyal", slug: "sosyal", color: "#A855F7", icon: "users" },
  { name: "Ev", slug: "ev", color: "#F97316", icon: "home" },
  { name: "Kişisel", slug: "kisisel", color: "#0EA5E9", icon: "user" },
] as const;

const TR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

export function slugifyCategoryName(name: string): string {
  const mapped = name
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("");
  return mapped
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export class CategoryRepository {
  async ensureSystemCategories() {
    for (const cat of SYSTEM_CATEGORIES) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        create: { ...cat, isSystem: true },
        update: { isSystem: true },
      });
    }
  }

  async list(options?: { includeArchived?: boolean }) {
    return prisma.category.findMany({
      where: options?.includeArchived ? undefined : { archivedAt: null },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  }

  async findById(id: string) {
    const item = await prisma.category.findUnique({ where: { id } });
    if (!item) throw new NotFoundError("Kategori bulunamadı");
    return item;
  }

  async findBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
  }

  async create(input: CreateCategoryInput) {
    const name = input.name.trim();
    const baseSlug = input.slug?.trim() || slugifyCategoryName(name);
    if (!baseSlug) throw new ValidationError("Geçerli bir slug üretilemedi");

    let slug = baseSlug;
    let n = 2;
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n}`;
      n += 1;
    }

    const existingName = await prisma.category.findUnique({ where: { name } });
    if (existingName) throw new ValidationError("Bu isimde bir kategori zaten var");

    return prisma.category.create({
      data: {
        name,
        slug,
        color: input.color ?? "#1A4731",
        icon: input.icon ?? null,
        isSystem: false,
      },
    });
  }

  async update(id: string, input: UpdateCategoryInput) {
    const existing = await this.findById(id);

    if (input.name !== undefined) {
      const name = input.name.trim();
      const clash = await prisma.category.findFirst({
        where: { name, NOT: { id } },
      });
      if (clash) throw new ValidationError("Bu isimde bir kategori zaten var");
    }

    if (input.archived === true && existing.isSystem) {
      throw new ValidationError("Sistem kategorileri arşivlenemez");
    }

    return prisma.category.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.archived === true ? { archivedAt: new Date() } : {}),
        ...(input.archived === false ? { archivedAt: null } : {}),
      },
    });
  }

  async moveEntriesToGenel(id: string) {
    const existing = await this.findById(id);
    const genel = await this.findBySlug("genel");
    if (!genel) throw new NotFoundError("Genel kategori bulunamadı");
    if (existing.id === genel.id) {
      throw new ValidationError("Kayıtlar zaten Genel’de");
    }

    const result = await prisma.lifeEntry.updateMany({
      where: { categoryId: id, deletedAt: null },
      data: { categoryId: genel.id },
    });

    return { moved: result.count, categoryId: genel.id, categoryName: genel.name };
  }

  async delete(id: string) {
    const existing = await this.findById(id);
    if (existing.isSystem) {
      throw new ValidationError("Sistem kategorileri silinemez");
    }
    await prisma.category.delete({ where: { id } });
  }
}

export const categoryRepository = new CategoryRepository();
