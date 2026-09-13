import type { EntryKind, EntryStatus, LifeEntry, Stats, Category, ParseHint } from "../types";
import { api } from "./client";

export function fetchEntries(params?: {
  status?: EntryStatus;
  kind?: EntryKind;
  categoryId?: string;
  q?: string;
  rangeStart?: string;
  rangeEnd?: string;
  needsReview?: boolean;
  trashed?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.kind) qs.set("kind", params.kind);
  if (params?.categoryId) qs.set("categoryId", params.categoryId);
  if (params?.q) qs.set("q", params.q);
  if (params?.rangeStart) qs.set("rangeStart", params.rangeStart);
  if (params?.rangeEnd) qs.set("rangeEnd", params.rangeEnd);
  if (params?.needsReview !== undefined) qs.set("needsReview", String(params.needsReview));
  if (params?.trashed) qs.set("trashed", "true");
  const suffix = qs.toString() ? `?${qs}` : "";
  return api.get<{ entries: LifeEntry[] }>(`/api/entries${suffix}`);
}

export function fetchEntry(id: string) {
  return api.get<LifeEntry>(`/api/entries/${id}`);
}

export function ingestEntry(text: string) {
  return api.post<{ entries: LifeEntry[]; count: number }>("/api/entries/ingest", {
    text,
    source: "panel",
  });
}

export function updateEntry(id: string, body: Partial<LifeEntry>) {
  return api.patch<LifeEntry>(`/api/entries/${id}`, body);
}

export function deleteEntry(id: string) {
  return api.delete<void>(`/api/entries/${id}`);
}

export function restoreEntry(id: string) {
  return api.post<LifeEntry>(`/api/entries/${id}/restore`);
}

export function purgeEntry(id: string) {
  return api.delete<void>(`/api/entries/${id}/purge`);
}

export function purgeTrash() {
  return api.delete<{ deleted: number }>("/api/entries/trash");
}

export function snoozeEntry(id: string, amount: "1d" | "1w") {
  return api.post<LifeEntry>(`/api/entries/${id}/snooze`, { amount });
}

export function bulkEntries(body: {
  ids: string[];
  action: "done" | "archive" | "delete" | "category";
  categoryId?: string | null;
}) {
  return api.post<{ updated: number }>("/api/entries/bulk", body);
}

export function fetchAppSettings() {
  return api.get<{
    parserMode: "rules" | "hybrid" | "always_llm";
    parserLlmMinConfidence: number;
    ollamaModel: string;
    ollamaBaseUrl: string;
  }>("/api/settings");
}

export function updateAppSettings(body: {
  parserMode?: "rules" | "hybrid" | "always_llm";
  parserLlmMinConfidence?: number;
  ollamaModel?: string;
}) {
  return api.patch<{
    parserMode: "rules" | "hybrid" | "always_llm";
    parserLlmMinConfidence: number;
    ollamaModel: string;
    ollamaBaseUrl: string;
  }>("/api/settings", body);
}

export function fetchOllamaStatus() {
  return api.get<{
    ok: boolean;
    status: number;
    model: string;
    hasModel?: boolean;
    models: string[];
    error?: string;
  }>("/api/settings/ollama");
}

export function fetchHealth() {
  return api.get<{
    ok: boolean;
    service: string;
    db: string;
    ollama: {
      ok: boolean;
      model: string;
      hasModel: boolean;
      models: string[];
      error?: string;
    };
  }>("/api/health");
}

export function previewParse(text: string) {
  return api.post<{
    text: string;
    needsLlm: boolean;
    parsed: {
      title: string;
      notes: string | null;
      kind: EntryKind;
      status: string;
      priority: string;
      categorySlug: string;
      dueAt: string | null;
      startsAt: string | null;
      endsAt: string | null;
      remindAt: string | null;
      completedAt: string | null;
      confidence: number;
      signals: string[];
      engine: string;
      model: string | null;
      needsReview: boolean;
    };
  }>("/api/parse/preview", { text });
}

