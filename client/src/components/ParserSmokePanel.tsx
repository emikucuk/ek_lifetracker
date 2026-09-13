import {
  Badge,
  Box,
  Button,
  Code,
  HStack,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { usePreviewParse } from "../hooks/useLifeApi";
import { KIND_LABELS } from "../utils/labels";
import type { EntryKind } from "../types";

const SAMPLES = [
  "7 Eylül'de Nida'ya motor aldık",
  "Cuma günü havalimanına gideceğim",
  "Haftaya cuma proje sunumu var",
  "Bugün toplantı oldu",
  "Haftaya proje teslimi var",
  "Yarın saat 14:30 doktor hatırlat",
  "16 Eylül'e kadar staja başvur",
  "Bu hafta raporu tamamla",
];

export function ParserSmokePanel() {
  const [text, setText] = useState(SAMPLES[2]!);
  const preview = usePreviewParse();
  const toast = useToast();

  async function run(sample?: string) {
    const value = (sample ?? text).trim();
    if (!value) return;
    setText(value);
    try {
      await preview.mutateAsync(value);
    } catch (error) {
      toast({
        title: "Parse başarısız",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  const result = preview.data;

  return (
    <Box className="panel" p={6}>
      <Text fontWeight="700" mb={1}>
        Parser smoke test
      </Text>
      <Text fontSize="sm" color="ink.400" mb={4}>
        Kaydetmez — sadece parse çıktısını gösterir (kurallar / hibrit / Ollama).
      </Text>

      <HStack flexWrap="wrap" spacing={2} mb={3}>
        {SAMPLES.map((s) => (
          <Button key={s} size="xs" variant="outline" onClick={() => void run(s)}>
            {s.slice(0, 28)}
            {s.length > 28 ? "…" : ""}
          </Button>
        ))}
      </HStack>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        bg="white"
        minH="72px"
        mb={3}
      />
      <Button onClick={() => void run()} isLoading={preview.isPending} mb={4}>
        Parse et
      </Button>

      {result && (
        <VStack align="stretch" spacing={2}>
          <HStack flexWrap="wrap" spacing={2}>
            <Badge>{KIND_LABELS[result.parsed.kind as EntryKind] ?? result.parsed.kind}</Badge>
            <Badge variant="outline">{result.parsed.categorySlug}</Badge>
            <Badge colorScheme="purple">{result.parsed.engine}</Badge>
            <Badge>güven {(result.parsed.confidence * 100).toFixed(0)}%</Badge>
            <Badge colorScheme={result.parsed.needsReview ? "orange" : "green"}>
              {result.parsed.needsReview ? "gözden geçir" : "otomatik OK"}
            </Badge>
            <Badge variant="outline">{result.parsed.status}</Badge>
            {result.needsLlm && <Badge colorScheme="orange">LLM adayı</Badge>}
          </HStack>
          <Text fontWeight="700">{result.parsed.title}</Text>
          <Text fontSize="sm" color="ink.500">
            öncelik: {result.parsed.priority} · start: {result.parsed.startsAt ?? "—"} · end:{" "}
            {result.parsed.endsAt ?? "—"} · remind: {result.parsed.remindAt ?? "—"}
          </Text>
          {result.parsed.notes && (
            <Text fontSize="sm" whiteSpace="pre-wrap" color="ink.600">
              {result.parsed.notes}
            </Text>
          )}
          <Code whiteSpace="pre-wrap" p={3} borderRadius="md" fontSize="xs">
            {JSON.stringify(result.parsed.signals, null, 2)}
          </Code>
        </VStack>
      )}
    </Box>
  );
}
