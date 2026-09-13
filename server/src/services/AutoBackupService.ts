import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  copyFile,
  unlink,
  stat,
  rm,
} from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { dirname, join, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { ZipArchive } from "archiver";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { backupService } from "./BackupService.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../..");

export type AutoBackupReason = "startup" | "interval" | "shutdown" | "manual";

export interface AutoBackupResult {
  ok: boolean;
  reason: AutoBackupReason;
  /** Final compressed archive (.zip) */
  zipPath: string;
  /** @deprecated alias of zipPath for older clients */
  jsonPath: string;
  dbIncluded: boolean;
  exportedAt: string;
  entryCount: number;
  bytesRaw: number;
  bytesZip: number;
  skipped?: boolean;
  message?: string;
}

export interface AutoBackupStatus {
  enabled: boolean;
  dir: string;
  intervalHours: number;
  keep: number;
  lastBackupAt: string | null;
  lastReason: AutoBackupReason | null;
  lastZipPath: string | null;
  lastJsonPath: string | null;
  recent: Array<{ name: string; mtime: string; size: number }>;
}

function resolveBackupDir(): string {
  const configured = env.autoBackupDir.trim();
  if (!configured) return join(projectRoot, "backups");
  return isAbsolute(configured) ? configured : resolve(projectRoot, configured);
}

function resolveSqlitePath(): string | null {
  const raw = env.databaseUrl;
  const match = raw.match(/^file:(.+)$/i);
  if (!match?.[1]) return null;
  const filePath = match[1];
  const prismaDir = resolve(__dirname, "../../prisma");
  if (!isAbsolute(filePath)) {
    const candidates = [
      resolve(prismaDir, filePath),
      resolve(process.cwd(), filePath),
      resolve(projectRoot, filePath),
      resolve(projectRoot, "server", filePath),
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    return candidates[0]!;
  }
  return filePath;
}

function stamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function createZip(zipPath: string, files: Array<{ name: string; path: string; store?: boolean }>): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const output = createWriteStream(zipPath);
    // archiver v8: named ZipArchive class (no default callable export)
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", () => resolvePromise(archive.pointer()));
    archive.on("error", reject);
    archive.pipe(output);

    for (const file of files) {
      // `store` skips re-deflate for already-gzipped entries (archiver runtime supports it)
      archive.file(file.path, {
        name: file.name,
        ...(file.store ? ({ store: true } as { store: boolean }) : {}),
      });
    }

    void archive.finalize();
  });
}

