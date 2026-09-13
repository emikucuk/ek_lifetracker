import {
  Badge,
  Box,
  Button,
  HStack,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEntry, useUpdateEntry } from "../hooks/useLifeApi";
import { useUiStore } from "../store/uiStore";
import { formatDateTime, KIND_LABELS } from "../utils/labels";
import { parseParseMeta } from "../utils/parseMeta";

export function IngestConfirmBar() {
  const pendingConfirmIds = useUiStore((s) => s.pendingConfirmIds);
  const advancePendingConfirm = useUiStore((s) => s.advancePendingConfirm);
  const clearPendingConfirm = useUiStore((s) => s.clearPendingConfirm);
  const openEntry = useUiStore((s) => s.openEntry);
  const currentId = pendingConfirmIds[0] ?? null;
  const { data: entry } = useEntry(currentId);
  const update = useUpdateEntry();
  const toast = useToast();

  if (!currentId || !entry) return null;

  const meta = parseParseMeta(entry.parseMeta);
  const confidencePct =
    meta?.confidence != null ? Math.round(meta.confidence * 100) : null;
  const index = 1;
  const total = pendingConfirmIds.length;

  async function handleConfirm() {
    try {
      await update.mutateAsync({ id: entry!.id, needsReview: false });
      advancePendingConfirm();
      toast({
        title: total > 1 ? "Onaylandı, sıradaki…" : "Onaylandı",
        status: "success",
        duration: 1400,
      });
    } catch (error) {
      toast({
        title: "Onaylanamadı",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  return (
    <Box
      className="panel"
      p={4}
      borderColor={entry.needsReview ? "accent.300" : "brand.200"}
      borderWidth="1px"
      bg={entry.needsReview ? "accent.50" : "brand.50"}
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
          <Box>
            <Text fontSize="sm" fontWeight="700" color="ink.500">
              {total > 1
                ? `Az önce eklendi (${index}/${total}) — kontrol et`
                : "Az önce eklendi — kontrol et"}
            </Text>
            <Text fontWeight="800" className="page-title" fontSize="lg" mt={1}>
              {entry.title}
            </Text>
          </Box>
          <HStack spacing={2} flexWrap="wrap">
            <Badge bg="white">{KIND_LABELS[entry.kind]}</Badge>
            {entry.category && (
              <Badge bg={entry.category.color} color="white">
                {entry.category.name}
              </Badge>
            )}
            {entry.dueAt && (
              <Badge variant="outline">{formatDateTime(entry.dueAt)}</Badge>
            )}
            {confidencePct != null && (
              <Badge variant="subtle" colorScheme={entry.needsReview ? "orange" : "green"}>
                %{confidencePct} · {meta?.engine ?? "rules"}
              </Badge>
            )}
            {entry.needsReview && (
              <Badge colorScheme="orange">gözden geçir</Badge>
            )}
          </HStack>
        </HStack>
        <Text fontSize="sm" color="ink.400" noOfLines={2}>
          {entry.rawText}
        </Text>
        <HStack justify="flex-end" spacing={2}>
          <Button size="sm" variant="ghost" onClick={() => clearPendingConfirm()}>
            Gizle
          </Button>
          {total > 1 && (
            <Button size="sm" variant="ghost" onClick={() => advancePendingConfirm()}>
              Atla
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              openEntry(entry.id);
            }}
          >
            Düzelt
          </Button>
          <Button
            size="sm"
            onClick={() => void handleConfirm()}
            isLoading={update.isPending}
          >
            Onayla
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
