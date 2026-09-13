import { Box, Button, Code, HStack, Text, VStack, useToast } from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";

const ADD_TEMPLATE = `http://<tailscale-ip>:3081/api/voice/add?key=SENIN_KEY&q=SöylediğimMetin`;
const TODAY_TEMPLATE = `http://<tailscale-ip>:3081/api/voice/today?key=SENIN_KEY`;
const COMPLETE_TEMPLATE = `http://<tailscale-ip>:3081/api/voice/complete?key=SENIN_KEY&q=BaşlıkParçası`;

export function VoicePage() {
  const toast = useToast();

  function copy(text: string, title: string) {
    void navigator.clipboard.writeText(text).then(() =>
      toast({ title, status: "success", duration: 1500 })
    );
  }

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Text className="page-title" fontSize="3xl" color="brand.500">
          Siri / Kestirmeler
        </Text>
        <Text color="ink.400" mt={1}>
          Tailscale üzerinden telefonda sesli ekleme, sorgu ve tamamlama.
        </Text>
      </Box>

      <Box className="panel" p={6}>
        <VStack align="stretch" spacing={4}>
          <Text fontWeight="700">Kurulum</Text>
          <Text fontSize="sm" color="ink.500" lineHeight="1.7">
            1. Root <Code>.env</Code> içine <Code>VOICE_API_KEY</Code> koy.
            <br />
            2. Backend’i Tailscale ile erişilebilir bırak (port <Code>3081</Code>).
            <br />
            3. iPhone Kestirmeler’de yeni kestirme:{" "}
            <strong>URL içeriğini al</strong>.
            <br />
            4. Aşağıdaki URL’lerden birini kullan; cevaptaki <Code>message</Code> /{" "}
            <Code>speak</Code> alanını Siri’ye okut.
          </Text>
        </VStack>
      </Box>

      <Box className="panel" p={6}>
        <VStack align="stretch" spacing={3}>
          <Text fontWeight="700">Ekle</Text>
          <Text fontSize="sm" color="ink.500">
            Siri: “Hayatıma ekle …” — metni <Code>q</Code> parametresine bağla.
          </Text>
          <Code whiteSpace="pre-wrap" p={3} borderRadius="lg">
            {ADD_TEMPLATE}
          </Code>
          <Button size="sm" variant="outline" alignSelf="start" onClick={() => copy(ADD_TEMPLATE, "Ekle şablonu kopyalandı")}>
            Şablonu kopyala
          </Button>
        </VStack>
      </Box>

      <Box className="panel" p={6}>
        <VStack align="stretch" spacing={3}>
          <Text fontWeight="700">Bugün ne var?</Text>
          <Text fontSize="sm" color="ink.500">
            Siri: “Bugün hayatımda ne var?” — açık kayıtları okur (ekleme yapmaz).
          </Text>
          <Code whiteSpace="pre-wrap" p={3} borderRadius="lg">
            {TODAY_TEMPLATE}
          </Code>
          <Button size="sm" variant="outline" alignSelf="start" onClick={() => copy(TODAY_TEMPLATE, "Bugün şablonu kopyalandı")}>
            Şablonu kopyala
          </Button>
        </VStack>
      </Box>

      <Box className="panel" p={6}>
        <VStack align="stretch" spacing={3}>
          <Text fontWeight="700">Tamamla</Text>
          <Text fontSize="sm" color="ink.500">
            Siri: “Hayatımda X’i tamamla” — başlık / ham metinde eşleşen açık kaydı DONE yapar.
          </Text>
          <Code whiteSpace="pre-wrap" p={3} borderRadius="lg">
            {COMPLETE_TEMPLATE}
          </Code>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copy(COMPLETE_TEMPLATE, "Tamamla şablonu kopyalandı")}
            >
              Şablonu kopyala
            </Button>
          </HStack>
        </VStack>
      </Box>

      <Box className="panel" p={6}>
        <Text fontSize="sm" color="ink.400" mb={3}>
          Örnek okuma: “Proje teslimi adlı son tarih eklendi, kategori İş, tarih 20 Eylül
          Cumartesi.”
        </Text>
        <Link to="/" style={{ color: "var(--chakra-colors-brand-600)", fontWeight: 700 }}>
          Panele dön
        </Link>
      </Box>
    </VStack>
  );
}
