import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { useHealth } from "../hooks/useLifeApi";

const NOTIFY_KEY = "lt-browser-notifications";

export function getNotificationsEnabled(): boolean {
  try {
    return localStorage.getItem(NOTIFY_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNotificationsEnabled(on: boolean) {
  try {
    localStorage.setItem(NOTIFY_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function HealthPanel() {
  const { data, isLoading, isFetching, refetch } = useHealth();
  const [notifyOn, setNotifyOn] = useState(getNotificationsEnabled);

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotificationsEnabled(true);
      setNotifyOn(true);
      new Notification("EK Life", { body: "Yerel hatırlatmalar açık." });
    }
  }

  function disableNotifications() {
    setNotificationsEnabled(false);
    setNotifyOn(false);
  }

  return (
    <Box className="panel" p={6}>
      <HStack justify="space-between" mb={1} flexWrap="wrap" gap={2}>
        <Text fontWeight="700">Sağlık</Text>
        <Button size="sm" variant="outline" onClick={() => void refetch()} isLoading={isFetching}>
          Yenile
        </Button>
      </HStack>
      <Text fontSize="sm" color="ink.400" mb={4}>
        API, SQLite ve Ollama durumu. Hatırlatmalar tarayıcı Notification API ile yerelde çalar
        (panel açıkken).
      </Text>

      {isLoading && <Text color="ink.400">Kontrol ediliyor…</Text>}
      {data && (
        <VStack align="stretch" spacing={3}>
          <HStack flexWrap="wrap" spacing={2}>
            <Badge colorScheme={data.ok ? "green" : "red"}>
              API {data.ok ? "ok" : "hata"}
            </Badge>
            <Badge colorScheme={data.db === "up" ? "green" : "red"}>DB {data.db}</Badge>
            <Badge colorScheme={data.ollama.ok ? "green" : "orange"}>
              Ollama {data.ollama.ok ? "açık" : "kapalı"}
            </Badge>
            {data.ollama.ok && (
              <Badge colorScheme={data.ollama.hasModel ? "green" : "orange"}>
                {data.ollama.hasModel ? "model hazır" : "model yok"}
              </Badge>
            )}
          </HStack>
          <Text fontSize="sm" color="ink.500">
            Hedef model: {data.ollama.model}
            {data.ollama.models.length > 0 && (
              <> · Kurulu: {data.ollama.models.join(", ")}</>
            )}
          </Text>
          {data.ollama.error && (
            <Text fontSize="sm" color="red.500">
              {data.ollama.error}
            </Text>
          )}

          <Box borderTopWidth="1px" borderColor="blackAlpha.100" pt={3}>
            <Text fontSize="sm" fontWeight="700" mb={2}>
              Yerel bildirim stratejisi
            </Text>
            <Text fontSize="sm" color="ink.400" mb={3}>
              `remindAt` dolu açık kayıtlar için panel açıkken tarayıcı bildirimi. Push sunucusu
              yok — bilgisayar uykudayken çalışmaz.
            </Text>
            <HStack>
              {!notifyOn ? (
                <Button size="sm" onClick={() => void enableNotifications()}>
                  Bildirimleri aç
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={disableNotifications}>
                  Bildirimleri kapat
                </Button>
              )}
              <Badge colorScheme={notifyOn ? "green" : "gray"}>
                {notifyOn ? "açık" : "kapalı"}
              </Badge>
            </HStack>
          </Box>
        </VStack>
      )}
    </Box>
  );
}