export class AutoBackupService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastAt: Date | null = null;
  private lastReason: AutoBackupReason | null = null;
  private lastZipPath: string | null = null;
  private running = false;

  get dir() {
    return resolveBackupDir();
  }

  async status(): Promise<AutoBackupStatus> {
    const dir = this.dir;
    let recent: AutoBackupStatus["recent"] = [];
    try {
      await mkdir(dir, { recursive: true });
      const names = (await readdir(dir))
        .filter((n) => n.startsWith("lifetracker-") && (n.endsWith(".zip") || n.endsWith(".json")))
        .sort()
        .reverse();
      recent = await Promise.all(
        names.slice(0, 8).map(async (name) => {
          const s = await stat(join(dir, name));
          return { name, mtime: s.mtime.toISOString(), size: s.size };
        })
      );
    } catch {
      recent = [];
    }

    return {
      enabled: env.autoBackupEnabled,
      dir,
      intervalHours: env.autoBackupIntervalHours,
      keep: env.autoBackupKeep,
      lastBackupAt: this.lastAt?.toISOString() ?? recent[0]?.mtime ?? null,
      lastReason: this.lastReason,
      lastZipPath: this.lastZipPath,
      lastJsonPath: this.lastZipPath,
      recent,
    };
  }

  async run(reason: AutoBackupReason, opts?: { force?: boolean }): Promise<AutoBackupResult> {
    if (!env.autoBackupEnabled && reason !== "manual") {
      return {
        ok: false,
        reason,
        zipPath: "",
        jsonPath: "",
        dbIncluded: false,
        exportedAt: new Date().toISOString(),
        entryCount: 0,
        bytesRaw: 0,
        bytesZip: 0,
        skipped: true,
        message: "Otomatik yedek kapalı",
      };
    }

    if (this.running) {
      return {
        ok: false,
        reason,
        zipPath: "",
        jsonPath: "",
        dbIncluded: false,
        exportedAt: new Date().toISOString(),
        entryCount: 0,
        bytesRaw: 0,
        bytesZip: 0,
        skipped: true,
        message: "Yedek zaten çalışıyor",
      };
    }

    if (
      reason === "interval" &&
      !opts?.force &&
      this.lastAt &&
      Date.now() - this.lastAt.getTime() < env.autoBackupIntervalHours * 3600_000 * 0.5
    ) {
      return {
        ok: true,
        reason,
        zipPath: this.lastZipPath ?? "",
        jsonPath: this.lastZipPath ?? "",
        dbIncluded: false,
        exportedAt: this.lastAt.toISOString(),
        entryCount: 0,
        bytesRaw: 0,
        bytesZip: 0,
        skipped: true,
        message: "Son yedek yeterince taze",
      };
    }

    this.running = true;
    const staging = join(this.dir, `.staging-${stamp()}-${randomBytes(4).toString("hex")}`);
    try {
      const dir = this.dir;
      await mkdir(dir, { recursive: true });
      await mkdir(staging, { recursive: true });

      const data = await backupService.exportJson();
      const jsonText = JSON.stringify(data, null, 2);
      const jsonBuf = Buffer.from(jsonText, "utf8");
      const gzipBuf = gzipSync(jsonBuf, { level: 9 });

      const gzPath = join(staging, "backup.json.gz");
      await writeFile(gzPath, gzipBuf);

      const zipFiles: Array<{ name: string; path: string; store?: boolean }> = [
        // Already gzipped — store without re-compressing inside the zip
        { name: "backup.json.gz", path: gzPath, store: true },
      ];

      let dbIncluded = false;
      let dbBytes = 0;
      const sqlite = resolveSqlitePath();
      if (sqlite && existsSync(sqlite)) {
        const dbStaging = join(staging, "backup.db");
        await copyFile(sqlite, dbStaging);
        zipFiles.push({ name: "backup.db", path: dbStaging });
        dbIncluded = true;
        dbBytes = (await stat(sqlite)).size;
        for (const suffix of ["-wal", "-shm"] as const) {
          const side = `${sqlite}${suffix}`;
          if (existsSync(side)) {
            const sideStaging = join(staging, `backup.db${suffix}`);
            await copyFile(side, sideStaging);
            zipFiles.push({ name: `backup.db${suffix}`, path: sideStaging });
            dbBytes += (await stat(side)).size;
          }
        }
      }

      const manifest = {
        version: 1,
        reason,
        exportedAt: data.exportedAt,
        entryCount: data.entries.length,
        categoryCount: data.categories.length,
        hintCount: data.hints.length,
        format: "json.gz+zip",
        files: ["manifest.json", "backup.json.gz", ...(dbIncluded ? ["backup.db"] : [])],
        includesDatabase: dbIncluded,
        bytesJsonRaw: jsonBuf.length,
        bytesJsonGzip: gzipBuf.length,
      };
      const manifestPath = join(staging, "manifest.json");
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
      zipFiles.unshift({ name: "manifest.json", path: manifestPath });

      const base = `lifetracker-${stamp()}-${reason}`;
      const zipPath = join(dir, `${base}.zip`);
      const bytesZip = await createZip(zipPath, zipFiles);
      const bytesRaw = jsonBuf.length + dbBytes;

      this.lastAt = new Date();
      this.lastReason = reason;
      this.lastZipPath = zipPath;

      await this.prune();

      logger.info("Auto backup zip written", {
        reason,
        zipPath,
        entries: data.entries.length,
        bytesRaw,
        bytesZip,
        dbIncluded,
      });

      return {
        ok: true,
        reason,
        zipPath,
        jsonPath: zipPath,
        dbIncluded,
        exportedAt: data.exportedAt,
        entryCount: data.entries.length,
        bytesRaw,
        bytesZip,
      };
    } catch (error) {
      logger.error("Auto backup failed", {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await rm(staging, { recursive: true, force: true }).catch(() => undefined);
      this.running = false;
    }
  }

  private async prune() {
    const keep = env.autoBackupKeep;
    // 0 / negative = unlimited zip retention
    if (!Number.isFinite(keep) || keep <= 0) return;

    const dir = this.dir;
    const keepCount = Math.max(1, Math.floor(keep));
    // Only rotate compressed archives — never touch the live database
    const names = (await readdir(dir))
      .filter((n) => n.startsWith("lifetracker-") && n.endsWith(".zip"))
      .sort()
      .reverse();

    const drop = names.slice(keepCount);
    for (const name of drop) {
      await unlink(join(dir, name)).catch(() => undefined);
    }

    // Clean leftover uncompressed snapshots from older versions (optional hygiene)
    const legacy = (await readdir(dir)).filter(
      (n) =>
        n.startsWith("lifetracker-") &&
        (n.endsWith(".json") || n.endsWith(".db") || n.endsWith(".db-wal") || n.endsWith(".db-shm"))
    );
    // Keep legacy files only if under the same keep budget by base name
    const legacyBases = [
      ...new Set(legacy.map((n) => n.replace(/\.(json|db)(-wal|-shm)?$/, ""))),
    ].sort()
      .reverse();
    for (const base of legacyBases.slice(keepCount)) {
      for (const name of legacy.filter((n) => n.startsWith(base))) {
        await unlink(join(dir, name)).catch(() => undefined);
      }
    }
  }

  startScheduler() {
    if (!env.autoBackupEnabled) {
      logger.info("Auto backup disabled");
      return;
    }
    const ms = Math.max(15, env.autoBackupIntervalHours * 60) * 60_000;
    void this.run("startup").catch(() => undefined);
    this.timer = setInterval(() => {
      void this.run("interval").catch(() => undefined);
    }, ms);
    logger.info("Auto backup scheduler started", {
      dir: this.dir,
      intervalHours: env.autoBackupIntervalHours,
      keep: env.autoBackupKeep,
      format: "gzip+zip",
    });
  }

  stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async readLatestJson(): Promise<unknown | null> {
    const status = await this.status();
    const latest = status.recent.find((r) => r.name.endsWith(".json"));
    if (!latest) return null;
    const text = await readFile(join(this.dir, latest.name), "utf8");
    return JSON.parse(text) as unknown;
  }
}

export const autoBackupService = new AutoBackupService();
