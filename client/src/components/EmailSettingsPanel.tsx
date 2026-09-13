import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  useEmailSettings,
  useSendEmailDigest,
  useSendTestEmail,
  useUpdateEmailSettings,
} from "../hooks/useLifeApi";

export function EmailSettingsPanel() {
  const { data, isLoading } = useEmailSettings();
  const update = useUpdateEmailSettings();
  const testMail = useSendTestEmail();
  const digest = useSendEmailDigest();
  const toast = useToast();

  const [enabled, setEnabled] = useState(false);
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(465);
  const [secure, setSecure] = useState(true);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("EK LifeTracker");
  const [toEmail, setToEmail] = useState("");
  const [digestHour, setDigestHour] = useState(8);
  const [leadDays, setLeadDays] = useState(3);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setHost(data.host);
    setPort(data.port);
    setSecure(data.secure);
    setUser(data.user);
    setPass("");
    setFromEmail(data.fromEmail);
    setFromName(data.fromName);
    setToEmail(data.toEmail);
    setDigestHour(data.digestHour);
    setLeadDays(data.leadDays);
  }, [data]);

  async function handleSave() {
    try {
      await update.mutateAsync({
        enabled,
        host,
        port,
        secure,
        user,
        ...(pass.trim() ? { pass: pass.trim() } : {}),
        fromEmail,
        fromName,
        toEmail,
        digestHour,
        leadDays,
      });
      setPass("");
      toast({ title: "E-posta ayarları kaydedildi", status: "success", duration: 1800 });
    } catch (error) {
      toast({
        title: "Kaydedilemedi",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  async function handleTest() {
    try {
      await testMail.mutateAsync();
      toast({ title: "Test maili gönderildi", status: "success", duration: 2500 });
    } catch (error) {
      toast({
        title: "Test maili başarısız",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
        duration: 5000,
      });
    }
  }

  async function handleDigest() {
    try {
      const result = await digest.mutateAsync();
      if ("skipped" in result && result.skipped) {
        toast({ title: result.message ?? "Atlandı", status: "warning" });
        return;
      }
      toast({
        title: "Özet maili gönderildi",
        description:
          "counts" in result && result.counts
            ? `Geciken ${result.counts.overdue} · Yaklaşan ${result.counts.dueSoon} · Hatırlatma ${result.counts.reminders}`
            : undefined,
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Özet gönderilemedi",
        description: error instanceof Error ? error.message : undefined,
        status: "error",
      });
    }
  }

  return (
    <Box className="panel" p={6}>
      <HStack justify="space-between" mb={1} flexWrap="wrap" gap={2}>
        <Text fontWeight="700">E-posta bildirimleri</Text>
        <Badge colorScheme={enabled ? "green" : "gray"}>{enabled ? "açık" : "kapalı"}</Badge>
      </HStack>
      <Text fontSize="sm" color="ink.400" mb={4}>
        Günlük özet şablonu: gecikenler, önümüzdeki N gün deadline’lar ve hatırlatmalar.
        Gmail için uygulama şifresi kullan.
      </Text>

      {isLoading ? (
        <Text color="ink.400">Yükleniyor…</Text>
      ) : (
        <VStack align="stretch" spacing={3}>
          <Checkbox isChecked={enabled} onChange={(e) => setEnabled(e.target.checked)}>
            Bildirimleri aç (her gün belirlenen saatte özet)
          </Checkbox>

          <FormControl>
            <FormLabel fontSize="sm">SMTP host</FormLabel>
            <Input value={host} onChange={(e) => setHost(e.target.value)} bg="white" />
          </FormControl>

          <HStack align="start" spacing={3} flexWrap="wrap">
            <FormControl maxW="140px">
              <FormLabel fontSize="sm">Port</FormLabel>
              <NumberInput
                value={port}
                min={1}
                max={65535}
                onChange={(_, n) => setPort(Number.isFinite(n) ? n : port)}
              >
                <NumberInputField bg="white" />
              </NumberInput>
            </FormControl>
            <FormControl maxW="200px">
              <FormLabel fontSize="sm">TLS / SSL</FormLabel>
              <Select
                value={secure ? "1" : "0"}
                onChange={(e) => setSecure(e.target.value === "1")}
                bg="white"
              >
                <option value="1">Açık (465 önerilir)</option>
                <option value="0">Kapalı (587 STARTTLS)</option>
              </Select>
            </FormControl>
          </HStack>

          <FormControl>
            <FormLabel fontSize="sm">SMTP kullanıcı</FormLabel>
            <Input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="ornek@gmail.com"
              bg="white"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">SMTP şifre / uygulama şifresi</FormLabel>
            <Input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder={data?.passSet ? "Kayıtlı (değiştirmek için yaz)" : "••••••••"}
              bg="white"
              autoComplete="new-password"
            />
            <FormHelperText>Boş bırakırsan mevcut şifre korunur.</FormHelperText>
          </FormControl>

          <HStack align="start" spacing={3} flexWrap="wrap">
            <FormControl flex={1} minW="200px">
              <FormLabel fontSize="sm">Gönderen (from)</FormLabel>
              <Input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="aynı Gmail adresi"
                bg="white"
              />
            </FormControl>
            <FormControl flex={1} minW="160px">
              <FormLabel fontSize="sm">Gönderen adı</FormLabel>
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                bg="white"
              />
            </FormControl>
          </HStack>

          <FormControl>
            <FormLabel fontSize="sm">Alıcı (kendin)</FormLabel>
            <Input
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="bildirim@adresin.com"
              bg="white"
            />
          </FormControl>

          <HStack spacing={3} flexWrap="wrap">
            <FormControl maxW="160px">
              <FormLabel fontSize="sm">Özet saati</FormLabel>
              <NumberInput
                value={digestHour}
                min={0}
                max={23}
                onChange={(_, n) => setDigestHour(Number.isFinite(n) ? n : digestHour)}
              >
                <NumberInputField bg="white" />
              </NumberInput>
              <FormHelperText>0–23, sunucu saati</FormHelperText>
            </FormControl>
            <FormControl maxW="180px">
              <FormLabel fontSize="sm">Kaç gün önceden</FormLabel>
              <NumberInput
                value={leadDays}
                min={0}
                max={30}
                onChange={(_, n) => setLeadDays(Number.isFinite(n) ? n : leadDays)}
              >
                <NumberInputField bg="white" />
              </NumberInput>
              <FormHelperText>Deadline penceresi</FormHelperText>
            </FormControl>
          </HStack>

          <HStack flexWrap="wrap" spacing={2} pt={1}>
            <Button onClick={() => void handleSave()} isLoading={update.isPending}>
              Kaydet
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleTest()}
              isLoading={testMail.isPending}
            >
              Test maili gönder
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDigest()}
              isLoading={digest.isPending}
            >
              Özeti şimdi gönder
            </Button>
          </HStack>
        </VStack>
      )}
    </Box>
  );
}
