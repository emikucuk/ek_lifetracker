import { entryParserService } from "../src/services/EntryParserService.js";

const NOW = new Date(2026, 8, 13, 15, 0, 0, 0);
const samples = [
  "8 Eylül'de Nida'ya motor aldık",
  "8 Eylül'de Nida'ya motor aldık not olarak kask da aldık",
  "Yarın toplantı var. Not olarak salonu ayırt",
  "Cuma günü havalimanına gideceğim not: terminal 2",
];

for (const s of samples) {
  const r = entryParserService.parse(s, NOW);
  console.log("\n>", s);
  console.log({ title: r.title, notes: r.notes, status: r.status, kind: r.kind });
}
