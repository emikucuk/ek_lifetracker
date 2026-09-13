import { Router } from "express";
import { backupService } from "../services/BackupService.js";
import { autoBackupService } from "../services/AutoBackupService.js";

export const backupRouter = Router();

backupRouter.get("/export", async (_req, res, next) => {
  try {
    const data = await backupService.exportJson();
    res.setHeader("Content-Disposition", `attachment; filename="lifetracker-backup.json"`);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

backupRouter.get("/export.md", async (_req, res, next) => {
  try {
    const md = await backupService.exportMarkdown();
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="lifetracker-backup.md"`);
    res.send(md);
  } catch (error) {
    next(error);
  }
});

backupRouter.get("/export.csv", async (_req, res, next) => {
  try {
    const csv = await backupService.exportCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="lifetracker-backup.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

backupRouter.get("/auto/status", async (_req, res, next) => {
  try {
    res.json(await autoBackupService.status());
  } catch (error) {
    next(error);
  }
});

backupRouter.post("/auto/now", async (_req, res, next) => {
  try {
    const result = await autoBackupService.run("manual", { force: true });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

backupRouter.post("/import", async (req, res, next) => {
  try {
    const { mode, payload } = backupService.parseImportBody(req.body);
    const result = await backupService.importJson(payload, mode);
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});
