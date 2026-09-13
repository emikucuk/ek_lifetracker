import { useEffect, useRef } from "react";
import { useEntries } from "./useLifeApi";
import { getNotificationsEnabled } from "../components/HealthPanel";
import { useUiStore } from "../store/uiStore";

/**
 * Panel açıkken `remindAt` zamanı gelen OPEN kayıtlar için tarayıcı bildirimi.
 */
export function useReminderNotifications() {
  const { data } = useEntries({ status: "OPEN" });
  const openEntry = useUiStore((s) => s.openEntry);
  const fired = useRef(new Set<string>());

  useEffect(() => {
    if (!("Notification" in window)) return;

    const tick = () => {
      if (!getNotificationsEnabled()) return;
      if (Notification.permission !== "granted") return;

      const now = Date.now();
      for (const entry of data?.entries ?? []) {
        if (!entry.remindAt) continue;
        const t = new Date(entry.remindAt).getTime();
        if (Number.isNaN(t)) continue;
        // Fire in a 2-minute window after remindAt
        if (t > now || now - t > 2 * 60_000) continue;
        if (fired.current.has(entry.id)) continue;
        fired.current.add(entry.id);
        const n = new Notification(entry.title, {
          body: entry.category?.name
            ? `${entry.category.name} · hatırlatma`
            : "Hatırlatma zamanı",
          tag: entry.id,
        });
        n.onclick = () => {
          window.focus();
          openEntry(entry.id);
        };
      }
    };

    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, [data?.entries, openEntry]);
}
