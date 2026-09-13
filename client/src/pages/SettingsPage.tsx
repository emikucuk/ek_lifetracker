import {
  Badge,
  Box,
  Grid,
  HStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CategoryManager } from "../components/CategoryManager";
import { BackupPanel } from "../components/BackupPanel";
import { ParserSettingsPanel } from "../components/ParserSettingsPanel";
import { ParserSmokePanel } from "../components/ParserSmokePanel";
import { HealthPanel } from "../components/HealthPanel";
import { EmailSettingsPanel } from "../components/EmailSettingsPanel";
import { useStats } from "../hooks/useLifeApi";

const TAB_KEYS = ["ozet", "ayristirici", "eposta", "kategoriler", "yedek", "sistem"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  ozet: "Özet",
  ayristirici: "Ayrıştırıcı",
  eposta: "E-posta",
  kategoriler: "Kategoriler",
  yedek: "Yedek",
  sistem: "Sistem",
};

function readTabFromHash(): TabKey {
  const raw = window.location.hash.replace(/^#/, "").toLowerCase();
  return (TAB_KEYS as readonly string[]).includes(raw) ? (raw as TabKey) : "ozet";
}

export function SettingsPage() {
  const { data: stats } = useStats();
  const [tab, setTab] = useState<TabKey>(() =>
    typeof window !== "undefined" ? readTabFromHash() : "ozet"
  );

  const tabIndex = useMemo(() => TAB_KEYS.indexOf(tab), [tab]);

  useEffect(() => {
    const onHash = () => setTab(readTabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function selectTab(index: number) {
    const key = TAB_KEYS[index] ?? "ozet";
    setTab(key);
    const next = `#${key}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", `${window.location.pathname}${next}`);
    }
  }

  return (
    <VStack align="stretch" spacing={5} w="100%">
      <Box>
        <Text className="page-title" fontSize={{ base: "2xl", md: "3xl" }} color="brand.500">
          Ayarlar
        </Text>
        <Text color="ink.400" mt={1} fontSize={{ base: "sm", md: "md" }}>
          Bölümler sekmelere ayrıldı — her kart full genişlikte düzenlenir.
        </Text>
      </Box>

      <Tabs
        index={tabIndex}
        onChange={selectTab}
        variant="soft-rounded"
        colorScheme="green"
        isLazy
        w="100%"
      >
        <TabList
          gap={2}
          overflowX="auto"
          overflowY="hidden"
          flexWrap="nowrap"
          pb={1}
          mb={2}
          css={{
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { height: "4px" },
          }}
        >
          {TAB_KEYS.map((key) => (
            <Tab
              key={key}
              flexShrink={0}
              fontSize={{ base: "sm", md: "md" }}
              px={{ base: 3, md: 4 }}
              whiteSpace="nowrap"
            >
              {TAB_LABELS[key]}
            </Tab>
          ))}
        </TabList>

        <TabPanels>
          <TabPanel px={0} pt={3}>
            <Grid
              templateColumns={{ base: "1fr", lg: "1.2fr 1fr" }}
              gap={4}
              alignItems="start"
            >
              <Box className="panel" p={{ base: 4, md: 6 }}>
                <Text fontWeight="700" mb={3}>
                  Özet
                </Text>
                <HStack spacing={3} flexWrap="wrap">
                  <Badge>Toplam {stats?.total ?? 0}</Badge>
                  <Badge colorScheme="green">Açık {stats?.open ?? 0}</Badge>
                  <Badge colorScheme="gray">Tamam {stats?.done ?? 0}</Badge>
                  {(stats?.needsReview ?? 0) > 0 && (
                    <Badge colorScheme="orange">Gözden geçir {stats?.needsReview}</Badge>
                  )}
                </HStack>
                <Text fontSize="sm" color="ink.500" mt={4}>
                  Otomatik çalışan sistem; kategoriler, yedek ve bildirimler diğer sekmelerde.
                </Text>
              </Box>

              <Box className="panel" p={{ base: 4, md: 6 }}>
                <Text fontWeight="700" mb={3}>
                  Hızlı linkler
                </Text>
                <VStack align="stretch" spacing={2}>
                  <Link to="/health" style={linkStyle}>
                    Sağlık durumu
                  </Link>
                  <Link to="/trash" style={linkStyle}>
                    Çöp kutusu
                  </Link>
                  <Link to="/voice" style={linkStyle}>
                    Siri / ses kurulumu
                  </Link>
                  <Text
                    as="button"
                    textAlign="left"
                    fontWeight="700"
                    color="brand.600"
                    onClick={() => selectTab(TAB_KEYS.indexOf("eposta"))}
                  >
                    E-posta bildirimleri →
                  </Text>
                </VStack>
              </Box>
            </Grid>
          </TabPanel>

          <TabPanel px={0} pt={3}>
            <Grid
              templateColumns={{ base: "1fr", xl: "1fr 1fr" }}
              gap={4}
              alignItems="start"
            >
              <ParserSettingsPanel />
              <ParserSmokePanel />
            </Grid>
          </TabPanel>

          <TabPanel px={0} pt={3}>
            <EmailSettingsPanel />
          </TabPanel>

          <TabPanel px={0} pt={3}>
            <CategoryManager />
          </TabPanel>

          <TabPanel px={0} pt={3}>
            <BackupPanel />
          </TabPanel>

          <TabPanel px={0} pt={3}>
            <Grid
              templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
              gap={4}
              alignItems="start"
            >
              <HealthPanel />
              <Box className="panel" p={{ base: 4, md: 6 }}>
                <Text fontWeight="700" mb={2}>
                  Bağlantılar
                </Text>
                <Text fontSize="sm" color="ink.500" lineHeight="1.8">
                  Panel: <CodeLike>http://localhost:5181</CodeLike>
                  <br />
                  API: <CodeLike>http://localhost:3081</CodeLike>
                  <br />
                  Voice key: root <CodeLike>.env → VOICE_API_KEY</CodeLike>
                  <br />
                  Ollama model: root <CodeLike>.env → OLLAMA_MODEL</CodeLike>
                </Text>
              </Box>
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}

const linkStyle: CSSProperties = {
  fontWeight: 700,
  color: "var(--chakra-colors-brand-600)",
};

function CodeLike({ children }: { children: string }) {
  return (
    <Text as="span" fontFamily="mono" fontSize="sm" color="brand.700">
      {children}
    </Text>
  );
}
