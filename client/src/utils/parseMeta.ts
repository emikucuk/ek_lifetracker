import type { ParseMeta } from "../types";

export function parseParseMeta(raw: string | null | undefined): ParseMeta | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParseMeta;
  } catch {
    return null;
  }
}
