import { Router } from "express";
import { env } from "../config/env.js";
import { ValidationError } from "../errors/AppError.js";
import { entryRepository } from "../repositories/EntryRepository.js";
import { buildVoiceSpokenMessage } from "../services/voiceMessage.js";
import { endOfDay, startOfDay } from "../services/dateShift.js";

export const voiceRouter = Router();

function assertVoiceKey(key: string | undefined) {
  if (!env.voiceApiKey) {
    throw new ValidationError("VOICE_DISABLED: VOICE_API_KEY ayarlanmamış");
  }
  if (!key || key !== env.voiceApiKey) {
    throw new ValidationError("Geçersiz voice API key");
  }
}

function voicePayload(entries: Awaited<ReturnType<typeof entryRepository.createManyFromText>>) {
  const first = entries[0]!;
  const message = buildVoiceSpokenMessage(entries);

  return {
    ok: true,
    message,
    speak: message,
    count: entries.length,
    title: first.title,
    kind: first.kind,
    category: first.category?.name ?? null,
    dueAt: first.dueAt,
    titles: entries.map((e) => e.title),
    needsReview: entries.some((e) => e.needsReview),
  };
}

voiceRouter.get("/add", async (req, res, next) => {
  try {
    assertVoiceKey(typeof req.query.key === "string" ? req.query.key : undefined);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) throw new ValidationError("q parametresi gerekli");

    const entries = await entryRepository.createManyFromText({ text: q, source: "siri" });
    res.json(voicePayload(entries));
  } catch (error) {
    next(error);
  }
});

voiceRouter.post("/add", async (req, res, next) => {
  try {
    const key =
      (typeof req.body?.key === "string" ? req.body.key : undefined) ??
      (typeof req.query.key === "string" ? req.query.key : undefined);
    assertVoiceKey(key);
    const q =
      (typeof req.body?.q === "string" ? req.body.q : undefined) ??
      (typeof req.body?.text === "string" ? req.body.text : undefined) ??
      "";
    if (!q.trim()) throw new ValidationError("q/text gerekli");

    const entries = await entryRepository.createManyFromText({ text: q.trim(), source: "siri" });
    res.json(voicePayload(entries));
  } catch (error) {
    next(error);
  }
});

voiceRouter.get("/today", async (req, res, next) => {
  try {
    assertVoiceKey(typeof req.query.key === "string" ? req.query.key : undefined);
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);
    const ranged = await entryRepository.list({
      status: "OPEN",
      rangeStart: start,
      rangeEnd: end,
    });
    const undated = (await entryRepository.list({ status: "OPEN" })).filter(
      (e) => !e.dueAt && !e.startsAt
    );
    const entries = [...ranged, ...undated].slice(0, 12);
    const titles = entries.map((e) => e.title);
    const message =
      entries.length === 0
        ? "Bugün için açık kayıt yok."
        : `Bugün ${entries.length} açık kayıt var: ${titles.join(", ")}.`;

    res.json({
      ok: true,
      message,
      speak: message,
      count: entries.length,
      titles,
    });
  } catch (error) {
    next(error);
  }
});

voiceRouter.get("/complete", async (req, res, next) => {
  try {
    assertVoiceKey(typeof req.query.key === "string" ? req.query.key : undefined);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) throw new ValidationError("q parametresi gerekli (tamamlanacak başlık)");

    const needle = q.toLocaleLowerCase("tr-TR");
    const open = await entryRepository.list({ status: "OPEN" });
    const match =
      open.find((e) => e.title.toLocaleLowerCase("tr-TR") === needle) ??
      open.find((e) => e.title.toLocaleLowerCase("tr-TR").includes(needle)) ??
      open.find((e) => e.rawText.toLocaleLowerCase("tr-TR").includes(needle));

    if (!match) {
      res.json({
        ok: false,
        message: `"${q}" ile eşleşen açık kayıt bulunamadı.`,
        speak: `"${q}" ile eşleşen açık kayıt bulunamadı.`,
      });
      return;
    }

    const updated = await entryRepository.update(match.id, { status: "DONE" });
    const message = `${updated.title} tamamlandı.`;
    res.json({
      ok: true,
      message,
      speak: message,
      title: updated.title,
      id: updated.id,
    });
  } catch (error) {
    next(error);
  }
});
