import { Router } from "express";
import { createCategorySchema, updateCategorySchema } from "../schemas/categories.js";
import { categoryRepository } from "../repositories/CategoryRepository.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (req, res, next) => {
  try {
    const includeArchived =
      req.query.archived === "1" ||
      req.query.archived === "true" ||
      req.query.includeArchived === "true";
    const categories = await categoryRepository.list({ includeArchived });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post("/", async (req, res, next) => {
  try {
    const input = createCategorySchema.parse(req.body);
    const category = await categoryRepository.create(input);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post("/:id/move-to-genel", async (req, res, next) => {
  try {
    const result = await categoryRepository.moveEntriesToGenel(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = updateCategorySchema.parse(req.body);
    const category = await categoryRepository.update(req.params.id, input);
    res.json(category);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    await categoryRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
