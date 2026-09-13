import {
  Badge,
  Box,
  Button,
  Checkbox,
  HStack,
  Input,
  Text,
  VStack,
  Wrap,
  WrapItem,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { DeleteConfirmButton } from "./DeleteConfirmButton";
import {
  useCategories,
  useCreateCategory,
  useCreateParseHint,
  useDeleteCategory,
  useDeleteParseHint,
  useMoveCategoryToGenel,
  useParseHints,
  useUpdateCategory,
} from "../hooks/useLifeApi";
import type { Category } from "../types";

const PRESET_COLORS = [
  "#1A4731",
  "#5C7A6B",
  "#3B82F6",
  "#EF4444",
  "#C4A63A",
  "#A855F7",
  "#F97316",
  "#0EA5E9",
  "#64748B",
  "#EC4899",
];

function CategoryKeywords({ categoryId }: { categoryId: string }) {
  const { data } = useParseHints({ categoryId });
  const createHint = useCreateParseHint();
  const removeHint = useDeleteParseHint();
  const toast = useToast();
  const [phrase, setPhrase] = useState("");
  const hints = (data?.hints ?? []).filter((h) => h.categoryId === categoryId);

  async function handleAdd() {
    if (!phrase.trim()) return;
    try {
      await createHint.mutateAsync({ phrase: phrase.trim(), categoryId });
      setPhrase("");
      toast({ title: "Anahtar kelime eklendi", status: "success", duration: 1500 });
    } catch (error) {
      toast({
        title: "Eklenemedi",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  return (
    <VStack align="stretch" spacing={2} pt={1}>
      <Text fontSize="xs" fontWeight="700" color="ink.500">
        Anahtar kelimeler (parser)
      </Text>
      <Wrap spacing={2}>
        {hints.map((h) => (
          <WrapItem key={h.id}>
            <HStack bg="blackAlpha.50" borderRadius="md" px={2} py={1} spacing={1}>
              <Text fontSize="xs" fontWeight="600">
                {h.phrase}
              </Text>
              <Text fontSize="xs" color="ink.400">
                {h.source === "learned" ? "öğrenilen" : "manuel"}
              </Text>
              <Button
                size="xs"
                variant="ghost"
                minW="auto"
                h="auto"
                px={1}
                onClick={() =>
                  void removeHint.mutateAsync(h.id).catch((e) =>
                    toast({
                      title: e instanceof Error ? e.message : "Silinemedi",
                      status: "error",
                    })
                  )
                }
              >
                ×
              </Button>
            </HStack>
          </WrapItem>
        ))}
        {hints.length === 0 && (
          <Text fontSize="xs" color="ink.400">
            Henüz yok — drawer’dan “Kaydet ve öğren” veya buradan ekle.
          </Text>
        )}
      </Wrap>
      <HStack>
        <Input
          size="sm"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="örn. staj, scrum"
          bg="white"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
        />
        <Button size="sm" onClick={() => void handleAdd()} isLoading={createHint.isPending}>
          Ekle
        </Button>
      </HStack>
    </VStack>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const moveToGenel = useMoveCategoryToGenel();
  const toast = useToast();
  const archived = Boolean(category.archivedAt);

  async function handleSave() {
    if (!name.trim()) return;
    try {
      await update.mutateAsync({ id: category.id, name: name.trim(), color });
      toast({ title: "Kategori güncellendi", status: "success", duration: 1800 });
      setEditing(false);
    } catch (error) {
      toast({
        title: "Güncellenemedi",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  async function handleArchiveToggle() {
    try {
      await update.mutateAsync({ id: category.id, archived: !archived });
      toast({
        title: archived ? "Arşivden çıkarıldı" : "Arşivlendi",
        status: "success",
        duration: 1600,
      });
    } catch (error) {
      toast({
        title: "İşlem başarısız",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  async function handleMoveToGenel() {
    try {
      const result = await moveToGenel.mutateAsync(category.id);
      toast({
        title: `${result.moved} kayıt Genel’e taşındı`,
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Taşınamadı",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  if (editing) {
    return (
      <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="lg" p={3}>
        <VStack align="stretch" spacing={3}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            bg="white"
            placeholder="Kategori adı"
          />
          <HStack flexWrap="wrap" spacing={2}>
            {PRESET_COLORS.map((c) => (
              <Box
                key={c}
                as="button"
                type="button"
                w="22px"
                h="22px"
                borderRadius="full"
                bg={c}
                borderWidth={color === c ? "2px" : "1px"}
                borderColor={color === c ? "ink.800" : "blackAlpha.200"}
                onClick={() => setColor(c)}
                aria-label={`Renk ${c}`}
              />
            ))}
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              w="40px"
              h="28px"
              p={0}
              border="none"
            />
          </HStack>
          <CategoryKeywords categoryId={category.id} />
          <HStack justify="flex-end" flexWrap="wrap">
            {category.slug !== "genel" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleMoveToGenel()}
                isLoading={moveToGenel.isPending}
              >
                Kayıtları Genel’e taşı
              </Button>
            )}
            {!category.isSystem && (
              <Button size="sm" variant="outline" onClick={() => void handleArchiveToggle()}>
                {archived ? "Arşivden çıkar" : "Arşivle"}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(category.name);
                setColor(category.color);
                setEditing(false);
              }}
            >
              Kapat
            </Button>
            <Button size="sm" onClick={() => void handleSave()} isLoading={update.isPending}>
              Kaydet
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  }

  return (
    <HStack
      justify="space-between"
      borderWidth="1px"
      borderColor="blackAlpha.100"
      borderRadius="lg"
      px={3}
      py={2}
      opacity={archived ? 0.65 : 1}
    >
      <HStack spacing={3} minW={0}>
        <Badge bg={category.color} color="white">
          {category.name}
        </Badge>
        {category.isSystem && (
          <Text fontSize="xs" color="ink.400">
            sistem
          </Text>
        )}
        {archived && (
          <Badge variant="outline" colorScheme="gray">
            arşiv
          </Badge>
        )}
        <Text fontSize="sm" color="ink.400" noOfLines={1}>
          {category.slug}
        </Text>
      </HStack>
      <HStack>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Düzenle
        </Button>
        {!category.isSystem && (
          <DeleteConfirmButton
            message={`"${category.name}" silinsin mi? Önce kayıtları Genel’e taşıman önerilir.`}
            isLoading={remove.isPending}
            onConfirm={async () => {
              try {
                await remove.mutateAsync(category.id);
              } catch (error) {
                toast({
                  title: "Silinemedi",
                  description: error instanceof Error ? error.message : undefined,
                  status: "error",
                });
              }
            }}
          />
        )}
      </HStack>
    </HStack>
  );
}

export function CategoryManager() {
  const [showArchived, setShowArchived] = useState(false);
  const { data, isLoading } = useCategories({ includeArchived: showArchived });
  const create = useCreateCategory();
  const toast = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1A4731");

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), color });
      toast({ title: "Kategori eklendi", status: "success", duration: 1800 });
      setName("");
      setColor("#1A4731");
    } catch (error) {
      toast({
        title: "Eklenemedi",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  const categories = data?.categories ?? [];

  return (
    <Box className="panel" p={6}>
      <Text fontWeight="700" mb={1}>
        Kategoriler
      </Text>
      <Text fontSize="sm" color="ink.400" mb={4}>
        Arşivle = gizle (silme). Silmeden önce “Genel’e taşı”. Anahtar kelimeler parser’a gider.
      </Text>

      <VStack align="stretch" spacing={3} mb={5}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Yeni kategori adı"
          bg="white"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
          }}
        />
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <HStack flexWrap="wrap" spacing={2}>
            {PRESET_COLORS.map((c) => (
              <Box
                key={c}
                as="button"
                type="button"
                w="22px"
                h="22px"
                borderRadius="full"
                bg={c}
                borderWidth={color === c ? "2px" : "1px"}
                borderColor={color === c ? "ink.800" : "blackAlpha.200"}
                onClick={() => setColor(c)}
              />
            ))}
          </HStack>
          <Button onClick={() => void handleCreate()} isLoading={create.isPending} isDisabled={!name.trim()}>
            Ekle
          </Button>
        </HStack>
      </VStack>

      <Checkbox mb={3} isChecked={showArchived} onChange={(e) => setShowArchived(e.target.checked)}>
        Arşivlenenleri göster
      </Checkbox>

      {isLoading && <Text color="ink.400">Yükleniyor…</Text>}
      <VStack align="stretch" spacing={2}>
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </VStack>
    </Box>
  );
}
