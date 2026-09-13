import { Router } from "express";
import { emailSettingsService } from "../services/EmailSettingsService.js";
import { emailService } from "../services/EmailService.js";

export const emailRouter = Router();

emailRouter.get("/settings", async (_req, res, next) => {
  try {
    res.json(await emailSettingsService.getPublic());
  } catch (error) {
    next(error);
  }
});

emailRouter.patch("/settings", async (req, res, next) => {
  try {
    const input = emailSettingsService.parseUpdate(req.body);
    res.json(await emailSettingsService.update(input));
  } catch (error) {
    next(error);
  }
});

emailRouter.post("/test", async (_req, res, next) => {
  try {
    const result = await emailService.sendTest();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

emailRouter.post("/digest", async (_req, res, next) => {
  try {
    const result = await emailService.sendDigest({ force: true });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
