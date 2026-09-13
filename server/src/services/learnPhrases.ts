const STOPWORDS = new Set([
  "ve",
  "veya",
  "ile",
  "icin",
  "için",
  "bir",
  "bu",
  "şu",
  "o",
  "var",
  "yok",
  "kadar",
  "olan",
  "olarak",
  "gibi",
  "daha",
  "çok",
  "cok",
  "ben",
  "sen",
  "biz",
  "siz",
  "onlar",
  "bugun",
  "bugün",
  "yarin",
  "yarın",
  "haftaya",
  "hafta",
  "gelecek",
  "sonra",
  "önce",
  "once",
  "oldu",
  "olacak",
  "tamamla",
  "bitir",
  "yap",
  "et",
  "de",
  "da",
  "mi",
  "mı",
  "mu",
  "mü",
]);

/** Ham metinden öğrenilecek kısa anahtar kelimeler çıkarır. */
export function extractLearnPhrases(text: string): string[] {
  const normalized = text.toLocaleLowerCase("tr-TR");
  const tokens = normalized
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t) && !/^\d+$/.test(t));

  return [...new Set(tokens)].slice(0, 5);
}
