import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { DeleteConfirmButton } from "../components/DeleteConfirmButton";
import {
  useEntries,
  usePurgeEntry,
  usePurgeTrash,
  useRestoreEntry,
  useStats,
} from "../hooks/useLifeApi";
import { formatDateTime, KIND_LABELS } from "../utils/labels";

export function TrashPage() {
  const { data, isLoading } = useEntries({ trashed: true });
  const { data: stats } = useStats();
  const restore = useRestoreEntry();
  const purge = usePurgeEntry();
  const purgeAll = usePurgeTrash();
  const toast = useToast();
  const entries = data?.entries ?? [];

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
          <Box>
            <Text className="page-title" fontSize="3xl" color="brand.500">
              Çöp kutusu
            </Text>
            <Text color="ink.400" mt={1}>
              Soft-delete kayıtlar. Geri al veya kalıcı sil.
            </Text>
          </Box>
          {entries.length > 0 && (
            <DeleteConfirmButton
              message="Çöp kutusu tamamen boşaltılsın mı?"
              ariaLabel="Çöpü boşalt"
              isLoading={purgeAll.isPending}
              onConfirm={async () => {
                const result = await purgeAll.mutateAsync();
                toast({
                  title: "Çöp boşaltıldı",
                  description: `${result.deleted} kayıt silindi`,
                  status: "success",
                });
              }}
            />
          )}
        </HStack>
        <Text fontSize="sm" color="ink.400" mt={2}>
          Çöpte: {stats?.trashed ?? entries.length}
        </Text>
      </Box>

      {isLoading && <Text color="ink.400">Yükleniyor…</Text>}
      {!isLoading && entries.length === 0 && (
        <Box className="panel" p={6}>
          <Text color="ink.500">Çöp kutusu boş.</Text>
        </Box>
      )}

      <VStack align="stretch" spacing={3}>
        {entries.map((entry) => (
          <Box key={entry.id} className="panel" p={4}>
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
              <VStack align="start" spacing={1} minW={0}>
                <Text fontWeight="800">{entry.title}</Text>
                <Text fontSize="sm" color="ink.400">
                  {KIND_LABELS[entry.kind]} · silindi {formatDateTime(entry.deletedAt)}
                </Text>
              </VStack>
              <HStack>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void restore
                      .mutateAsync(entry.id)
                      .then(() => toast({ title: "Geri alındı", status: "success", duration: 1500 }))
                      .catch((e) =>
                        toast({
                          title: e instanceof Error ? e.message : "Hata",
                          status: "error",
                        })
                      )
                  }
                  isLoading={restore.isPending}
                >
                  Geri al
                </Button>
                <DeleteConfirmButton
                  message={`"${entry.title}" kalıcı silinsin mi?`}
                  isLoading={purge.isPending}
                  onConfirm={async () => {
                    await purge.mutateAsync(entry.id);
                  }}
                />
              </HStack>
            </HStack>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
}
