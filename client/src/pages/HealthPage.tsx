import { Box, Text, VStack } from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";
import { HealthPanel } from "../components/HealthPanel";

export function HealthPage() {
  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Text className="page-title" fontSize="3xl" color="brand.500">
          Sağlık
        </Text>
        <Text color="ink.400" mt={1}>
          Servis durumu, Ollama ping ve yerel hatırlatma bildirimleri.
        </Text>
      </Box>
      <HealthPanel />
      <Text fontSize="sm" color="ink.400">
        Parser ayarları için{" "}
        <Link to="/settings" style={{ fontWeight: 700, color: "var(--chakra-colors-brand-600)" }}>
          Ayarlar
        </Link>
        .
      </Text>
    </VStack>
  );
}
