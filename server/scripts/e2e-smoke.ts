/**
 * Minimal API smoke: health → ingest → list → patch → soft-delete.
 * Usage: API_URL=http://127.0.0.1:3081 npx tsx scripts/e2e-smoke.ts
 */
const base = (process.env.API_URL || "http://127.0.0.1:3081").replace(/\/$/, "");

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  return body as Record<string, unknown>;
}

async function main() {
  console.log(`Smoke against ${base}`);

  const health = await req("/api/health");
  if (!health.ok) throw new Error("health.ok !== true");
  console.log("✓ health", { db: health.db, ollama: (health.ollama as { ok?: boolean })?.ok });

  const marker = `smoke-${Date.now()}`;
  const ingest = await req("/api/entries/ingest", {
    method: "POST",
    body: JSON.stringify({ text: `${marker} yarın saat 10:00 doktor hatırlat`, source: "smoke" }),
  });
  const entries = ingest.entries as Array<{ id: string; title: string }>;
  if (!entries?.length) throw new Error("ingest returned no entries");
  const id = entries[0]!.id;
  console.log("✓ ingest", entries[0]!.title);

  const list = await req(`/api/entries?q=${encodeURIComponent(marker)}`);
  const found = (list.entries as Array<{ id: string }>).some((e) => e.id === id);
  if (!found) throw new Error("list did not find ingested entry");
  console.log("✓ list");

  const patched = await req(`/api/entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ priority: "HIGH", needsReview: false }),
  });
  if ((patched as { priority?: string }).priority !== "HIGH") {
    throw new Error("patch priority failed");
  }
  console.log("✓ patch");

  await req(`/api/entries/${id}`, { method: "DELETE" });
  console.log("✓ soft-delete");

  console.log("PASS");
}

main().catch((err) => {
  console.error("FAIL", err instanceof Error ? err.message : err);
  process.exit(1);
});
