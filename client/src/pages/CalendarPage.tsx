import {
  Box,
  Button,
  ButtonGroup,
  Grid,
  HStack,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { useEntries, useUpdateEntry } from "../hooks/useLifeApi";
import { useUiStore } from "../store/uiStore";
import type { LifeEntry } from "../types";
import {
  WEEKDAY_LABELS,
  addDays,
  dayDelta,
  dayKey,
  endOfWeek,
  formatMonthTitle,
  formatWeekTitle,
  monthGridDays,
  sameDay,
  shiftIsoByDays,
  startOfMonth,
  startOfWeek,
  weekDays,
} from "../utils/calendar";

type CalView = "month" | "week";

const DRAG_MIME = "application/x-lifetracker-entry";

function entryDayKeys(entry: LifeEntry): string[] {
  const keys = new Set<string>();
  if (entry.dueAt) keys.add(dayKey(new Date(entry.dueAt)));
  if (entry.startsAt) keys.add(dayKey(new Date(entry.startsAt)));
  return [...keys];
}

function Chip({
  entry,
  day,
  onOpen,
}: {
  entry: LifeEntry;
  day: Date;
  onOpen: () => void;
}) {
  const dragged = useRef(false);

  return (
    <Box
      as="button"
      type="button"
      draggable
      onDragStart={(e: DragEvent) => {
        dragged.current = false;
        e.dataTransfer.setData(
          DRAG_MIME,
          JSON.stringify({ id: entry.id, fromDay: dayKey(day) })
        );
        e.dataTransfer.effectAllowed = "move";
      }}
      onDrag={() => {
        dragged.current = true;
      }}
      onClick={() => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        onOpen();
      }}
      w="fit-content"
      maxW="100%"
      textAlign="left"
      px={1.5}
      py={0.5}
      borderRadius="md"
      bg={entry.category?.color ?? "brand.500"}
      color="white"
      fontSize="xs"
      fontWeight="700"
      lineHeight="1.25"
      noOfLines={2}
      whiteSpace="normal"
      wordBreak="break-word"
      title={`${entry.title} — sürükleyerek tarih taşı`}
      cursor="grab"
      _active={{ cursor: "grabbing" }}
    >
      {entry.title}
    </Box>
  );
}

