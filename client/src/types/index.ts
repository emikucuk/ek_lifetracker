export type EntryKind =
  | "TASK"
  | "EVENT"
  | "DEADLINE"
  | "NOTE"
  | "REMINDER"
  | "IDEA"
  | "OTHER";

export type EntryStatus = "OPEN" | "DONE" | "CANCELLED" | "ARCHIVED";
export type EntryPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type RecurRule = "DAILY" | "WEEKLY" | "MONTHLY";

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  isSystem: boolean;
  archivedAt?: string | null;
}

export interface LifeEntry {
  id: string;
  rawText: string;
  title: string;
  notes: string | null;
  kind: EntryKind;
  status: EntryStatus;
  priority: EntryPriority;
  source: string;
  dueAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  remindAt: string | null;
  completedAt: string | null;
  parseMeta: string | null;
  needsReview: boolean;
  recurRule: RecurRule | null;
  deletedAt: string | null;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParseHint {
  id: string;
  phrase: string;
  kind: EntryKind | null;
  categoryId: string | null;
  source: string;
  category: Pick<Category, "id" | "name" | "slug" | "color"> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParseMeta {
  confidence?: number;
  signals?: string[];
  categorySlug?: string;
  engine?: "rules" | "ollama" | "hybrid";
  model?: string | null;
}

export interface Stats {
  total: number;
  open: number;
  done: number;
  needsReview?: number;
  trashed?: number;
  byKind: Record<string, number>;
}
