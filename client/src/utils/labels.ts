export const KIND_LABELS: Record<string, string> = {
  TASK: "Görev",
  EVENT: "Olay",
  DEADLINE: "Son tarih",
  NOTE: "Not",
  REMINDER: "Hatırlatma",
  IDEA: "Fikir",
  OTHER: "Diğer",
};

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "Açık",
  DONE: "Tamam",
  CANCELLED: "İptal",
  ARCHIVED: "Arşiv",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export const RECUR_LABELS: Record<string, string> = {
  DAILY: "Her gün",
  WEEKLY: "Her hafta",
  MONTHLY: "Her ay",
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
