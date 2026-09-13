import {
  Badge,
  Box,
  Button,
  Code,
  HStack,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useRef } from "react";
import { downloadBackup } from "../api/life";
import {
  useAutoBackupStatus,
  useImportBackup,
  useRunAutoBackup,
} from "../hooks/useLifeApi";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const importBackup = useImportBackup();
  const autoStatus = useAutoBackupStatus();
  const runAuto = useRunAutoBackup();
  const toast = useToast();

  async function handleExport(format: "json" | "md" | "csv") {
    try {
      await downloadBackup(format);
      toast({ title: "İndirildi", status: "success", duration: 1600 });
    } catch (error) {
      toast({
        title: "Dışa aktarılamadı",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  async function handleImport(mode: "merge" | "replace", file: File) {
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as unknown;
      const result = await importBackup.mutateAsync({ mode, backup });
      toast({
        title: mode === "replace" ? "Yedek geri yüklendi" : "Yedek birleştirildi",
        description: `${result.entriesCreated} kayıt · ${result.hintsCreated} ipucu`,
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "İçe aktarılamadı",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  async function handleAutoNow() {
    try {
      const result = await runAuto.mutateAsync();
      toast({
        title: result.skipped ? "Atlandı" : "Sıkıştırılmış yedek alındı",
        description: result.skipped
          ? result.message
          : `${result.entryCount} kayıt → ${result.zipPath ?? result.jsonPath}${
              result.bytesRaw && result.bytesZip
                ? ` (${formatBytes(result.bytesRaw)} → ${formatBytes(result.bytesZip)})`
                : ""
            }`,
        status: result.ok ? "success" : "warning",
        duration: 4000,
      });
    } catch (error) {
      toast({
        title: "Otomatik yedek başarısız",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  const auto = autoStatus.data;

  return (
    <Box className="panel" p={6}>
      <Text fontWeight="700" mb={1}>
        Yedek & dışa aktar
      </Text>
      <Text fontSize="sm" color="ink.400" mb={4}>
        Arşivin için otomatik yedek açık: sunucu açılışında, her{" "}
        {auto?.intervalHours ?? 6} saatte ve kapanışta. JSON önce gzip, sonra ZIP
        (SQLite ile). Klasör OneDrive altında senkronlanır.
      </Text>

      <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="lg" p={3} mb={5}>
        <HStack justify="space-between" flexWrap="wrap" gap={2} mb={2}>
          <Text fontSize="sm" fontWeight="700">
            Otomatik arşiv yedeği
          </Text>
          <Badge colorScheme={auto?.enabled ? "green" : "gray"}>
            {auto?.enabled ? "açık" : "kapalı"}
          </Badge>
        </HStack>
        {autoStatus.isLoading && <Text fontSize="sm" color="ink.400">Durum yükleniyor…</Text>}
        {auto && (
          <VStack align="stretch" spacing={1} mb={3}>
            <Text fontSize="sm" color="ink.500">
              Klasör: <Code fontSize="xs">{auto.dir}</Code>
            </Text>
            <Text fontSize="sm" color="ink.500">
              Son yedek:{" "}
              {auto.lastBackupAt
                ? new Date(auto.lastBackupAt).toLocaleString("tr-TR")
                : "henüz yok"}
              {auto.lastReason ? ` (${auto.lastReason})` : ""}
            </Text>
            <Text fontSize="xs" color="ink.400">
              ZIP saklama:{" "}
              {auto.keep > 0
                ? `son ${auto.keep} sıkıştırılmış yedek (eski zip silinir)`
                : "sınırsız zip"}
              {" "}
              · Canlı kayıtlar DB’de kalır, silinmez · Aralık: {auto.intervalHours} saat ·
              gzip + ZIP
            </Text>
            {auto.recent.length > 0 && (
              <Text fontSize="xs" color="ink.400">
                Son dosyalar:{" "}
                {auto.recent
                  .slice(0, 3)
                  .map((r) => `${r.name} (${formatBytes(r.size)})`)
                  .join(" · ")}
              </Text>
            )}
          </VStack>
        )}
        <Button size="sm" onClick={() => void handleAutoNow()} isLoading={runAuto.isPending}>
          Şimdi yedekle
        </Button>
      </Box>

      <Text fontSize="sm" fontWeight="700" mb={2}>
        Elle dışa aktar
      </Text>
      <HStack flexWrap="wrap" gap={2} mb={5}>
        <Button size="sm" onClick={() => void handleExport("json")}>
          JSON yedek
        </Button>
        <Button size="sm" variant="outline" onClick={() => void handleExport("md")}>
          Markdown
        </Button>
        <Button size="sm" variant="outline" onClick={() => void handleExport("csv")}>
          CSV
        </Button>
      </HStack>

      <Text fontSize="sm" fontWeight="700" mb={2}>
        Geri yükle (JSON)
      </Text>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          const mode = (e.target.dataset.mode as "merge" | "replace") ?? "merge";
          e.target.value = "";
          if (file) void handleImport(mode, file);
        }}
      />
      <HStack flexWrap="wrap" gap={2}>
        <Button
          size="sm"
          variant="outline"
          isLoading={importBackup.isPending}
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.dataset.mode = "merge";
              fileRef.current.click();
            }
          }}
        >
          Birleştir (merge)
        </Button>
        <Button
          size="sm"
          colorScheme="red"
          variant="outline"
          isLoading={importBackup.isPending}
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.dataset.mode = "replace";
              fileRef.current.click();
            }
          }}
        >
          Değiştir (replace)
        </Button>
      </HStack>
      <Text fontSize="xs" color="ink.400" mt={2}>
        Replace: kullanıcı kategorileri + tüm kayıtlar/ipuçları silinir, sonra yedek yazılır.
        Otomatik dosyalar: <Code fontSize="xs">backups/lifetracker-*.zip</Code> (içinde
        backup.json.gz + backup.db)
      </Text>
    </Box>
  );
}
