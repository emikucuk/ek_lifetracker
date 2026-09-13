import { Badge, Box, Button, HStack, Text, VStack, useToast } from "@chakra-ui/react";
import { EntryRow } from "../components/EntryRow";
import { useEntries, useStats, useUpdateEntry } from "../hooks/useLifeApi";
import { useUiStore } from "../store/uiStore";

export function ReviewPage() {
  const { data, isLoading } = useEntries({ needsReview: true, status: "OPEN" });
  const { data: stats } = useStats();
  const update = useUpdateEntry();
  const openEntry = useUiStore((s) => s.openEntry);
  const toast = useToast();
  const entries = data?.entries ?? [];

  async function confirmAll() {
    try {
      await Promise.all(
        entries.map((e) => update.mutateAsync({ id: e.id, needsReview: false }))
      );
      toast({ title: "Hepsi onaylandı", status: "success", duration: 2000 });
    } catch (error) {
      toast({
        title: "Toplu onay başarısız",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
          <Box>
            <Text className="page-title" fontSize="3xl" color="brand.500">
              Gözden geçir
            </Text>
            <Text color="ink.400" mt={1}>
              Düşük güvenli veya belirsiz parse’lar. Onayla veya düzelt.
            </Text>
          </Box>
          <Badge fontSize="md" px={3} py={1}>
            {stats?.needsReview ?? entries.length} bekliyor
          </Badge>
        </HStack>
      </Box>

      {entries.length > 0 && (
        <HStack justify="flex-end">
          <Button size="sm" variant="outline" onClick={() => void confirmAll()} isLoading={update.isPending}>
            Hepsini onayla
          </Button>
        </HStack>
      )}

      <VStack align="stretch" spacing={3}>
        {isLoading && <Text color="ink.400">Yükleniyor…</Text>}
        {!isLoading && entries.length === 0 && (
          <Box className="panel" p={6}>
            <Text color="ink.500">Gözden geçirilecek kayıt yok. Parse’lar net görünüyor.</Text>
          </Box>
        )}
        {entries.map((entry) => (
          <Box key={entry.id}>
            <EntryRow entry={entry} />
            <HStack justify="flex-end" mt={2} spacing={2}>
              <Button size="sm" variant="outline" onClick={() => openEntry(entry.id)}>
                Düzelt
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  void update
                    .mutateAsync({ id: entry.id, needsReview: false })
                    .then(() => toast({ title: "Onaylandı", status: "success", duration: 1500 }))
                    .catch((e) =>
                      toast({
                        title: e instanceof Error ? e.message : "Hata",
                        status: "error",
                      })
                    )
                }
                isLoading={update.isPending}
              >
                Onayla
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
}
