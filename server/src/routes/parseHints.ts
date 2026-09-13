import { Router } from "express";
import type { EntryKind } from "@prisma/client";
import { createParseHintSchema, learnParseHintSchema } from "../schemas/parseHints.js";
import { parseHintRepository } from "../repositories/ParseHintRepository.js";

export const parseHintsRouter = Router();

parseHintsRouter.get("/", async (req, res, next) => {
  try {
    const hints = await parseHintRepository.list({
      categoryId: typeof req.query.categoryId === "string" ? req.query.categoryId : undefined,
      kind: typeof req.query.kind === "string" ? (req.query.kind as EntryKind) : undefined,
    });
    res.json({ hints });
  } catch (error) {
    next(error);
  }
});

parseHintsRouter.post("/", async (req, res, next) => {
  try {
    const input = createParseHintSchema.parse(req.body);
    const hint = await parseHintRepository.create(input);
    res.status(201).json(hint);
  } catch (error) {
    next(error);
  }
});

parseHintsRouter.post("/learn", async (req, res, next) => {
  try {
    const input = learnParseHintSchema.parse(req.body);
    const hints = await parseHintRepository.learnFromCorrection(input);
    res.status(201).json({ hints, count: hints.length });
  } catch (error) {
    next(error);
  }
});

parseHintsRouter.delete("/:id", async (req, res, next) => {
  try {
    await parseHintRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
