import { z } from "zod";
import { entryKindSchema } from "./entries.js";

export const createParseHintSchema = z
  .object({
    phrase: z.string().trim().min(2).max(80),
    kind: entryKindSchema.optional().nullable(),
    categoryId: z.string().optional().nullable(),
    source: z.string().optional(),
  })
  .refine((v) => Boolean(v.kind || v.categoryId), {
    message: "Tür veya kategori gerekli",
  });

export const learnParseHintSchema = z
  .object({
    rawText: z.string().trim().min(1),
    kind: entryKindSchema.optional().nullable(),
    categoryId: z.string().optional().nullable(),
  })
  .refine((v) => Boolean(v.kind || v.categoryId), {
    message: "Tür veya kategori gerekli",
  });

export type CreateParseHintInput = z.infer<typeof createParseHintSchema>;
export type LearnParseHintInput = z.infer<typeof learnParseHintSchema>;
