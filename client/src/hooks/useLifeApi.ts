import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteEntry,
  restoreEntry,
  purgeEntry,
  purgeTrash,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategoryEntriesToGenel,
  fetchEntries,
  fetchEntry,
  fetchStats,
  ingestEntry,
  updateEntry,
  fetchParseHints,
  createParseHint,
  learnParseHint,
  deleteParseHint,
  snoozeEntry,
  bulkEntries,
  fetchAppSettings,
  updateAppSettings,
  fetchOllamaStatus,
  fetchHealth,
  previewParse,
  fetchAutoBackupStatus,
  runAutoBackupNow,
  fetchEmailSettings,
  updateEmailSettings,
  sendTestEmail,
  sendEmailDigest,
  importBackup,
} from "../api/life";
import type { EntryKind, EntryStatus, LifeEntry } from "../types";

export function useEntries(params?: {
  status?: EntryStatus;
  kind?: EntryKind;
  categoryId?: string;
  q?: string;
  rangeStart?: string;
  rangeEnd?: string;
  needsReview?: boolean;
  trashed?: boolean;
}) {
  return useQuery({
    queryKey: ["entries", params],
    queryFn: () => fetchEntries(params),
  });
}

export function useEntry(id: string | null) {
  return useQuery({
    queryKey: ["entries", "detail", id],
    queryFn: () => fetchEntry(id!),
    enabled: Boolean(id),
  });
}

export function useCategories(params?: { includeArchived?: boolean }) {
  return useQuery({
    queryKey: ["categories", params],
    queryFn: () => fetchCategories(params),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color?: string; icon?: string | null; slug?: string }) =>
      createCategory(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      color?: string;
      icon?: string | null;
      archived?: boolean;
    }) => updateCategory(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useMoveCategoryToGenel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => moveCategoryEntriesToGenel(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });
}

export function useIngestEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => ingestEntry(text),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<LifeEntry>) =>
      updateEntry(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useRestoreEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreEntry(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function usePurgeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purgeEntry(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function usePurgeTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => purgeTrash(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useParseHints(params?: { categoryId?: string; kind?: EntryKind }) {
  return useQuery({
    queryKey: ["parse-hints", params],
    queryFn: () => fetchParseHints(params),
  });
}

export function useCreateParseHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phrase: string; kind?: EntryKind | null; categoryId?: string | null }) =>
      createParseHint(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["parse-hints"] });
    },
  });
}

export function useLearnParseHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      rawText: string;
      kind?: EntryKind | null;
      categoryId?: string | null;
    }) => learnParseHint(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["parse-hints"] });
    },
  });
}

export function useDeleteParseHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteParseHint(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["parse-hints"] });
    },
  });
}

export function useSnoozeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: "1d" | "1w" }) => snoozeEntry(id, amount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useBulkEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      ids: string[];
      action: "done" | "archive" | "delete" | "category";
      categoryId?: string | null;
    }) => bulkEntries(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchAppSettings,
  });
}

export function useUpdateAppSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateAppSettings,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useOllamaStatus(enabled = true) {
  return useQuery({
    queryKey: ["settings", "ollama"],
    queryFn: fetchOllamaStatus,
    enabled,
    refetchInterval: 30_000,
  });
}

export function useHealth(enabled = true) {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    enabled,
    refetchInterval: 30_000,
  });
}

export function usePreviewParse() {
  return useMutation({
    mutationFn: (text: string) => previewParse(text),
  });
}

export function useAutoBackupStatus() {
  return useQuery({
    queryKey: ["backup", "auto"],
    queryFn: fetchAutoBackupStatus,
    refetchInterval: 60_000,
  });
}

export function useRunAutoBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => runAutoBackupNow(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["backup", "auto"] });
    },
  });
}

export function useEmailSettings() {
  return useQuery({
    queryKey: ["email", "settings"],
    queryFn: fetchEmailSettings,
  });
}

export function useUpdateEmailSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateEmailSettings,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["email", "settings"] });
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: () => sendTestEmail(),
  });
}

export function useSendEmailDigest() {
  return useMutation({
    mutationFn: () => sendEmailDigest(),
  });
}

export function useImportBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mode: "merge" | "replace"; backup: unknown }) => importBackup(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["parse-hints"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
