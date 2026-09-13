import { Router } from "express";
import { settingsService } from "../services/SettingsService.js";

export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await settingsService.getPublic());
  } catch (error) {
    next(error);
  }
});

settingsRouter.patch("/", async (req, res, next) => {
  try {
    const input = settingsService.parseUpdate(req.body);
    res.json(await settingsService.update(input));
  } catch (error) {
    next(error);
  }
});

settingsRouter.get("/ollama", async (_req, res, next) => {
  try {
    res.json(await settingsService.pingOllama());
  } catch (error) {
    next(error);
  }
});
