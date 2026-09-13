import { z } from "zod";

export const entryKindSchema = z.enum([
  "TASK",
  "EVENT",
  "DEADLINE",
  "NOTE",
  "REMINDER",
  "IDEA",
  "OTHER",
]);

export const entryStatusSchema = z.enum(["OPEN", "DONE", "CANCELLED", "ARCHIVED"]);
export const entryPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const recurRuleSchema = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);

export const ingestSchema = z.object({
  text: z.string().min(1),
  notes: z.string().optional().nullable(),
  source: z.string().optional(),
});

export const createEntrySchema = z.object({
  title: z.string().min(1),
  rawText: z.string().optional(),
  notes: z.string().optional().nullable(),
  kind: entryKindSchema.optional(),
  status: entryStatusSchema.optional(),
  priority: entryPrioritySchema.optional(),
  source: z.string().optional(),
  dueAt: z.string().datetime().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  remindAt: z.string().datetime().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  needsReview: z.boolean().optional(),
  recurRule: recurRuleSchema.optional().nullable(),
});

export const updateEntrySchema = createEntrySchema.partial();

export const snoozeSchema = z.object({
  amount: z.enum(["1d", "1w"]),
});

export const bulkEntriesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["done", "archive", "delete", "category"]),
  categoryId: z.string().nullable().optional(),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type SnoozeInput = z.infer<typeof snoozeSchema>;
export type BulkEntriesInput = z.infer<typeof bulkEntriesSchema>;
