import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

export const parserModeSchema = z.enum(["rules", "hybrid", "always_llm"]);
export type ParserMode = z.infer<typeof parserModeSchema>;

const settingsUpdateSchema = z.object({
  parserMode: parserModeSchema.optional(),
  parserLlmMinConfidence: z.number().min(0).max(1).optional(),
  ollamaModel: z.string().trim().min(1).optional(),
});

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;

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

export class SettingsService {
  parseUpdate(body: unknown) {
    return settingsUpdateSchema.parse(body);
  }

  async getPublic() {
    const [parserMode, confidence, model] = await Promise.all([
      getSetting("parserMode"),
      getSetting("parserLlmMinConfidence"),
      getSetting("ollamaModel"),
    ]);

    return {
      parserMode: (parserMode as ParserMode | null) ?? "hybrid",
      parserLlmMinConfidence: confidence
        ? Number(confidence)
        : env.parserLlmMinConfidence,
      ollamaModel: model || env.ollamaModel,
      ollamaBaseUrl: env.ollamaBaseUrl,
    };
  }

  async update(input: SettingsUpdate) {
    if (input.parserMode !== undefined) {
      await setSetting("parserMode", input.parserMode);
    }
    if (input.parserLlmMinConfidence !== undefined) {
      await setSetting("parserLlmMinConfidence", String(input.parserLlmMinConfidence));
    }
    if (input.ollamaModel !== undefined) {
      await setSetting("ollamaModel", input.ollamaModel);
    }
    return this.getPublic();
  }

  async getParserRuntime() {
    const settings = await this.getPublic();
    return settings;
  }

  async pingOllama() {
    const settings = await this.getPublic();
    const base = settings.ollamaBaseUrl.replace(/\/$/, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(`${base}/api/tags`, { signal: controller.signal });
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          model: settings.ollamaModel,
          models: [] as string[],
        };
      }
      const body = (await res.json()) as { models?: Array<{ name?: string }> };
      const models = (body.models ?? []).map((m) => m.name).filter(Boolean) as string[];
      const hasModel = models.some(
        (name) => name === settings.ollamaModel || name.startsWith(`${settings.ollamaModel}:`)
      );
      return {
        ok: true,
        status: 200,
        model: settings.ollamaModel,
        hasModel,
        models: models.slice(0, 20),
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        model: settings.ollamaModel,
        models: [] as string[],
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export const settingsService = new SettingsService();
