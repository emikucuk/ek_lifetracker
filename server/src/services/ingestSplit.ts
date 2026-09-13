/**
 * Çoklu yakalama: virgül ve satır sonu ayraçtır.
 * Ondalık koruması: "1,5 kg süt" tek parça kalır (virgülün iki yanı da rakam).
 * Örnek: "toplantı oldu, yarın rapor teslimi" → 2 kayıt.
 */
export function splitIngestTexts(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  const result: string[] = [];

  for (const line of text.split(/\n+/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const chunks = trimmedLine.split(",").map((c) => c.trim());
    let buffer = "";

    for (const chunk of chunks) {
      if (!chunk) continue;
      if (buffer && /\d$/.test(buffer) && /^\d/.test(chunk)) {
        buffer = `${buffer},${chunk}`;
        continue;
      }
      if (buffer) result.push(buffer);
      buffer = chunk;
    }
    if (buffer) result.push(buffer);
  }

  const parts = result.filter((part) => part.length >= 2);
  return parts.length > 0 ? parts : [text];
}
