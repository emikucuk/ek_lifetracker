import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const emailSettingsUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  host: z.string().trim().min(1).max(200).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  secure: z.boolean().optional(),
  user: z.string().trim().max(200).optional(),
  /** Empty string keeps existing password */
  pass: z.string().max(500).optional(),
  fromEmail: z.union([z.string().trim().email(), z.literal("")]).optional(),
  fromName: z.string().trim().max(120).optional(),
  toEmail: z.union([z.string().trim().email(), z.literal("")]).optional(),
  digestHour: z.number().int().min(0).max(23).optional(),
  leadDays: z.number().int().min(0).max(30).optional(),
});

export type EmailSettingsUpdate = z.infer<typeof emailSettingsUpdateSchema>;

export interface EmailSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  /** Never exposed fully in public responses */
  passSet: boolean;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  digestHour: number;
  leadDays: number;
}

export interface EmailSettingsSecret extends EmailSettings {
  pass: string;
}

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

function asBool(v: string | null, fallback: boolean): boolean {
  if (v == null) return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

function asInt(v: string | null, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export class EmailSettingsService {
  parseUpdate(body: unknown) {
    return emailSettingsUpdateSchema.parse(body);
  }

  async getPublic(): Promise<EmailSettings> {
    const full = await this.getSecret();
    const { pass: _pass, ...rest } = full;
    return rest;
  }

  async getSecret(): Promise<EmailSettingsSecret> {
    const [
      enabled,
      host,
      port,
      secure,
      user,
      pass,
      fromEmail,
      fromName,
      toEmail,
      digestHour,
      leadDays,
    ] = await Promise.all([
      getSetting("email.enabled"),
      getSetting("email.host"),
      getSetting("email.port"),
      getSetting("email.secure"),
      getSetting("email.user"),
      getSetting("email.pass"),
      getSetting("email.fromEmail"),
      getSetting("email.fromName"),
      getSetting("email.toEmail"),
      getSetting("email.digestHour"),
      getSetting("email.leadDays"),
    ]);

    const passValue = pass ?? "";
    return {
      enabled: asBool(enabled, false),
      host: host ?? "smtp.gmail.com",
      port: asInt(port, 465),
      secure: asBool(secure, true),
      user: user ?? "",
      pass: passValue,
      passSet: passValue.length > 0,
      fromEmail: fromEmail ?? "",
      fromName: fromName ?? "EK LifeTracker",
      toEmail: toEmail ?? "",
      digestHour: asInt(digestHour, 8),
      leadDays: asInt(leadDays, 3),
    };
  }

  async update(input: EmailSettingsUpdate): Promise<EmailSettings> {
    if (input.enabled !== undefined) await setSetting("email.enabled", input.enabled ? "1" : "0");
    if (input.host !== undefined) await setSetting("email.host", input.host.trim());
    if (input.port !== undefined) await setSetting("email.port", String(input.port));
    if (input.secure !== undefined) await setSetting("email.secure", input.secure ? "1" : "0");
    if (input.user !== undefined) await setSetting("email.user", input.user.trim());
    if (input.pass !== undefined && input.pass.length > 0) {
      await setSetting("email.pass", input.pass);
    }
    if (input.fromEmail !== undefined) await setSetting("email.fromEmail", input.fromEmail.trim());
    if (input.fromName !== undefined) await setSetting("email.fromName", input.fromName.trim());
    if (input.toEmail !== undefined) await setSetting("email.toEmail", input.toEmail.trim());
    if (input.digestHour !== undefined) await setSetting("email.digestHour", String(input.digestHour));
    if (input.leadDays !== undefined) await setSetting("email.leadDays", String(input.leadDays));
    return this.getPublic();
  }

  async getMeta(key: string) {
    return getSetting(key);
  }

  async setMeta(key: string, value: string) {
    await setSetting(key, value);
  }
}

export const emailSettingsService = new EmailSettingsService();
