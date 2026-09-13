import {
  Badge,
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { FiChevronDown } from "react-icons/fi";
import { DeleteConfirmButton } from "./DeleteConfirmButton";
import { ParseEngineChip } from "./ParseEngineChip";
import { useDeleteEntry, useSnoozeEntry, useUpdateEntry } from "../hooks/useLifeApi";
import { useUiStore } from "../store/uiStore";
import { formatDateTime, KIND_LABELS, RECUR_LABELS, STATUS_LABELS } from "../utils/labels";
import type { LifeEntry } from "../types";

export function EntryRow({ entry }: { entry: LifeEntry }) {
  const update = useUpdateEntry();
  const remove = useDeleteEntry();
  const snooze = useSnoozeEntry();
  const openEntry = useUiStore((s) => s.openEntry);
  const toast = useToast();

  return (
    <Box
      className="panel"
      p={4}
      cursor="pointer"
      onClick={() => openEntry(entry.id)}
      _hover={{ borderColor: "brand.200" }}
      transition="border-color 150ms ease"
    >
      <HStack justify="space-between" align="start" spacing={3}>
        <VStack align="start" spacing={2} minW={0} flex={1}>
          <Text fontWeight="800" className="page-title" fontSize="lg" noOfLines={2}>
            {entry.title}
          </Text>
          <HStack flexWrap="wrap" spacing={2}>
            <Badge bg="brand.50" color="brand.700">
              {KIND_LABELS[entry.kind]}
            </Badge>
            {entry.category && (
              <Badge bg={entry.category.color} color="white">
                {entry.category.name}
              </Badge>
            )}
            <Badge variant="outline">{STATUS_LABELS[entry.status]}</Badge>
            {entry.needsReview && (
              <Badge colorScheme="orange">gözden geçir</Badge>
            )}
            {entry.recurRule && (
              <Badge colorScheme="purple">{RECUR_LABELS[entry.recurRule]}</Badge>
            )}
            <ParseEngineChip parseMeta={entry.parseMeta} />
            {entry.dueAt && (
              <Text fontSize="sm" color="accent.700" fontWeight="700">
                {formatDateTime(entry.dueAt)}
              </Text>
            )}
            {entry.remindAt && (
              <Text fontSize="sm" color="orange.600" fontWeight="700">
                hatırlat {formatDateTime(entry.remindAt)}
              </Text>
            )}
          </HStack>
          <Text fontSize="sm" color="ink.400" noOfLines={2}>
            {entry.rawText}
          </Text>
        </VStack>
        <HStack
          onClick={(e) => {
            e.stopPropagation();
          }}
          flexWrap="wrap"
          justify="flex-end"
        >
          {entry.status === "OPEN" && (
            <>
              <Menu>
                <MenuButton as={Button} size="sm" variant="ghost" rightIcon={<FiChevronDown />}>
                  Ertele
                </MenuButton>
                <MenuList>
                  <MenuItem
                    onClick={() =>
                      void snooze
                        .mutateAsync({ id: entry.id, amount: "1d" })
                        .then(() => toast({ title: "+1 gün", status: "success", duration: 1400 }))
                        .catch((e) =>
                          toast({
                            title: e instanceof Error ? e.message : "Hata",
                            status: "error",
                          })
                        )
                    }
                  >
                    +1 gün
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      void snooze
                        .mutateAsync({ id: entry.id, amount: "1w" })
                        .then(() => toast({ title: "+1 hafta", status: "success", duration: 1400 }))
                        .catch((e) =>
                          toast({
                            title: e instanceof Error ? e.message : "Hata",
                            status: "error",
                          })
                        )
                    }
                  >
                    +1 hafta
                  </MenuItem>
                </MenuList>
              </Menu>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void update.mutateAsync({ id: entry.id, status: "DONE" }).catch((e) =>
                    toast({ title: e instanceof Error ? e.message : "Hata", status: "error" })
                  )
                }
              >
                Tamamla
              </Button>
            </>
          )}
          <DeleteConfirmButton
            message={`"${entry.title}" silinsin mi?`}
            isLoading={remove.isPending}
            onConfirm={async () => {
              await remove.mutateAsync(entry.id);
            }}
          />
        </HStack>
      </HStack>
    </Box>
  );
}