export async function downloadBackup(format: "json" | "md" | "csv") {
  const path =
    format === "json"
      ? "/api/backup/export"
      : format === "md"
        ? "/api/backup/export.md"
        : "/api/backup/export.csv";
  const res = await fetch(path);
  if (!res.ok) throw new Error("Dışa aktarım başarısız");
  const blob = await res.blob();
  const ext = format === "json" ? "json" : format === "md" ? "md" : "csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lifetracker-backup.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(body: { mode: "merge" | "replace"; backup: unknown }) {
  return api.post<{
    ok: boolean;
    mode: string;
    categories: number;
    entriesCreated: number;
    hintsCreated: number;
  }>("/api/backup/import", body);
}

export function fetchAutoBackupStatus() {
  return api.get<{
    enabled: boolean;
    dir: string;
    intervalHours: number;
    keep: number;
    lastBackupAt: string | null;
    lastReason: string | null;
    lastZipPath?: string | null;
    lastJsonPath: string | null;
    recent: Array<{ name: string; mtime: string; size: number }>;
    gitPush: {
      enabled: boolean;
      remote: string;
      branch: string;
      lastAt: string | null;
      lastOk: boolean | null;
      lastMessage: string | null;
    };
  }>("/api/backup/auto/status");
}

export function runAutoBackupNow() {
  return api.post<{
    ok: boolean;
    reason: string;
    zipPath?: string;
    jsonPath: string;
    dbIncluded?: boolean;
    dbPath?: string | null;
    exportedAt: string;
    entryCount: number;
    bytesRaw?: number;
    bytesZip?: number;
    skipped?: boolean;
    message?: string;
    gitPush?: {
      ok: boolean;
      skipped?: boolean;
      message: string;
      remote?: string;
      branch?: string;
    };
  }>("/api/backup/auto/now");
}

export type EmailSettings = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  passSet: boolean;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  digestHour: number;
  leadDays: number;
};

export function fetchEmailSettings() {
  return api.get<EmailSettings>("/api/email/settings");
}

export function updateEmailSettings(
  body: Partial<{
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string;
    toEmail: string;
    digestHour: number;
    leadDays: number;
  }>
) {
  return api.patch<EmailSettings>("/api/email/settings", body);
}

export function sendTestEmail() {
  return api.post<{ ok: boolean; messageId?: string }>("/api/email/test");
}

export function sendEmailDigest() {
  return api.post<{
    ok: boolean;
    skipped?: boolean;
    message?: string;
    messageId?: string;
    counts?: { overdue: number; dueSoon: number; reminders: number };
  }>("/api/email/digest");
}

export function fetchCategories(params?: { includeArchived?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.includeArchived) qs.set("archived", "true");
  const suffix = qs.toString() ? `?${qs}` : "";
  return api.get<{ categories: Category[] }>(`/api/categories${suffix}`);
}

export function createCategory(body: { name: string; color?: string; icon?: string | null; slug?: string }) {
  return api.post<Category>("/api/categories", body);
}

export function updateCategory(
  id: string,
  body: { name?: string; color?: string; icon?: string | null; archived?: boolean }
) {
  return api.patch<Category>(`/api/categories/${id}`, body);
}

export function moveCategoryEntriesToGenel(id: string) {
  return api.post<{ moved: number; categoryId: string; categoryName: string }>(
    `/api/categories/${id}/move-to-genel`
  );
}

export function deleteCategory(id: string) {
  return api.delete<void>(`/api/categories/${id}`);
}

export function fetchStats() {
  return api.get<Stats>("/api/entries/stats");
}

export function fetchParseHints(params?: { categoryId?: string; kind?: EntryKind }) {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set("categoryId", params.categoryId);
  if (params?.kind) qs.set("kind", params.kind);
  const suffix = qs.toString() ? `?${qs}` : "";
  return api.get<{ hints: ParseHint[] }>(`/api/parse-hints${suffix}`);
}

export function createParseHint(body: {
  phrase: string;
  kind?: EntryKind | null;
  categoryId?: string | null;
}) {
  return api.post<ParseHint>("/api/parse-hints", body);
}

export function learnParseHint(body: {
  rawText: string;
  kind?: EntryKind | null;
  categoryId?: string | null;
}) {
  return api.post<{ hints: ParseHint[]; count: number }>("/api/parse-hints/learn", body);
}

export function deleteParseHint(id: string) {
  return api.delete<void>(`/api/parse-hints/${id}`);
}
