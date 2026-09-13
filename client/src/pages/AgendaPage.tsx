import { Badge, Box, HStack, Text, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import { EntryRow } from "../components/EntryRow";
import { useEntries } from "../hooks/useLifeApi";
import { addDays, dayKey, endOfDay, startOfDay } from "../utils/calendar";

export function AgendaPage() {
  const range = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(addDays(start, 13));
    return { start, end };
  }, []);

  const { data, isLoading } = useEntries({
    status: "OPEN",
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
  });

  const grouped = useMemo(() => {
    const entries = data?.entries ?? [];
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const anchor = entry.dueAt ?? entry.startsAt;
      if (!anchor) continue;
      const key = dayKey(new Date(anchor));
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data?.entries]);

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Text className="page-title" fontSize="3xl" color="brand.500">
          Gündem
        </Text>
        <Text color="ink.400" mt={1}>
          Önümüzdeki 14 gün — tarihli açık kayıtlar.
        </Text>
      </Box>

      {isLoading && <Text color="ink.400">Yükleniyor…</Text>}
      {!isLoading && grouped.length === 0 && (
        <Box className="panel" p={6}>
          <Text color="ink.500">
            Önümüzdeki iki haftada tarihli kayıt yok. Hızlı ekle veya takvimden bak.
          </Text>
        </Box>
      )}

      <VStack align="stretch" spacing={6}>
        {grouped.map(([key, items]) => {
          const day = new Date(`${key}T12:00:00`);
          const label = day.toLocaleDateString("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          const isToday = dayKey(new Date()) === key;
          return (
            <VStack key={key} align="stretch" spacing={3}>
              <HStack>
                <Text fontWeight="800" color="ink.800" textTransform="capitalize">
                  {label}
                </Text>
                {isToday && <Badge colorScheme="green">Bugün</Badge>}
                <Badge variant="outline">{items.length}</Badge>
              </HStack>
              {items.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </VStack>
          );
        })}
      </VStack>
    </VStack>
  );
}
