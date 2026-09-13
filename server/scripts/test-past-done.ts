import { entryParserService } from "../src/services/EntryParserService.js";

const NOW = new Date(2026, 8, 13, 15, 0, 0, 0);
const samples = [
  "8 Eylül'de Nida'ya motor aldık",
  "7 Eylül'de Nida'ya motor aldık",
  "Bugün toplantı oldu",
  "Cuma günü havalimanına gideceğim",
];

for (const s of samples) {
  const r = entryParserService.parse(s, NOW);
  console.log("\n>", s);
  console.log({
    title: r.title,
    kind: r.kind,
    status: r.status,
    startsAt: r.startsAt?.toISOString() ?? null,
    endsAt: r.endsAt?.toISOString() ?? null,
    dueAt: r.dueAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    remindAt: r.remindAt?.toISOString() ?? null,
    needsReview: r.needsReview,
    signals: r.signals.filter((x) => /date:|status:|kind:/.test(x)),
  });
}