export function CalendarPage() {
  const [view, setView] = useState<CalView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [dropDay, setDropDay] = useState<string | null>(null);
  const openEntry = useUiStore((s) => s.openEntry);
  const update = useUpdateEntry();
  const toast = useToast();

  const range = useMemo(() => {
    if (view === "week") {
      return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
    }
    const days = monthGridDays(anchor);
    return { start: days[0]!, end: days[days.length - 1]! };
  }, [anchor, view]);

  const { data, isLoading } = useEntries({
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, LifeEntry[]>();
    for (const entry of data?.entries ?? []) {
      for (const key of entryDayKeys(entry)) {
        const list = map.get(key) ?? [];
        list.push(entry);
        map.set(key, list);
      }
    }
    return map;
  }, [data?.entries]);

  const days = view === "month" ? monthGridDays(anchor) : weekDays(anchor);
  const today = new Date();
  const inMonth = (d: Date) =>
    d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear();

  function goPrev() {
    if (view === "week") setAnchor((a) => addDays(a, -7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1));
  }

  function goNext() {
    if (view === "week") setAnchor((a) => addDays(a, 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1));
  }

  function goToday() {
    setAnchor(new Date());
  }

  async function handleDrop(targetDay: Date, raw: string) {
    setDropDay(null);
    let payload: { id: string; fromDay: string };
    try {
      payload = JSON.parse(raw) as { id: string; fromDay: string };
    } catch {
      return;
    }
    const from = new Date(`${payload.fromDay}T12:00:00`);
    const delta = dayDelta(from, targetDay);
    if (delta === 0) return;

    const entry = (data?.entries ?? []).find((e) => e.id === payload.id);
    if (!entry) return;

    try {
      await update.mutateAsync({
        id: entry.id,
        dueAt: shiftIsoByDays(entry.dueAt, delta),
        startsAt: shiftIsoByDays(entry.startsAt, delta),
        endsAt: shiftIsoByDays(entry.endsAt, delta),
        remindAt: shiftIsoByDays(entry.remindAt, delta),
      });
      toast({
        title: "Tarih güncellendi",
        description: entry.title,
        status: "success",
        duration: 1600,
      });
    } catch (error) {
      toast({
        title: "Taşınamadı",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  return (
    <VStack align="stretch" spacing={4} w="100%" className="calendar-page">
      <HStack
        justify="space-between"
        align={{ base: "stretch", md: "flex-end" }}
        flexWrap="wrap"
        gap={3}
      >
        <Box>
          <Text className="page-title" fontSize={{ base: "2xl", md: "3xl" }} color="brand.500">
            Takvim
          </Text>
          <Text color="ink.400" mt={1} fontSize={{ base: "sm", md: "md" }}>
            Chip’i sürükleyerek tarihi taşı · tıklayınca düzenle
          </Text>
        </Box>
        <HStack flexWrap="wrap" gap={2}>
          <HStack>
            <Button size="sm" variant="outline" onClick={goPrev}>
              ←
            </Button>
            <Button size="sm" variant="ghost" onClick={goToday}>
              Bugün
            </Button>
            <Button size="sm" variant="outline" onClick={goNext}>
              →
            </Button>
            <Text fontWeight="800" color="ink.800" minW={{ base: "auto", md: "180px" }}>
              {view === "month" ? formatMonthTitle(anchor) : formatWeekTitle(anchor)}
            </Text>
          </HStack>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button
              onClick={() => {
                setView("month");
                setAnchor(startOfMonth(anchor));
              }}
              bg={view === "month" ? "brand.50" : undefined}
              color={view === "month" ? "brand.700" : undefined}
            >
              Ay
            </Button>
            <Button
              onClick={() => {
                setView("week");
                setAnchor(startOfWeek(anchor));
              }}
              bg={view === "week" ? "brand.50" : undefined}
              color={view === "week" ? "brand.700" : undefined}
            >
              Hafta
            </Button>
          </ButtonGroup>
        </HStack>
      </HStack>

      {isLoading && <Text color="ink.400">Yükleniyor…</Text>}

      <Box
        className="panel calendar-board"
        p={{ base: 2, md: 3 }}
        w="100%"
        overflowX={{ base: "auto", md: "visible" }}
      >
        <Grid
          templateColumns="repeat(7, minmax(0, 1fr))"
          gap={{ base: 1, md: 1.5 }}
          mb={2}
          minW={{ base: "560px", md: 0 }}
        >
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} fontSize="xs" fontWeight="800" color="ink.400" textAlign="center">
              {label}
            </Text>
          ))}
        </Grid>
        <Grid
          templateColumns="repeat(7, minmax(0, 1fr))"
          gap={{ base: 1, md: 1.5 }}
          autoRows={view === "week" ? { base: "minmax(140px, auto)", md: "minmax(180px, 1fr)" } : { base: "minmax(88px, auto)", md: "minmax(120px, auto)" }}
          minW={{ base: "560px", md: 0 }}
          minH={view === "week" ? { md: "calc(100vh - 220px)" } : undefined}
        >
          {days.map((day) => {
            const key = dayKey(day);
            const items = byDay.get(key) ?? [];
            const isToday = sameDay(day, today);
            const muted = view === "month" && !inMonth(day);
            const isDropTarget = dropDay === key;
            return (
              <Box
                key={key}
                borderWidth="1px"
                borderColor={
                  isDropTarget ? "brand.400" : isToday ? "brand.300" : "blackAlpha.100"
                }
                borderRadius="lg"
                bg={isDropTarget ? "brand.50" : isToday ? "brand.50" : "white"}
                p={{ base: 1.5, md: 2 }}
                minH={view === "week" ? { base: "140px", md: "180px" } : { base: "88px", md: "120px" }}
                opacity={muted ? 0.45 : 1}
                onDragOver={(e: DragEvent) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropDay(key);
                }}
                onDragLeave={() => {
                  setDropDay((cur) => (cur === key ? null : cur));
                }}
                onDrop={(e: DragEvent) => {
                  e.preventDefault();
                  const raw =
                    e.dataTransfer.getData(DRAG_MIME) ||
                    e.dataTransfer.getData("text/plain");
                  if (raw) void handleDrop(day, raw);
                }}
              >
                <Text
                  fontSize="sm"
                  fontWeight={isToday ? "800" : "600"}
                  color={isToday ? "brand.700" : "ink.700"}
                  mb={1}
                >
                  {day.getDate()}
                </Text>
                <VStack align="start" spacing={1} w="100%">
                  {items.slice(0, view === "week" ? 14 : 4).map((entry) => (
                    <Chip
                      key={entry.id}
                      entry={entry}
                      day={day}
                      onOpen={() => openEntry(entry.id)}
                    />
                  ))}
                  {items.length > (view === "week" ? 14 : 4) && (
                    <Text fontSize="xs" color="ink.400" fontWeight="700">
                      +{items.length - (view === "week" ? 14 : 4)} daha
                    </Text>
                  )}
                </VStack>
              </Box>
            );
          })}
        </Grid>
      </Box>
    </VStack>
  );
}
