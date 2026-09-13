import { Router } from "express";
import { z } from "zod";
import { entryParserService } from "../services/EntryParserService.js";

export const parseRouter = Router();

const previewSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

parseRouter.post("/preview", async (req, res, next) => {
  try {
    const { text } = previewSchema.parse(req.body);
    const parsed = await entryParserService.parseAsync(text);
    const needsLlm = entryParserService.needsLlm(parsed);
    res.json({
      text,
      needsLlm,
      parsed: {
        title: parsed.title,
        notes: parsed.notes,
        kind: parsed.kind,
        status: parsed.status,
        priority: parsed.priority,
        categorySlug: parsed.categorySlug,
        dueAt: parsed.dueAt?.toISOString() ?? null,
        startsAt: parsed.startsAt?.toISOString() ?? null,
        endsAt: parsed.endsAt?.toISOString() ?? null,
        remindAt: parsed.remindAt?.toISOString() ?? null,
        completedAt: parsed.completedAt?.toISOString() ?? null,
        confidence: parsed.confidence,
        signals: parsed.signals,
        engine: parsed.engine,
        model: parsed.model ?? null,
        needsReview: parsed.needsReview,
      },
    });
  } catch (error) {
    next(error);
  }
});
