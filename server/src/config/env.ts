import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(__dirname, "../../../.env");

config({ path: rootEnvPath });

export const env = {
  port: Number(process.env.PORT ?? 3081),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5181",
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  voiceApiKey: process.env.VOICE_API_KEY ?? "",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.2",
  ollamaTimeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? 8000),
  parserLlmMinConfidence: Number(process.env.PARSER_LLM_MIN_CONFIDENCE ?? 0.7),
  autoBackupEnabled: (process.env.AUTO_BACKUP_ENABLED ?? "true").toLowerCase() !== "false",
  /** Hours between interval backups (min effective ~0.25 via scheduler). Default 6. */
  autoBackupIntervalHours: Math.max(0.25, Number(process.env.AUTO_BACKUP_INTERVAL_HOURS ?? 6)),
  /**
   * Max backup ZIP generations to keep.
   * Live SQLite data is never pruned — only old zip snapshots on disk.
   * Default 20. Set 0 for unlimited zips.
   */
  autoBackupKeep: Number(process.env.AUTO_BACKUP_KEEP ?? 20),
  /** Absolute or project-root-relative. Default: <repo>/backups */
  autoBackupDir: process.env.AUTO_BACKUP_DIR ?? "",
  /** After each successful zip, push to GitHub (dedicated branch via worktree). */
  autoBackupGitPush: (process.env.AUTO_BACKUP_GIT_PUSH ?? "true").toLowerCase() !== "false",
  autoBackupGitRemote: process.env.AUTO_BACKUP_GIT_REMOTE ?? "origin",
  autoBackupGitBranch: process.env.AUTO_BACKUP_GIT_BRANCH ?? "backups",
};
