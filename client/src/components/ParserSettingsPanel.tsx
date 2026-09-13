import {
  Badge,
  Box,
  Button,
  HStack,
  Input,
  Select,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  useAppSettings,
  useOllamaStatus,
  useUpdateAppSettings,
} from "../hooks/useLifeApi";

export function ParserSettingsPanel() {
  const { data: settings, isLoading } = useAppSettings();
  const { data: ollama, refetch, isFetching } = useOllamaStatus();
  const update = useUpdateAppSettings();
  const toast = useToast();

  const [parserMode, setParserMode] = useState<"rules" | "hybrid" | "always_llm">("hybrid");
  const [confidence, setConfidence] = useState("0.7");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (!settings) return;
    setParserMode(settings.parserMode);
    setConfidence(String(settings.parserLlmMinConfidence));
    setModel(settings.ollamaModel);
  }, [settings]);

  async function handleSave() {
    try {
      await update.mutateAsync({
        parserMode,
        parserLlmMinConfidence: Number(confidence),
        ollamaModel: model.trim() || undefined,
      });
      toast({ title: "Parser ayarları kaydedildi", status: "success", duration: 1800 });
      void refetch();
    } catch (error) {
      toast({
        title: "Kaydedilemedi",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  return (
    <Box className="panel" p={6}>
      <Text fontWeight="700" mb={1}>
        Parser & Ollama
      </Text>
      <Text fontSize="sm" color="ink.400" mb={4}>
        Motor tercihi ve güven eşiği panelden; Ollama durumu anlık.
      </Text>

      {isLoading ? (
        <Text color="ink.400">Yükleniyor…</Text>
      ) : (
        <VStack align="stretch" spacing={3}>
          <Box>
            <Text fontSize="sm" fontWeight="700" mb={1}>
              Parse motoru
            </Text>
            <Select
              value={parserMode}
              onChange={(e) =>
                setParserMode(e.target.value as "rules" | "hybrid" | "always_llm")
              }
              bg="white"
            >
              <option value="rules">Sadece kurallar</option>
              <option value="hybrid">Hibrit (önerilen)</option>
              <option value="always_llm">Her zaman LLM</option>
            </Select>
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="700" mb={1}>
              LLM güven eşiği (0–1)
            </Text>
            <Input
              type="number"
              step="0.05"
              min={0}
              max={1}
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              bg="white"
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="700" mb={1}>
              Ollama model
            </Text>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="örn. qwen2.5:7b-instruct"
              bg="white"
            />
          </Box>
          <HStack>
            <Button onClick={() => void handleSave()} isLoading={update.isPending}>
              Kaydet
            </Button>
            <Button variant="outline" onClick={() => void refetch()} isLoading={isFetching}>
              Ollama ping
            </Button>
          </HStack>
        </VStack>
      )}

      <HStack mt={4} spacing={2} flexWrap="wrap">
        <Badge colorScheme={ollama?.ok ? "green" : "red"}>
          {ollama?.ok ? "Ollama açık" : "Ollama kapalı / erişilemiyor"}
        </Badge>
        {ollama?.model && <Badge variant="outline">hedef: {ollama.model}</Badge>}
        {ollama?.ok && (
          <Badge colorScheme={ollama.hasModel ? "green" : "orange"}>
            {ollama.hasModel ? "model hazır" : "model listede yok"}
          </Badge>
        )}
      </HStack>
      {ollama?.models && ollama.models.length > 0 && (
        <Text fontSize="xs" color="ink.400" mt={2}>
          Kurulu: {ollama.models.join(", ")}
        </Text>
      )}
    </Box>
  );
}
