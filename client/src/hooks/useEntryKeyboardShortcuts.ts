import { useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { useUpdateEntry } from "./useLifeApi";
import { useUiStore } from "../store/uiStore";
import type { EntryPriority, EntryStatus } from "../types";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/**
 * Drawer açıkken (odak input değilse):
 * d=tamamla, o=açık, a=arşiv, x=iptal
 * 1–4 = öncelik (düşük…acil)
 * Esc = kapat (Drawer da dinler)
 */
export function useEntryKeyboardShortcuts() {
  const selectedEntryId = useUiStore((s) => s.selectedEntryId);
  const closeEntry = useUiStore((s) => s.closeEntry);
  const update = useUpdateEntry();
  const toast = useToast();

  useEffect(() => {
    if (!selectedEntryId) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const id = selectedEntryId!;
      const key = e.key.toLowerCase();

      const statusMap: Record<string, EntryStatus> = {
        d: "DONE",
        o: "OPEN",
        a: "ARCHIVED",
        x: "CANCELLED",
      };
      const priorityMap: Record<string, EntryPriority> = {
        "1": "LOW",
        "2": "NORMAL",
        "3": "HIGH",
        "4": "URGENT",
      };

      if (key === "escape") {
        closeEntry();
        return;
      }

      const status = statusMap[key];
      if (status) {
        e.preventDefault();
        void update
          .mutateAsync({ id, status })
          .then(() =>
            toast({
              title: status === "DONE" ? "Tamamlandı" : `Durum: ${status}`,
              status: "success",
              duration: 1200,
            })
          )
          .catch((err) =>
            toast({
              title: err instanceof Error ? err.message : "Hata",
              status: "error",
            })
          );
        return;
      }

      const priority = priorityMap[key];
      if (priority) {
        e.preventDefault();
        void update
          .mutateAsync({ id, priority })
          .then(() =>
            toast({
              title: `Öncelik: ${priority}`,
              status: "success",
              duration: 1200,
            })
          )
          .catch((err) =>
            toast({
              title: err instanceof Error ? err.message : "Hata",
              status: "error",
            })
          );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEntryId, closeEntry, update, toast]);
}
