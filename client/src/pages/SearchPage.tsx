import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { EntryRow } from "../components/EntryRow";
import { useEntries } from "../hooks/useLifeApi";

export function SearchPage() {
  const navigate = useNavigate({ from: "/search" });
  const search = useSearch({ from: "/search" }) as { q?: string };
  const [q, setQ] = useState(search.q ?? "");

  useEffect(() => {
    setQ(search.q ?? "");
  }, [search.q]);

  const trimmed = (search.q ?? "").trim();
  const { data, isLoading } = useEntries({
    q: trimmed || undefined,
  });

  const entries = data?.entries ?? [];

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Text className="page-title" fontSize="3xl" color="brand.500">
          Ara
        </Text>
        <Text color="ink.400" mt={1}>
          Başlık, ham metin ve notlarda ara.
        </Text>
      </Box>

      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <FiSearch />
        </InputLeftElement>
        <Input
          value={q}
          bg="white"
          placeholder="örn. proje, doktor, fatura…"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void navigate({
                to: "/search",
                search: { q: q.trim() || undefined },
              });
            }
          }}
        />
      </InputGroup>

      {!trimmed && <Text color="ink.400">Aramak için yazıp Enter’a bas.</Text>}
      {trimmed && isLoading && <Text color="ink.400">Aranıyor…</Text>}
      {trimmed && !isLoading && entries.length === 0 && (
        <Text color="ink.400">Sonuç yok.</Text>
      )}

      <VStack align="stretch" spacing={3}>
        {entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </VStack>
    </VStack>
  );
}
