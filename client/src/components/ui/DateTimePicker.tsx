import {
  Box,
  Button,
  Grid,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiCalendar, FiClock } from "react-icons/fi";
import {
  WEEKDAY_LABELS,
  addDays,
  formatMonthTitle,
  monthGridDays,
  sameDay,
  startOfMonth,
} from "../../utils/calendar";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local `YYYY-MM-DDTHH:mm` ↔ Date helpers (drawer state format). */
export function parseLocalDateTime(value: string): Date | null {
  if (!value.trim()) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    0,
    0
  );
}

export function toLocalDateTimeValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatLocalDateTimeDisplay(value: string): string {
  const d = parseLocalDateTime(value);
  if (!d) return "";
  return d.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nearestFiveMinute(min: number): string {
  const rounded = Math.round(min / 5) * 5;
  const clamped = Math.min(55, Math.max(0, rounded === 60 ? 55 : rounded));
  return pad(clamped);
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Tarih ve saat seç",
}: Props) {
  const selected = parseLocalDateTime(value);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(selected ?? new Date())
  );

  const days = useMemo(() => monthGridDays(viewMonth), [viewMonth]);
  const hour = selected ? pad(selected.getHours()) : "09";
  const minute = selected ? nearestFiveMinute(selected.getMinutes()) : "00";

  function applyDate(day: Date, h = hour, m = minute) {
    const next = new Date(day);
    next.setHours(Number(h), Number(m), 0, 0);
    onChange(toLocalDateTimeValue(next));
  }

  function applyTime(h: string, m: string) {
    const base = selected ?? new Date();
    const next = new Date(base);
    next.setHours(Number(h), Number(m), 0, 0);
    onChange(toLocalDateTimeValue(next));
  }

  const display = value ? formatLocalDateTimeDisplay(value) : "";

  return (
    <Popover
      placement="bottom-start"
      isLazy
      onOpen={() => setViewMonth(startOfMonth(selected ?? new Date()))}
    >
      <PopoverTrigger>
        <InputGroup>
          <Input
            readOnly
            value={display}
            placeholder={placeholder}
            bg="white"
            cursor="pointer"
            pr="2.75rem"
            _hover={{ borderColor: "brand.200" }}
            _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 1px var(--chakra-colors-brand-400)" }}
          />
          <InputRightElement pointerEvents="none" color="ink.400">
            <FiCalendar />
          </InputRightElement>
        </InputGroup>
      </PopoverTrigger>
      <PopoverContent
        w="auto"
        maxW="calc(100vw - 32px)"
        borderColor="blackAlpha.100"
        boxShadow="lg"
        borderRadius="xl"
        overflow="hidden"
        _focus={{ outline: "none" }}
      >
        <PopoverBody p={0}>
          <HStack align="stretch" spacing={0} flexWrap={{ base: "wrap", sm: "nowrap" }}>
            <Box p={3} minW="260px" borderRightWidth={{ base: 0, sm: "1px" }} borderColor="blackAlpha.100">
              <HStack justify="space-between" mb={3}>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
                  }
                >
                  ←
                </Button>
                <Text fontWeight="800" fontSize="sm" color="ink.800" textTransform="capitalize">
                  {formatMonthTitle(viewMonth)}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
                  }
                >
                  →
                </Button>
              </HStack>

              <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={1}>
                {WEEKDAY_LABELS.map((label) => (
                  <Text
                    key={label}
                    fontSize="10px"
                    fontWeight="800"
                    color="ink.400"
                    textAlign="center"
                  >
                    {label}
                  </Text>
                ))}
              </Grid>
              <Grid templateColumns="repeat(7, 1fr)" gap={1}>
                {days.map((day) => {
                  const inMonth = day.getMonth() === viewMonth.getMonth();
                  const isSelected = selected ? sameDay(day, selected) : false;
                  const isToday = sameDay(day, new Date());
                  return (
                    <Button
                      key={day.toISOString()}
                      size="sm"
                      h="34px"
                      minW="34px"
                      p={0}
                      fontSize="sm"
                      fontWeight={isSelected || isToday ? "800" : "600"}
                      variant={isSelected ? "solid" : "ghost"}
                      colorScheme={isSelected ? "brand" : undefined}
                      bg={isSelected ? "brand.500" : undefined}
                      color={
                        isSelected
                          ? "white"
                          : !inMonth
                            ? "ink.200"
                            : isToday
                              ? "brand.600"
                              : "ink.700"
                      }
                      borderWidth={isToday && !isSelected ? "1px" : undefined}
                      borderColor={isToday && !isSelected ? "brand.300" : undefined}
                      onClick={() => applyDate(day)}
                    >
                      {day.getDate()}
                    </Button>
                  );
                })}
              </Grid>
            </Box>

            <VStack align="stretch" spacing={3} p={3} minW="140px" bg="brand.50">
              <HStack color="ink.500" spacing={1}>
                <FiClock size={14} />
                <Text fontSize="xs" fontWeight="800" textTransform="uppercase">
                  Saat (24s)
                </Text>
              </HStack>
              <HStack>
                <Select
                  size="sm"
                  bg="white"
                  value={hour}
                  onChange={(e) => applyTime(e.target.value, minute)}
                  aria-label="Saat"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
                <Text fontWeight="800" color="ink.400">
                  :
                </Text>
                <Select
                  size="sm"
                  bg="white"
                  value={MINUTES.includes(minute) ? minute : nearestFiveMinute(Number(minute))}
                  onChange={(e) => applyTime(hour, e.target.value)}
                  aria-label="Dakika"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </HStack>

              <VStack align="stretch" spacing={2} pt={1}>
                <Button
                  size="sm"
                  variant="outline"
                  bg="white"
                  onClick={() => {
                    const now = new Date();
                    setViewMonth(startOfMonth(now));
                    onChange(toLocalDateTimeValue(now));
                  }}
                >
                  Şimdi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  bg="white"
                  onClick={() => {
                    const t = new Date();
                    t.setHours(9, 0, 0, 0);
                    setViewMonth(startOfMonth(t));
                    onChange(toLocalDateTimeValue(t));
                  }}
                >
                  Bugün 09:00
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  bg="white"
                  onClick={() => {
                    const t = addDays(new Date(), 1);
                    t.setHours(9, 0, 0, 0);
                    setViewMonth(startOfMonth(t));
                    onChange(toLocalDateTimeValue(t));
                  }}
                >
                  Yarın 09:00
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  color="ink.400"
                  onClick={() => onChange("")}
                >
                  Temizle
                </Button>
              </VStack>
            </VStack>
          </HStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
