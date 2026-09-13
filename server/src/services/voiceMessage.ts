const KIND_TR: Record<string, string> = {
  TASK: "görev",
  EVENT: "olay",
  DEADLINE: "son tarih",
  NOTE: "not",
  REMINDER: "hatırlatma",
  IDEA: "fikir",
  OTHER: "kayıt",
};

function speakDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function buildVoiceSpokenMessage(
  entries: Array<{
    title: string;
    kind: string;
    category: { name: string } | null;
    dueAt: Date | null;
    needsReview: boolean;
  }>
): string {
  if (entries.length === 0) return "Hiçbir şey eklenemedi.";

  if (entries.length === 1) {
    const e = entries[0]!;
    const kind = KIND_TR[e.kind] ?? "kayıt";
    const cat = e.category?.name ? `, kategori ${e.category.name}` : "";
    const due = speakDate(e.dueAt);
    const duePart = due ? `, tarih ${due}` : "";
    const review = e.needsReview ? " Gözden geçirmeni öneririm." : "";
    return `${e.title} adlı ${kind} eklendi${cat}${duePart}.${review}`;
  }

  const titles = entries.map((e) => e.title).join(", ");
  const reviewCount = entries.filter((e) => e.needsReview).length;
  const review =
    reviewCount > 0 ? ` ${reviewCount} tanesini gözden geçirmeni öneririm.` : "";
  return `${entries.length} kayıt eklendi: ${titles}.${review}`;
}
