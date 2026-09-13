import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Input,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Field } from "./ui/Field";
import { FieldSelect } from "./ui/FieldSelect";
import { DateTimePicker } from "./ui/DateTimePicker";
import { useCategories, useEntry, useLearnParseHint, useUpdateEntry } from "../hooks/useLifeApi";
import { useUiStore } from "../store/uiStore";
import {
  KIND_LABELS,
  PRIORITY_LABELS,
  RECUR_LABELS,
  STATUS_LABELS,
} from "../utils/labels";
import type { EntryKind, EntryPriority, EntryStatus, RecurRule } from "../types";

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  // Prefer explicit local parts to avoid Safari quirks with datetime-local strings
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      0,
      0
    );
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const KIND_OPTIONS = Object.entries(KIND_LABELS).map(([value, label]) => ({
  value: value as EntryKind,
  label,
}));

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value: value as EntryStatus,
  label,
}));

const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value: value as EntryPriority,
  label,
}));

const RECUR_OPTIONS: Array<{ value: "" | RecurRule; label: string }> = [
  { value: "", label: "Tekrar yok" },
  ...Object.entries(RECUR_LABELS).map(([value, label]) => ({
    value: value as RecurRule,
    label,
  })),
];

export function EntryEditDrawer() {
  const selectedEntryId = useUiStore((s) => s.selectedEntryId);
  const closeEntry = useUiStore((s) => s.closeEntry);
  const { data: entry } = useEntry(selectedEntryId);
  const { data: categoriesData } = useCategories();
  const update = useUpdateEntry();
  const learn = useLearnParseHint();
  const toast = useToast();

  const categories = categoriesData?.categories ?? [];

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<EntryKind>("NOTE");
  const [status, setStatus] = useState<EntryStatus>("OPEN");
  const [priority, setPriority] = useState<EntryPriority>("NORMAL");
  const [categoryId, setCategoryId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [recurRule, setRecurRule] = useState<"" | RecurRule>("");

  useEffect(() => {
    if (!entry) return;
    setTitle(entry.title);
    setNotes(entry.notes ?? "");
    setKind(entry.kind);
    setStatus(entry.status);
    setPriority(entry.priority);
    setCategoryId(entry.categoryId ?? "");
    setDueAt(toLocalInput(entry.dueAt));
    setStartsAt(toLocalInput(entry.startsAt));
    setEndsAt(toLocalInput(entry.endsAt));
    setRemindAt(toLocalInput(entry.remindAt));
    setRecurRule(entry.recurRule ?? "");
  }, [entry]);

  const isOpen = Boolean(selectedEntryId);
  const kindChanged = Boolean(entry && kind !== entry.kind);
  const categoryChanged = Boolean(entry && (categoryId || null) !== (entry.categoryId || null));
  const canLearn =
    kindChanged || (categoryChanged && Boolean(categoryId));

  async function persist(alsoLearn: boolean) {
    if (!selectedEntryId || !title.trim() || !entry) return;
    try {
      await update.mutateAsync({
        id: selectedEntryId,
        title: title.trim(),
        notes: notes.trim() || null,
        kind,
        status,
        priority,
        categoryId: categoryId || null,
        dueAt: fromLocalInput(dueAt),
        startsAt: fromLocalInput(startsAt),
        endsAt: fromLocalInput(endsAt),
        remindAt: fromLocalInput(remindAt),
        needsReview: false,
        recurRule: recurRule || null,
      });

      if (alsoLearn && canLearn) {
        const result = await learn.mutateAsync({
          rawText: entry.rawText,
          kind: kindChanged ? kind : null,
          categoryId: categoryChanged && categoryId ? categoryId : null,
        });
        toast({
          title: "Kaydedildi ve öğrenildi",
          description: `${result.count} ipucu eklendi`,
          status: "success",
          duration: 2500,
        });
      } else {
        toast({ title: "Kaydedildi", status: "success", duration: 2000 });
      }

      closeEntry();
      const ids = useUiStore.getState().pendingConfirmIds;
      if (ids.includes(selectedEntryId)) {
        useUiStore
          .getState()
          .setPendingConfirmIds(ids.filter((id) => id !== selectedEntryId));
      }
    } catch (error) {
      toast({
        title: alsoLearn ? "Kaydedilemedi / öğrenilemedi" : "Kaydedilemedi",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={closeEntry} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          Kaydı düzenle
          <Text fontSize="xs" fontWeight="500" color="ink.400" mt={1}>
            Kısayol: d tamamla · o açık · a arşiv · x iptal · 1–4 öncelik · Esc kapat
            (alan odaklı değilken)
          </Text>
        </DrawerHeader>
        <DrawerBody>
          {entry ? (
            <VStack align="stretch" spacing={4} pt={2}>
              <Field label="Başlık">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} bg="white" />
              </Field>
              <Field label="Tür">
                <FieldSelect value={kind} options={KIND_OPTIONS} onChange={setKind} />
              </Field>
              <Field label="Kategori">
                <FieldSelect
                  value={categoryId}
                  options={[
                    { value: "", label: "Kategori yok" },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  onChange={setCategoryId}
                />
              </Field>
              <Field label="Durum">
                <FieldSelect value={status} options={STATUS_OPTIONS} onChange={setStatus} />
              </Field>
              <Field label="Öncelik">
                <FieldSelect value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} />
              </Field>
              <Field label="Tekrar" helper="Tamamlanınca bir sonraki oluşum otomatik açılır">
                <FieldSelect value={recurRule} options={RECUR_OPTIONS} onChange={setRecurRule} />
              </Field>
              <Field label="Son tarih">
                <DateTimePicker value={dueAt} onChange={setDueAt} placeholder="Son tarih seç" />
              </Field>
              <Field label="Başlangıç">
                <DateTimePicker
                  value={startsAt}
                  onChange={setStartsAt}
                  placeholder="Başlangıç seç"
                />
              </Field>
              <Field label="Bitiş">
                <DateTimePicker value={endsAt} onChange={setEndsAt} placeholder="Bitiş seç" />
              </Field>
              <Field
                label="Hatırlatma saati"
                helper="Yerel tarayıcı bildirimi — Sağlık sayfasından açılır"
              >
                <DateTimePicker
                  value={remindAt}
                  onChange={setRemindAt}
                  placeholder="Hatırlatma seç"
                />
              </Field>
              <Field label="Notlar">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  minH="96px"
                  bg="white"
                />
              </Field>
              <Field label="Ham metin" helper="Orijinal giriş — salt okunur">
                <Textarea value={entry.rawText} isReadOnly minH="72px" bg="blackAlpha.50" />
              </Field>
              {canLearn && (
                <Text fontSize="sm" color="accent.700" fontWeight="600">
                  Tür veya kategori değişti. “Kaydet ve öğren” sonraki benzer cümlelerde bunu hatırlar.
                </Text>
              )}
            </VStack>
          ) : (
            <VStack py={8}>
              <span>Kayıt yükleniyor…</span>
            </VStack>
          )}
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px" gap={3} flexWrap="wrap">
          <Button variant="ghost" onClick={closeEntry}>
            Vazgeç
          </Button>
          <Button
            variant="outline"
            onClick={() => void persist(false)}
            isLoading={update.isPending}
            isDisabled={!entry}
          >
            Kaydet
          </Button>
          <Button
            onClick={() => void persist(true)}
            isLoading={update.isPending || learn.isPending}
            isDisabled={!entry || !canLearn}
          >
            Kaydet ve öğren
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
