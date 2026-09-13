import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Renk #RRGGBB formatında olmalı")
    .optional(),
  icon: z.string().trim().max(40).optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug sadece küçük harf, rakam ve tire")
    .optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Renk #RRGGBB formatında olmalı")
    .optional(),
  icon: z.string().trim().max(40).optional().nullable(),
  archived: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
