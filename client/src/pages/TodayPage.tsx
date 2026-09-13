import {
  Box,
  Button,
  HStack,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { EntryRow } from "../components/EntryRow";
import { EmptyCaptureHints } from "../components/EmptyCaptureHints";
import { IngestConfirmBar } from "../components/IngestConfirmBar";
import { useEntries, useIngestEntry, useStats } from "../hooks/useLifeApi";
import { useUiStore } from "../store/uiStore";
import { Link } from "@tanstack/react-router";

export function QuickCapture({
  prefill,
  onPrefillConsumed,
}: {
  prefill?: string | null;
  onPrefillConsumed?: () => void;
} = {}) {
  const [text, setText] = useState("");
  const ingest = useIngestEntry();
  const setPendingConfirmIds = useUiStore((s) => s.setPendingConfirmIds);
  const toast = useToast();

  useEffect(() => {
    if (!prefill) return;
    setText(prefill);
    onPrefillConsumed?.();
  }, [prefill, onPrefillConsumed]);

  async function handleSubmit() {
    if (!text.trim()) return;
    try {
      const result = await ingest.mutateAsync(text.trim());
      const entries = result.entries;
      setPendingConfirmIds(entries.map((e) => e.id));
      setText("");
      toast({
        title: entries.length > 1 ? `${entries.length} kayıt eklendi` : "Eklendi",
        description: entries.map((e) => e.title).join(" · "),
        status: "success",
        duration: 2500,
      });
    } catch (error) {
      toast({
        title: "Eklenemedi",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  return (
    <Box className="panel" p={4}>
      <VStack align="stretch" spacing={3}>
        <Text fontWeight="700" color="ink.800">
          Hızlı ekle
        </Text>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Örn: "Haftaya proje teslimi var, yarın doktor randevusu" — virgülle ayır'
          minH="96px"
          bg="white"
        />
        <Text fontSize="xs" color="ink.400">
          Birden fazla kayıt için virgül kullan. Ondalıklar (1,5) tek parça kalır.
        </Text>
        <HStack justify="flex-end">
          <Button onClick={() => void handleSubmit()} isLoading={ingest.isPending}>
            Anla ve ekle
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}

export function TodayPage() {
  const { data: stats } = useStats();
  const { data, isLoading } = useEntries({ status: "OPEN" });
  const [prefill, setPrefill] = useState<string | null>(null);

  const entries = (data?.entries ?? []).filter((e) => {
    if (!e.dueAt && !e.startsAt) return true;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const due = e.dueAt ? new Date(e.dueAt) : null;
    const starts = e.startsAt ? new Date(e.startsAt) : null;
    return (
      (due && due >= start && due <= end) ||
      (starts && starts >= start && starts <= end) ||
      (!due && !starts)
    );
  });

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Text className="page-title" fontSize="3xl" color="brand.500">
          Bugün
        </Text>
        <Text color="ink.400" mt={1}>
          Açık: {stats?.open ?? 0} · Tamam: {stats?.done ?? 0}
          {(stats?.needsReview ?? 0) > 0 && (
            <>
              {" "}
              ·{" "}
              <Link to="/review" style={{ color: "var(--chakra-colors-accent-700)", fontWeight: 700 }}>
                Gözden geçir: {stats?.needsReview}
              </Link>
            </>
          )}
        </Text>
      </Box>
      <QuickCapture prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />
      <IngestConfirmBar />
      <VStack align="stretch" spacing={3}>
        {isLoading && <Text color="ink.400">Yükleniyor…</Text>}
        {!isLoading && entries.length === 0 && (
          <EmptyCaptureHints
            title="Bugün için kayıt yok"
            onPick={(text) => setPrefill(text)}
          />
        )}
        {entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </VStack>
    </VStack>
  );
}
