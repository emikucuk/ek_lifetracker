import { logger } from "../config/logger.js";
import { emailSettingsService } from "./EmailSettingsService.js";
import { emailService } from "./EmailService.js";

/**
 * Periodically checks whether it's time for the daily digest email.
 * Runs every 15 minutes; sends once per local calendar day at digestHour.
 */
export class EmailReminderScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, 15 * 60_000);
    logger.info("Email reminder scheduler started");
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    try {
      const settings = await emailSettingsService.getSecret();
      if (!settings.enabled) return;
      if (!settings.toEmail || !settings.host) return;

      const now = new Date();
      if (now.getHours() !== settings.digestHour) return;

      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const last = await emailSettingsService.getMeta("email.lastDigestDay");
      if (last === todayKey) return;

      const result = await emailService.sendDigest();
      if (result.ok) {
        await emailSettingsService.setMeta("email.lastDigestDay", todayKey);
        logger.info("Daily digest email sent", { counts: result.counts });
      }
    } catch (error) {
      logger.error("Email digest tick failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const emailReminderScheduler = new EmailReminderScheduler();
