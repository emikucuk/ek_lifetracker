import type { EntryKind, EntryPriority, EntryStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { ollamaParseService } from "./OllamaParseService.js";

export type ParseEngine = "rules" | "ollama" | "hybrid";

export interface ParsedEntry {
  title: string;
  notes: string | null;
  kind: EntryKind;
  status: EntryStatus;
  priority: EntryPriority;
  categorySlug: string;
  dueAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  remindAt: Date | null;
  completedAt: Date | null;
  confidence: number;
  signals: string[];
  engine: ParseEngine;
  model?: string;
  /** Parser suggests review only when truly ambiguous */
  needsReview: boolean;
}

const MONTHS: Record<string, number> = {
  ocak: 0,
  şubat: 1,
  subat: 1,
  mart: 2,
  nisan: 3,
  mayıs: 4,
  mayis: 4,
  haziran: 5,
  temmuz: 6,
  ağustos: 7,
  agustos: 7,
  eylül: 8,
  eylul: 8,
  ekim: 9,
  kasım: 10,
  kasim: 10,
  aralık: 11,
  aralik: 11,
};

/** JS getDay(): 0=Sun … 6=Sat */
const WEEKDAYS: Array<{ names: string[]; day: number }> = [
  { names: ["pazar"], day: 0 },
  { names: ["pazartesi"], day: 1 },
  { names: ["salı", "sali"], day: 2 },
  { names: ["çarşamba", "carsamba"], day: 3 },
  { names: ["perşembe", "persembe"], day: 4 },
  { names: ["cuma"], day: 5 },
  { names: ["cumartesi"], day: 6 },
];

const CATEGORY_KEYWORDS: Array<{ slug: string; words: string[] }> = [
  {
    slug: "is",
    words: [
      "iş",
      "is",
      "proje",
      "teslim",
      "toplantı",
      "toplanti",
      "müşteri",
      "musteri",
      "ofis",
      "deadline",
      "sunum",
      "rapor",
      "başvur",
      "basvur",
      "mülakat",
      "mulakat",
    ],
  },
  {
    slug: "okul",
    words: ["okul", "ders", "ödev", "odev", "sınav", "sinav", "üniversite", "universite", "tez"],
  },
  {
    slug: "saglik",
    words: ["sağlık", "saglik", "doktor", "hastane", "ilaç", "ilac", "spor", "egzersiz", "diyet", "randevu"],
  },
  {
    slug: "finans",
    words: [
      "para",
      "fatura",
      "ödeme",
      "odeme",
      "maaş",
      "maas",
      "borç",
      "borc",
      "kredi",
      "alışveriş",
      "alisveris",
      "banka",
      "aldık",
      "aldım",
      "sattık",
      "motor",
      "araba",
    ],
  },
  {
    slug: "sosyal",
    words: ["arkadaş", "arkadas", "aile", "doğum günü", "dogum gunu", "davet", "parti", "buluş", "bulus"],
  },
  {
    slug: "ev",
    words: ["ev", "temizlik", "market", "tamir", "kira", "eşya", "esya"],
  },
  {
    slug: "kisisel",
    words: [
      "ben",
      "hedef",
      "alışkanlık",
      "aliskanlik",
      "günlük",
      "gunluk",
      "hatırla",
      "hatirla",
      "havaliman",
      "uçak",
      "ucak",
      "seyahat",
      "tatil",
    ],
  },
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function atHour(d: Date, h: number, m = 0): Date {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Next occurrence of weekday; if today matches and allowToday, return today. */
function upcomingWeekday(from: Date, weekday: number, allowToday: boolean): Date {
  const x = startOfDay(from);
  let delta = (weekday - x.getDay() + 7) % 7;
  if (delta === 0 && !allowToday) delta = 7;
  return addDays(x, delta);
}

function nextWeekMonday(from: Date): Date {
  const x = startOfDay(from);
  const delta = (1 - x.getDay() + 7) % 7 || 7;
  return addDays(x, delta);
}

function isPastTense(normalized: string): boolean {
  return /(oldu|yaşandı|yasandi|gerçekleşti|gerceklesti|aldık|aldik|aldım|aldim|aldı|aldi|sattık|sattik|sattım|sattim|gittik|gittim|gitti|yaptık|yaptik|yaptım|yaptim|yaptı|yapti|geldik|geldim|geldi|buluştuk|bulustuk|görüştük|gorustuk|ettik|ettim|etti|bitirdik|bitirdim|bitirdi|tamamladık|tamamladik|tamamladım|tamamladim|verdik|verdim|verdi|çıktık|ciktik|çıktım|ciktim|konuştuk|konustuk)\b/.test(
    normalized
  );
}

function isFutureTense(normalized: string): boolean {
  return /(olacak|gideceğim|gidecegim|yapacağım|yapacagim|edeceğim|edecegim|gelecek|planlıyorum|planliyorum|hatırlat|hatirlat)\b/.test(
    normalized
  );
}

function cleanTitle(text: string): string {
  return text
    .replace(
      /^(bugün|bugun|yarın|yarin|haftaya|bu hafta|gelecek hafta|pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)\s+(günü\s+|gunu\s+)?/i,
      ""
    )
    .replace(
      /\b\d{1,2}\s+(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)(?:['’][a-zçğıöşü]*)?(?:\s+\d{4})?\b/gi,
      ""
    )
    .replace(/\b\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\b/g, "")
    .replace(/^\s*(['’]?[aei]\s+)?kadar\s+/i, "")
    .replace(/\b(var|oldu|olacak|hatırlat|hatirlat)\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function detectKind(
  normalized: string,
  signals: string[],
  userKindHints: Array<{ phrase: string; kind: EntryKind }> = []
): EntryKind {
  const sorted = [...userKindHints].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const hint of sorted) {
    if (normalized.includes(hint.phrase)) {
      signals.push(`kind:learned:${hint.phrase}`);
      return hint.kind;
    }
  }
  if (isPastTense(normalized)) {
    signals.push("kind:event-past");
    return "EVENT";
  }
  if (/(teslim|deadline|son gün|son gun|kadar|başvur|basvur|bitmeden)/.test(normalized)) {
    signals.push("kind:deadline");
    return "DEADLINE";
  }
  if (/(hatırlat|hatirlat|unutma|reminder)/.test(normalized)) {
    signals.push("kind:reminder");
    return "REMINDER";
  }
  if (/(fikir|idea|belki|düşün|dusun)/.test(normalized)) {
    signals.push("kind:idea");
    return "IDEA";
  }
  if (/(görev|gorev|tamamla|yapılacak|yapilacak|bitir|yapmam|yapmalıyım|yapmaliyim)/.test(normalized)) {
    signals.push("kind:task");
    return "TASK";
  }
  if (
    /(olacak|toplantı|toplanti|randevu|buluş|bulus|gideceğim|gidecegim|havaliman|uçuş|ucus|sunum|görüşme|goruşme|gorusme)/.test(
      normalized
    )
  ) {
    signals.push("kind:event");
    return "EVENT";
  }
  // Weekday + “var/olacak” without other kind cues → treat as scheduled event
  if (
    WEEKDAYS.some((w) => w.names.some((n) => normalized.includes(n))) &&
    /\b(var|olacak)\b/.test(normalized)
  ) {
    signals.push("kind:event-weekday");
    return "EVENT";
  }
  signals.push("kind:note-default");
  return "NOTE";
}

function detectPriority(
  normalized: string,
  kind: EntryKind,
  dueAt: Date | null,
  now: Date,
  signals: string[],
  pastEvent: boolean
): EntryPriority {
  if (/(acil|urgent|hemen|kritik)/.test(normalized)) {
    signals.push("priority:urgent");
    return "URGENT";
  }
  if (/(önemli|onemli|high|yüksek|yuksek|havaliman|uçak|ucak|sınav|sinav|mülakat|mulakat)/.test(normalized)) {
    signals.push("priority:high");
    return "HIGH";
  }
  if (/(düşük|dusuk|low|önemsiz|onemsiz)/.test(normalized)) {
    signals.push("priority:low");
    return "LOW";
  }
  if (!pastEvent && dueAt && (kind === "DEADLINE" || kind === "TASK" || kind === "EVENT")) {
    const days = (startOfDay(dueAt).getTime() - startOfDay(now).getTime()) / 86400000;
    if (days >= 0 && days <= 1) {
      signals.push("priority:due-soon-high");
      return "HIGH";
    }
    if (days >= 0 && days <= 3 && kind === "DEADLINE") {
      signals.push("priority:deadline-near");
      return "HIGH";
    }
  }
  return "NORMAL";
}

function detectCategory(
  normalized: string,
  signals: string[],
  userCategoryHints: Array<{ phrase: string; slug: string }> = []
): string {
  const sorted = [...userCategoryHints].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const hint of sorted) {
    if (normalized.includes(hint.phrase)) {
      signals.push(`category:learned:${hint.slug}:${hint.phrase}`);
      return hint.slug;
    }
  }
  for (const cat of CATEGORY_KEYWORDS) {
    if (cat.words.some((w) => normalized.includes(w))) {
      signals.push(`category:${cat.slug}`);
      return cat.slug;
    }
  }
  signals.push("category:genel");
  return "genel";
}

function detectTime(
  normalized: string,
  signals: string[]
): { hours: number; minutes: number } | null {
  const withSaat = normalized.match(/\bsaat\s+(\d{1,2})(?:[:.](\d{2}))?\b/);
  if (withSaat) {
    const hours = Number(withSaat[1]);
    const minutes = withSaat[2] ? Number(withSaat[2]) : 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      signals.push("time:saat");
      return { hours, minutes };
    }
  }

  const clock = normalized.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      signals.push("time:clock");
      return { hours, minutes };
    }
  }

  if (/\b(öğleden sonra|ogleden sonra|akşam|aksam)\b/.test(normalized)) {
    signals.push("time:afternoon");
    return { hours: 15, minutes: 0 };
  }
  if (/\b(sabah|kuşluk|kusluk)\b/.test(normalized)) {
    signals.push("time:morning");
    return { hours: 9, minutes: 0 };
  }
  if (/\b(öğle|ogle|öğlen|oglen)\b/.test(normalized)) {
    signals.push("time:noon");
    return { hours: 12, minutes: 0 };
  }

  return null;
}

function detectWeekday(
  normalized: string,
  now: Date,
  signals: string[],
  preferNextWeek: boolean
): Date | null {
  for (const wd of WEEKDAYS) {
    if (wd.names.some((n) => normalized.includes(n))) {
      const allowToday = isFutureTense(normalized) || !isPastTense(normalized);
      let day = upcomingWeekday(now, wd.day, allowToday && !preferNextWeek);
      if (preferNextWeek) {
        const monday = nextWeekMonday(now);
        day = upcomingWeekday(monday, wd.day, true);
      }
      signals.push(`date:weekday:${wd.names[0]}`);
      return day;
    }
  }
  return null;
}

function resolveNamedCalendarDay(
  day: number,
  month: number,
  year: number | null,
  now: Date,
  pastEvent: boolean
): Date {
  let y = year ?? now.getFullYear();
  let d = new Date(y, month, day, 12, 0, 0, 0);
  if (year == null) {
    if (pastEvent) {
      // Past narrative → most recent occurrence (this year if already passed, else last year)
      if (d > endOfDay(now)) {
        d = new Date(y - 1, month, day, 12, 0, 0, 0);
      }
    } else {
      // Future / neutral → next occurrence
      if (d < startOfDay(now)) {
        d = new Date(y + 1, month, day, 12, 0, 0, 0);
      }
    }
  }
  return d;
}

function detectDates(
  text: string,
  normalized: string,
  now: Date,
  signals: string[],
  kind: EntryKind
): { dueAt: Date | null; startsAt: Date | null; endsAt: Date | null; remindAt: Date | null } {
  let dueAt: Date | null = null;
  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  let remindAt: Date | null = null;
  const pastEvent = kind === "EVENT" && isPastTense(normalized);
  const preferNextWeek = /\bhaftaya\b|\bgelecek hafta\b/.test(normalized);

  if (/\bbugün\b|\bbugun\b/.test(normalized)) {
    startsAt = startOfDay(now);
    endsAt = endOfDay(now);
    dueAt = pastEvent ? atHour(now, 12) : endOfDay(now);
    signals.push("date:today");
  } else if (/\byarın\b|\byarin\b/.test(normalized)) {
    const d = addDays(now, 1);
    startsAt = startOfDay(d);
    endsAt = endOfDay(d);
    dueAt = endOfDay(d);
    signals.push("date:tomorrow");
  } else if (preferNextWeek && !WEEKDAYS.some((w) => w.names.some((n) => normalized.includes(n)))) {
    const start = nextWeekMonday(now);
    startsAt = start;
    endsAt = endOfDay(addDays(start, 6));
    dueAt = endsAt;
    signals.push("date:next-week");
  } else if (/\bbu hafta\b/.test(normalized)) {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = startOfDay(addDays(now, mondayOffset));
    startsAt = monday;
    endsAt = endOfDay(addDays(monday, 6));
    dueAt = endsAt;
    signals.push("date:this-week");
  }

  const weekdayDate = detectWeekday(normalized, now, signals, preferNextWeek);
  if (weekdayDate) {
    startsAt = startOfDay(weekdayDate);
    endsAt = endOfDay(weekdayDate);
    dueAt = endOfDay(weekdayDate);
  }

  const named = text.match(
    /(\d{1,2})\s+(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)(?:['’]?[a-zçğıöşü]*)?(?:\s+(\d{4}))?/i
  );
  if (named) {
    const day = Number(named[1]);
    const monthKey = named[2]!.toLocaleLowerCase("tr-TR");
    const month = MONTHS[monthKey];
    if (month != null) {
      const year = named[3] ? Number(named[3]) : null;
      const d = resolveNamedCalendarDay(day, month, year, now, pastEvent);
      startsAt = startOfDay(d);
      endsAt = endOfDay(d);
      dueAt = pastEvent ? atHour(d, 12) : endOfDay(d);
      signals.push(pastEvent ? "date:named-past" : "date:named");
    }
  }

  const numeric = text.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/);
  if (numeric && !named) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : null;
    const d = resolveNamedCalendarDay(day, month, year, now, pastEvent);
    startsAt = startOfDay(d);
    endsAt = endOfDay(d);
    dueAt = pastEvent ? atHour(d, 12) : endOfDay(d);
    signals.push(pastEvent ? "date:numeric-past" : "date:numeric");
  }

  const time = detectTime(normalized, signals);
  if (time) {
    const dayBase = startsAt ?? dueAt ?? now;
    const timed = atHour(dayBase, time.hours, time.minutes);
    remindAt = timed;
    if (
      /(hatırlat|hatirlat|unutma|reminder|randevu|toplantı|toplanti|gideceğim|gidecegim)/.test(
        normalized
      ) ||
      kind === "EVENT" ||
      kind === "REMINDER"
    ) {
      startsAt = timed;
      dueAt = timed;
      endsAt = timed;
      signals.push("time:pinned-dates");
    }
  } else if (
    (kind === "EVENT" || kind === "TASK") &&
    startsAt &&
    !pastEvent &&
    !time &&
    // Don't collapse multi-day ranges (bu hafta / haftaya) to Monday 09:00
    !signals.some((s) => s === "date:this-week" || s === "date:next-week")
  ) {
    startsAt = atHour(startsAt, 9, 0);
    dueAt = startsAt;
    signals.push("time:default-09");
  }

  return { dueAt, startsAt, endsAt, remindAt };
}

function autoRemind(
  kind: EntryKind,
  dueAt: Date | null,
  startsAt: Date | null,
  existing: Date | null,
  pastEvent: boolean,
  now: Date,
  signals: string[]
): Date | null {
  if (existing) return existing;
  if (pastEvent) {
    signals.push("remind:skip-past");
    return null;
  }

  const anchor =
    kind === "DEADLINE" || kind === "TASK" ? (dueAt ?? startsAt) : (startsAt ?? dueAt);
  if (!anchor) {
    if (kind === "REMINDER") {
      const r = new Date(now.getTime() + 60 * 60 * 1000);
      signals.push("remind:plus-1h");
      return r;
    }
    return null;
  }

  if (kind === "DEADLINE" || kind === "TASK") {
    const morning = atHour(anchor, 9, 0);
    const dayBefore = atHour(addDays(anchor, -1), 18, 0);
    let pick = dayBefore > now ? dayBefore : morning > now ? morning : null;
    if (!pick && startOfDay(anchor).getTime() === startOfDay(now).getTime()) {
      const soon = new Date(now.getTime() + 60 * 60 * 1000);
      if (soon <= endOfDay(now)) {
        pick = soon;
        signals.push("remind:today-soon");
        return pick;
      }
    }
    if (pick) signals.push(kind === "DEADLINE" ? "remind:deadline" : "remind:task");
    return pick;
  }

  if (kind === "EVENT" || kind === "REMINDER") {
    const oneHourBefore = new Date(anchor.getTime() - 60 * 60 * 1000);
    const morning = atHour(anchor, 8, 0);
    const pick =
      oneHourBefore > now
        ? oneHourBefore
        : morning > now && morning < anchor
          ? morning
          : anchor > now
            ? anchor
            : null;
    if (pick) signals.push("remind:event");
    return pick;
  }

  return null;
}

function splitBodyAndNotes(raw: string): { body: string; notes: string | null } {
  const text = raw.trim();
  // Siri / panel: "... not olarak …" → sonrası notes
  const marker =
    /\b(?:not\s+olarak|yorum\s+olarak|notu?\s*ekle|not\s+ekle)\s*[:\-–—]?\s*/iu;
  const match = marker.exec(text);
  if (!match || match.index == null) {
    // "Not: …" / "Notu: …" satır sonu veya cümle içi
    const colon = /\bnotu?\s*:\s+/iu.exec(text);
    if (!colon || colon.index == null) {
      return { body: text, notes: null };
    }
    const body = text.slice(0, colon.index).replace(/[,.\s]+$/u, "").trim();
    const notes = text.slice(colon.index + colon[0].length).trim();
    return {
      body: body || text,
      notes: notes ? capitalizeNote(notes) : null,
    };
  }

  const body = text.slice(0, match.index).replace(/[,.\s]+$/u, "").trim();
  const notes = text.slice(match.index + match[0].length).trim();
  return {
    body: body || text,
    notes: notes ? capitalizeNote(notes) : null,
  };
}

function capitalizeNote(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return t;
  return t.replace(/^./u, (c) => c.toLocaleUpperCase("tr-TR"));
}

function resolvePastEventDates(dates: {
  dueAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
}): { dueAt: Date | null; startsAt: Date | null; endsAt: Date | null; completedAt: Date } {
  const day = dates.startsAt ?? dates.dueAt ?? new Date();
  const startsAt = startOfDay(day);
  const endsAt = endOfDay(day);
  const dueAt = atHour(day, 12, 0);
  return { dueAt, startsAt, endsAt, completedAt: dueAt };
}

function detectStatus(
  normalized: string,
  kind: EntryKind,
  pastEvent: boolean,
  signals: string[]
): EntryStatus {
  if (pastEvent) {
    signals.push("status:done-past");
    return "DONE";
  }
  if (
    kind === "TASK" &&
    /(tamamladık|tamamladik|tamamladım|tamamladim|bitirdik|bitirdim|bitirdi|yaptık|yaptik|yaptım|yaptim)\b/.test(
      normalized
    )
  ) {
    signals.push("status:done-task");
    return "DONE";
  }
  return "OPEN";
}

function computeNeedsReview(parsed: Omit<ParsedEntry, "needsReview">): boolean {
  if (parsed.signals.includes("force-review")) return true;
  if (parsed.status === "DONE" && (parsed.dueAt || parsed.startsAt)) return false;
  if (parsed.confidence < 0.5) return true;
  const dated = Boolean(parsed.dueAt || parsed.startsAt);
  if (!dated && (parsed.kind === "DEADLINE" || parsed.kind === "REMINDER")) return true;
  if (
    parsed.kind === "NOTE" &&
    parsed.signals.includes("kind:note-default") &&
    !dated &&
    parsed.confidence < 0.7
  ) {
    return true;
  }
  if (parsed.signals.includes("llm:unavailable") && !dated && parsed.confidence < 0.6) {
    return true;
  }
  return false;
}

export type UserParseHints = {
  kindHints: Array<{ phrase: string; kind: EntryKind }>;
  categoryHints: Array<{ phrase: string; slug: string }>;
};

export class EntryParserService {
  parse(rawText: string, now = new Date(), hints?: UserParseHints): ParsedEntry {
    const original = rawText.trim();
    const { body, notes: userNotes } = splitBodyAndNotes(original);
    const text = body.trim() || original;
    const normalized = text.toLocaleLowerCase("tr-TR");
    const signals: string[] = [];
    if (userNotes) signals.push("notes:user-dictated");

    const kind = detectKind(normalized, signals, hints?.kindHints);
    const categorySlug = detectCategory(normalized, signals, hints?.categoryHints);
    const { dueAt, startsAt, endsAt, remindAt } = detectDates(
      text,
      normalized,
      now,
      signals,
      kind
    );
    const pastEvent = kind === "EVENT" && isPastTense(normalized);
    const status = detectStatus(normalized, kind, pastEvent, signals);
    let finalDue = dueAt;
    let finalStarts = startsAt;
    let finalEnds = endsAt;
    let completedAt: Date | null = null;
    if (status === "DONE") {
      if (dueAt || startsAt) {
        const fixed = resolvePastEventDates({ dueAt, startsAt, endsAt });
        finalDue = fixed.dueAt;
        finalStarts = fixed.startsAt;
        finalEnds = fixed.endsAt;
        completedAt = fixed.completedAt;
        signals.push("date:past-normalized");
      } else {
        completedAt = now;
        signals.push("date:completed-undated");
      }
    }
    const priority = detectPriority(normalized, kind, finalDue, now, signals, pastEvent);
    const finalRemind = autoRemind(kind, finalDue, finalStarts, remindAt, pastEvent || status === "DONE", now, signals);

    let confidence = 0.5;
    confidence += Math.min(signals.length * 0.06, 0.35);
    if (finalDue || finalStarts) confidence += 0.15;
    if (finalRemind) confidence += 0.05;
    if (signals.some((s) => s.includes(":learned:"))) confidence += 0.12;
    if (signals.some((s) => s.startsWith("date:"))) confidence += 0.08;
    if (kind !== "NOTE") confidence += 0.05;
    if (status === "DONE") confidence += 0.05;
    confidence = Math.min(confidence, 0.98);

    const title = cleanTitle(text) || text;

    const base = {
      title,
      notes: userNotes,
      kind,
      status,
      priority,
      categorySlug,
      dueAt: finalDue,
      startsAt: finalStarts,
      endsAt: finalEnds,
      remindAt: finalRemind,
      completedAt,
      confidence,
      signals,
      engine: "rules" as const,
    };

    return { ...base, needsReview: computeNeedsReview(base) };
  }

  needsLlm(parsed: ParsedEntry, minConfidence = env.parserLlmMinConfidence): boolean {
    if (parsed.signals.some((s) => s.includes(":learned:"))) return false;
    if (parsed.signals.some((s) => s.startsWith("date:named") || s.startsWith("date:weekday"))) {
      return false;
    }
    if (parsed.confidence < minConfidence) return true;
    if (!parsed.dueAt && !parsed.startsAt && parsed.kind !== "NOTE" && parsed.kind !== "IDEA") {
      return true;
    }
    if (parsed.kind === "NOTE" && parsed.signals.includes("kind:note-default") && !parsed.dueAt) {
      return true;
    }
    return false;
  }

  async loadUserHints(): Promise<UserParseHints> {
    const { parseHintRepository } = await import("../repositories/ParseHintRepository.js");
    const rows = await parseHintRepository.listForParser();
    const kindHints: UserParseHints["kindHints"] = [];
    const categoryHints: UserParseHints["categoryHints"] = [];
    for (const row of rows) {
      const phrase = row.phrase.toLocaleLowerCase("tr-TR");
      if (row.kind) kindHints.push({ phrase, kind: row.kind });
      if (row.category?.slug) categoryHints.push({ phrase, slug: row.category.slug });
    }
    return { kindHints, categoryHints };
  }

  async parseAsync(rawText: string, now = new Date()): Promise<ParsedEntry> {
    const { settingsService } = await import("./SettingsService.js");
    const runtime = await settingsService.getParserRuntime();
    const hints = await this.loadUserHints();
    const rules = this.parse(rawText, now, hints);

    if (runtime.parserMode === "rules") {
      return rules;
    }

    const shouldLlm =
      runtime.parserMode === "always_llm" ||
      this.needsLlm(rules, runtime.parserLlmMinConfidence);

    if (!shouldLlm) {
      return rules;
    }

    const llm = await ollamaParseService.parse(rawText, now, runtime.ollamaModel);
    if (!llm) {
      const failed = {
        ...rules,
        signals: [...rules.signals, "llm:unavailable"],
        confidence: Math.min(rules.confidence, 0.65),
      };
      return { ...failed, needsReview: computeNeedsReview(failed) };
    }

    const normalized = rawText.toLocaleLowerCase("tr-TR");
    const kind = llm.kind ?? rules.kind;
    const pastEvent = kind === "EVENT" && isPastTense(normalized);
    const mergeSignals = [...rules.signals, "llm:merged"];
    const status =
      llm.status ??
      (pastEvent ? "DONE" : rules.status) ??
      detectStatus(normalized, kind, pastEvent, mergeSignals);

    // Prefer concrete LLM dates; never let null wipe a rule-derived date
    let mergedDue = llm.dueAt ?? rules.dueAt;
    let mergedStarts = llm.startsAt ?? rules.startsAt;
    let mergedEnds = llm.endsAt ?? rules.endsAt;
    let mergedRemind = llm.remindAt ?? rules.remindAt;
    let completedAt = rules.completedAt;

    if (status === "DONE" || pastEvent) {
      if (mergedDue || mergedStarts) {
        const fixed = resolvePastEventDates({
          dueAt: mergedDue,
          startsAt: mergedStarts,
          endsAt: mergedEnds,
        });
        mergedDue = fixed.dueAt;
        mergedStarts = fixed.startsAt;
        mergedEnds = fixed.endsAt;
        completedAt = fixed.completedAt;
        mergeSignals.push("date:past-normalized");
      } else {
        completedAt = now;
        mergeSignals.push("date:completed-undated");
      }
      mergedRemind = null;
    } else {
      mergedRemind = autoRemind(
        kind,
        mergedDue,
        mergedStarts,
        mergedRemind,
        false,
        now,
        mergeSignals
      );
    }

    const priority = llm.priority ?? rules.priority;
    const categorySlug = llm.categorySlug ?? rules.categorySlug;
    const title = llm.title || rules.title;
    // Notlar yalnızca kullanıcı "not olarak / not:" dediyse (kurallar); LLM yorum üretmez
    const notes = rules.notes;

    const merged: Omit<ParsedEntry, "needsReview"> = {
      title,
      notes,
      kind,
      status,
      priority,
      categorySlug,
      dueAt: mergedDue,
      startsAt: mergedStarts,
      endsAt: mergedEnds,
      remindAt: mergedRemind,
      completedAt,
      confidence: Math.min(Math.max(rules.confidence, 0.82), 0.98),
      signals: mergeSignals,
      engine: "hybrid",
      model: llm.model,
    };

    return { ...merged, needsReview: computeNeedsReview(merged) };
  }
}

export const entryParserService = new EntryParserService();
