import { Box, Text, VStack, Wrap, WrapItem, Button } from "@chakra-ui/react";

const EXAMPLES = [
  "Bugün toplantı oldu",
  "Haftaya proje teslimi var",
  "16 Eylül'e kadar başvur",
  "Bu hafta fatura öde",
];

export function EmptyCaptureHints({
  title = "Henüz kayıt yok",
  onPick,
}: {
  title?: string;
  onPick?: (text: string) => void;
}) {
  return (
    <Box className="panel" p={5}>
      <VStack align="stretch" spacing={3}>
        <Text fontWeight="700" color="ink.700">
          {title}
        </Text>
        <Text fontSize="sm" color="ink.400" lineHeight="1.6">
          Doğal dil yaz; tür ve tarih otomatik çıkar. Virgülle birden fazla kayıt
          ekleyebilirsin.
        </Text>
        <Text fontSize="xs" fontWeight="800" color="ink.500" textTransform="uppercase">
          Örnek cümleler
        </Text>
        <Wrap spacing={2}>
          {EXAMPLES.map((ex) => (
            <WrapItem key={ex}>
              <Button
                size="sm"
                variant="outline"
                fontWeight="600"
                onClick={() => onPick?.(ex)}
                isDisabled={!onPick}
              >
                {ex}
              </Button>
            </WrapItem>
          ))}
        </Wrap>
      </VStack>
    </Box>
  );
}
