import {
  Box,
  Button,
  Checkbox,
  HStack,
  Select,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { QuickCapture } from "./TodayPage";
import { EmptyCaptureHints } from "../components/EmptyCaptureHints";
import { EntryRow } from "../components/EntryRow";
import { IngestConfirmBar } from "../components/IngestConfirmBar";
import { useBulkEntries, useCategories, useEntries } from "../hooks/useLifeApi";
import { KIND_LABELS } from "../utils/labels";
import type { EntryKind, EntryStatus } from "../types";

export function InboxPage() {
  const [status, setStatus] = useState<EntryStatus | "">("OPEN");
  const [kind, setKind] = useState<EntryKind | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [prefill, setPrefill] = useState<string | null>(null);
  const { data: categoriesData } = useCategories();
  const { data, isLoading } = useEntries({
    status: status || undefined,
    kind: kind || undefined,
    categoryId: categoryId || undefined,
  });
  const bulk = useBulkEntries();
  const toast = useToast();

  const entries = data?.entries ?? [];
  const categories = categoriesData?.categories ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const key = entry.category?.name ?? "Genel";
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [entries]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === entries.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(entries.map((e) => e.id)));
  }

  async function runBulk(action: "done" | "archive" | "delete" | "category") {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      const result = await bulk.mutateAsync({
        ids,
        action,
        categoryId: action === "category" ? bulkCategoryId || null : undefined,
      });
      setSelected(new Set());
      toast({
        title: `${result.updated} kayıt güncellendi`,
        status: "success",
        duration: 1800,
      });
    } catch (error) {
      toast({
        title: "Toplu işlem başarısız",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Text className="page-title" fontSize="3xl" color="brand.500">
          Gelen kutusu
        </Text>
        <Text color="ink.400" mt={1}>
          Filtrele, çoklu seç, toplu işlem yap. Satıra tıklayarak düzenle.
        </Text>
      </Box>

      <QuickCapture prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />
      <IngestConfirmBar />

      <HStack spacing={3} flexWrap="wrap">
        <Select
          maxW="180px"
          value={status}
          onChange={(e) => setStatus(e.target.value as EntryStatus | "")}
          bg="white"
        >
          <option value="">Tüm durumlar</option>
          <option value="OPEN">Açık</option>
          <option value="DONE">Tamam</option>
          <option value="CANCELLED">İptal</option>
          <option value="ARCHIVED">Arşiv</option>
        </Select>
        <Select
          maxW="180px"
          value={kind}
          onChange={(e) => setKind(e.target.value as EntryKind | "")}
          bg="white"
        >
          <option value="">Tüm türler</option>
          {Object.entries(KIND_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          maxW="180px"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          bg="white"
        >
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Checkbox
          isChecked={entries.length > 0 && selected.size === entries.length}
          isIndeterminate={selected.size > 0 && selected.size < entries.length}
          onChange={toggleAll}
        >
          Tümünü seç
        </Checkbox>
      </HStack>

      {selected.size > 0 && (
        <HStack
          className="panel"
          p={3}
          spacing={2}
          flexWrap="wrap"
          justify="space-between"
        >
          <Text fontWeight="700" fontSize="sm">
            {selected.size} seçili
          </Text>
          <HStack flexWrap="wrap" spacing={2}>
            <Button size="sm" onClick={() => void runBulk("done")} isLoading={bulk.isPending}>
              Tamamla
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runBulk("archive")}
              isLoading={bulk.isPending}
            >
              Arşivle
            </Button>
            <Select
              size="sm"
              maxW="160px"
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              bg="white"
            >
              <option value="">Kategori seç</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runBulk("category")}
              isLoading={bulk.isPending}
              isDisabled={!bulkCategoryId}
            >
              Kategori uygula
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              variant="outline"
              onClick={() => void runBulk("delete")}
              isLoading={bulk.isPending}
            >
              Çöpe at
            </Button>
          </HStack>
        </HStack>
      )}

      {isLoading && <Text color="ink.400">Yükleniyor…</Text>}
      {!isLoading && entries.length === 0 && (
        <EmptyCaptureHints title="Gelen kutusu boş" onPick={(text) => setPrefill(text)} />
      )}

      <VStack align="stretch" spacing={6}>
        {grouped.map(([categoryName, items]) => (
          <VStack key={categoryName} align="stretch" spacing={3}>
            <Text fontWeight="800" color="ink.700">
              {categoryName} · {items.length}
            </Text>
            {items.map((entry) => (
              <HStack key={entry.id} align="start" spacing={3}>
                <Checkbox
                  mt={5}
                  isChecked={selected.has(entry.id)}
                  onChange={() => toggle(entry.id)}
                />
                <Box flex={1} minW={0}>
                  <EntryRow entry={entry} />
                </Box>
              </HStack>
            ))}
          </VStack>
        ))}
      </VStack>
    </VStack>
  );
}
