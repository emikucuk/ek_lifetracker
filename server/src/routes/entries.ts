import { Router } from "express";
import type { EntryKind, EntryStatus } from "@prisma/client";
import {
  createEntrySchema,
  ingestSchema,
  snoozeSchema,
  updateEntrySchema,
  bulkEntriesSchema,
} from "../schemas/entries.js";
import { entryRepository } from "../repositories/EntryRepository.js";

export const entriesRouter = Router();

entriesRouter.get("/", async (req, res, next) => {
  try {
    const needsReviewRaw = req.query.needsReview;
    const needsReview =
      needsReviewRaw === "true" ? true : needsReviewRaw === "false" ? false : undefined;

    const trashedRaw = req.query.trashed;
    const trashed = trashedRaw === "true";

    const entries = await entryRepository.list({
      status: trashed ? undefined : (req.query.status as EntryStatus | undefined),
      kind: req.query.kind as EntryKind | undefined,
      categoryId: req.query.categoryId as string | undefined,
      q: req.query.q as string | undefined,
      dueBefore: req.query.dueBefore ? new Date(String(req.query.dueBefore)) : undefined,
      dueAfter: req.query.dueAfter ? new Date(String(req.query.dueAfter)) : undefined,
      rangeStart: req.query.rangeStart ? new Date(String(req.query.rangeStart)) : undefined,
      rangeEnd: req.query.rangeEnd ? new Date(String(req.query.rangeEnd)) : undefined,
      needsReview,
      trashed,
    });
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

entriesRouter.get("/stats", async (_req, res, next) => {
  try {
    res.json(await entryRepository.stats());
  } catch (error) {
    next(error);
  }
});

entriesRouter.post("/ingest", async (req, res, next) => {
  try {
    const input = ingestSchema.parse(req.body);
    const entries = await entryRepository.createManyFromText({
      text: input.text,
      notes: input.notes,
      source: input.source ?? "panel",
    });
    res.status(201).json({ entries, count: entries.length });
  } catch (error) {
    next(error);
  }
});

entriesRouter.post("/bulk", async (req, res, next) => {
  try {
    const input = bulkEntriesSchema.parse(req.body);
    if (input.action === "category" && input.categoryId === undefined) {
      res.status(400).json({ error: { message: "categoryId gerekli" } });
      return;
    }
    const result = await entryRepository.bulk(input);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

entriesRouter.post("/", async (req, res, next) => {
  try {
    const input = createEntrySchema.parse(req.body);
    const entry = await entryRepository.createManual(input);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

entriesRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await entryRepository.findById(req.params.id));
  } catch (error) {
    next(error);
  }
});

entriesRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = updateEntrySchema.parse(req.body);
    res.json(await entryRepository.update(req.params.id, input));
  } catch (error) {
    next(error);
  }
});

entriesRouter.post("/:id/snooze", async (req, res, next) => {
  try {
    const input = snoozeSchema.parse(req.body);
    res.json(await entryRepository.snooze(req.params.id, input.amount));
  } catch (error) {
    next(error);
  }
});

entriesRouter.post("/:id/restore", async (req, res, next) => {
  try {
    res.json(await entryRepository.restore(req.params.id));
  } catch (error) {
    next(error);
  }
});

entriesRouter.delete("/:id/purge", async (req, res, next) => {
  try {
    await entryRepository.purge(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

entriesRouter.delete("/trash", async (_req, res, next) => {
  try {
    res.json(await entryRepository.purgeTrash());
  } catch (error) {
    next(error);
  }
});

entriesRouter.delete("/:id", async (req, res, next) => {
  try {
    await entryRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
