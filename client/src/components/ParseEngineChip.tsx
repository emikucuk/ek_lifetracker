import { Badge } from "@chakra-ui/react";
import type { ParseMeta } from "../types";

const ENGINE_LABEL: Record<string, string> = {
  rules: "kurallar",
  ollama: "ollama",
  hybrid: "hibrit",
};

export function parseEngineLabel(parseMeta: string | null | undefined): string | null {
  if (!parseMeta) return null;
  try {
    const meta = JSON.parse(parseMeta) as ParseMeta;
    if (!meta.engine) return null;
    return ENGINE_LABEL[meta.engine] ?? meta.engine;
  } catch {
    return null;
  }
}

export function ParseEngineChip({ parseMeta }: { parseMeta: string | null | undefined }) {
  const label = parseEngineLabel(parseMeta);
  if (!label) return null;
  return (
    <Badge variant="subtle" colorScheme="gray" fontSize="0.65rem" fontWeight="700">
      {label}
    </Badge>
  );
}
