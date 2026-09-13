import { entryParserService } from "../src/services/EntryParserService.js";

/** Fixed "now" so weekday/month examples stay stable in logs */
const NOW = new Date(2026, 8, 13, 14, 30, 0, 0); // 13 Eylül 2026 Pazar

const samples = [
  "7 Eylül'de Nida'ya motor aldık",
  "Cuma günü havalimanına gideceğim",
  "Haftaya cuma proje sunumu var",
  "Bugün toplantı oldu",
  "Haftaya proje teslimi var",
  "16 Eylül'e kadar staja başvur",
  "Bu hafta raporu tamamla",
  "Yarın doktor randevum var",
  "Belirsiz bir şeyler düşünüyorum belki",
];

function summarize(s: string, r: ReturnType<typeof entryParserService.parse>) {
  const when = r.startsAt ?? r.dueAt;
  return {
    title: r.title,
    kind: r.kind,
    priority: r.priority,
    category: r.categorySlug,
    when: when?.toISOString() ?? null,
    remindAt: r.remindAt?.toISOString() ?? null,
    needsReview: r.needsReview,
    confidence: Number(r.confidence.toFixed(2)),
    engine: r.engine,
    notesPreview: r.notes?.split("\n")[0] ?? null,
    signals: r.signals.filter((x) => x.startsWith("date:") || x.startsWith("kind:") || x.startsWith("remind:") || x.startsWith("priority:")).slice(0, 8),
  };
}

console.log("--- rules (fixed now:", NOW.toISOString(), ") ---");
for (const s of samples) {
  const r = entryParserService.parse(s, NOW);
  console.log("\n>", s);
  console.log(summarize(s, r));
}

console.log("\n--- hybrid (async, live now) ---");
for (const s of samples.slice(0, 4)) {
  const r = await entryParserService.parseAsync(s);
  console.log("\n>", s);
  console.log(summarize(s, r));
}
