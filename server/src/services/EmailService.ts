import { createRequire } from "node:module";
import type nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ValidationError } from "../errors/AppError.js";
import { emailSettingsService } from "./EmailSettingsService.js";
import { buildDigestEmail, buildTestEmail, type MailEntryRow } from "./emailTemplates.js";
import { entryRepository } from "../repositories/EntryRepository.js";
import { addDays, endOfDay, startOfDay } from "./dateShift.js";

const require = createRequire(import.meta.url);
const createTransport = (require("nodemailer") as typeof nodemailer).createTransport;

function assertConfigured(settings: Awaited<ReturnType<typeof emailSettingsService.getSecret>>) {
  if (!settings.host) throw new ValidationError("SMTP host gerekli");
  if (!settings.toEmail) throw new ValidationError("Alıcı e-posta (to) gerekli");
  const from = settings.fromEmail || settings.user;
  if (!from) throw new ValidationError("Gönderen e-posta (from) veya SMTP kullanıcı gerekli");
  return from;
}

export class EmailService {
  async sendRaw(opts: { subject: string; text: string; html: string }) {
    const settings = await emailSettingsService.getSecret();
    const fromEmail = assertConfigured(settings);
    const transporter = createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.user
        ? {
            user: settings.user,
            pass: settings.pass,
          }
        : undefined,
    });

    const info = await transporter.sendMail({
      from: settings.fromName ? `"${settings.fromName}" <${fromEmail}>` : fromEmail,
      to: settings.toEmail,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });

    logger.info("Email sent", { messageId: info.messageId, to: settings.toEmail });
    return { ok: true as const, messageId: info.messageId };
  }

  async sendTest() {
    const panelUrl = env.clientOrigin;
    const mail = buildTestEmail(panelUrl);
    return this.sendRaw(mail);
  }

  async collectDigestBuckets(leadDays: number): Promise<{
    overdue: MailEntryRow[];
    dueSoon: MailEntryRow[];
    reminders: MailEntryRow[];
  }> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const horizon = endOfDay(addDays(now, leadDays));

    const open = await entryRepository.list({ status: "OPEN" });
    const overdue: MailEntryRow[] = [];
    const dueSoon: MailEntryRow[] = [];
    const reminders: MailEntryRow[] = [];

    for (const e of open) {
      const row: MailEntryRow = {
        title: e.title,
        kind: e.kind,
        category: e.category?.name ?? null,
        dueAt: e.dueAt,
        remindAt: e.remindAt,
        priority: e.priority,
      };

      if (e.dueAt) {
        const due = new Date(e.dueAt);
        if (due < todayStart) overdue.push(row);
        else if (due <= horizon) dueSoon.push(row);
      }

      if (e.remindAt) {
        const r = new Date(e.remindAt);
        if (r >= todayStart && r <= horizon) {
          reminders.push(row);
        }
      }
    }

    const byDue = (a: MailEntryRow, b: MailEntryRow) => {
      const ta = new Date(a.dueAt ?? a.remindAt ?? 0).getTime();
      const tb = new Date(b.dueAt ?? b.remindAt ?? 0).getTime();
      return ta - tb;
    };
    overdue.sort(byDue);
    dueSoon.sort(byDue);
    reminders.sort(byDue);

    return { overdue, dueSoon, reminders };
  }

  async sendDigest(opts?: { force?: boolean }) {
    const settings = await emailSettingsService.getSecret();
    if (!settings.enabled && !opts?.force) {
      return { ok: false as const, skipped: true, message: "E-posta bildirimleri kapalı" };
    }

    const buckets = await this.collectDigestBuckets(settings.leadDays);
    const mail = buildDigestEmail({
      generatedAt: new Date(),
      leadDays: settings.leadDays,
      ...buckets,
      panelUrl: env.clientOrigin,
    });

    const result = await this.sendRaw(mail);
    await emailSettingsService.setMeta("email.lastDigestAt", new Date().toISOString());
    return {
      ...result,
      counts: {
        overdue: buckets.overdue.length,
        dueSoon: buckets.dueSoon.length,
        reminders: buckets.reminders.length,
      },
    };
  }
}

export const emailService = new EmailService();
