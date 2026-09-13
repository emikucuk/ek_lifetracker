import { copyFile, mkdir, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../..");
const worktreeDir = join(projectRoot, ".git-backup-worktree");

export type GitPushResult = {
  ok: boolean;
  skipped?: boolean;
  message: string;
  remote?: string;
  branch?: string;
};

async function git(
  args: string[],
  cwd: string,
  opts?: { allowFail?: boolean }
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd,
      windowsHide: true,
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    return { stdout: stdout?.toString() ?? "", stderr: stderr?.toString() ?? "" };
  } catch (error) {
    if (opts?.allowFail) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      return {
        stdout: err.stdout?.toString() ?? "",
        stderr: err.stderr?.toString() ?? err.message ?? String(error),
      };
    }
    const err = error as { stderr?: string; message?: string };
    const detail = (err.stderr || err.message || String(error)).trim();
    throw new Error(detail || `git ${args.join(" ")} failed`);
  }
}

async function pruneZipsInDir(dir: string, keep: number) {
  if (!Number.isFinite(keep) || keep <= 0) return;
  if (!existsSync(dir)) return;
  const names = (await readdir(dir))
    .filter((n) => n.startsWith("lifetracker-") && n.endsWith(".zip") && n !== "lifetracker-latest.zip")
    .sort()
    .reverse();
  for (const name of names.slice(Math.max(1, Math.floor(keep)))) {
    await unlink(join(dir, name)).catch(() => undefined);
  }
}

export class BackupGitPushService {
  private lastAt: Date | null = null;
  private lastOk: boolean | null = null;
  private lastMessage: string | null = null;

  get meta() {
    return {
      enabled: env.autoBackupGitPush,
      remote: env.autoBackupGitRemote,
      branch: env.autoBackupGitBranch,
      lastAt: this.lastAt?.toISOString() ?? null,
      lastOk: this.lastOk,
      lastMessage: this.lastMessage,
    };
  }

  async pushZip(zipPath: string, reason: string): Promise<GitPushResult> {
    if (!env.autoBackupGitPush) {
      return { ok: true, skipped: true, message: "Git push kapalı (AUTO_BACKUP_GIT_PUSH=false)" };
    }
    if (!existsSync(zipPath)) {
      return { ok: false, message: `Zip bulunamadı: ${zipPath}` };
    }

    try {
      await git(["rev-parse", "--is-inside-work-tree"], projectRoot);
      await this.ensureWorktree();

      const backupsDir = join(worktreeDir, "backups");
      await mkdir(backupsDir, { recursive: true });

      const name = basename(zipPath);
      const dest = join(backupsDir, name);
      const latest = join(backupsDir, "lifetracker-latest.zip");
      await copyFile(zipPath, dest);
      await copyFile(zipPath, latest);
      await pruneZipsInDir(backupsDir, env.autoBackupKeep);

      await git(["add", "-A", "--", "backups"], worktreeDir);
      const status = await git(["status", "--porcelain", "--", "backups"], worktreeDir);
      if (!status.stdout.trim()) {
        const result: GitPushResult = {
          ok: true,
          skipped: true,
          message: "Push için yeni değişiklik yok",
          remote: env.autoBackupGitRemote,
          branch: env.autoBackupGitBranch,
        };
        this.record(result);
        return result;
      }

      const msg = `backup(${reason}): ${name}`;
      await git(
        [
          "-c",
          "user.name=EK LifeTracker Backup",
          "-c",
          "user.email=backup@lifetracker.local",
          "commit",
          "-m",
          msg,
        ],
        worktreeDir
      );

      await git(
        ["push", "-u", env.autoBackupGitRemote, `HEAD:${env.autoBackupGitBranch}`],
        worktreeDir
      );

      const result: GitPushResult = {
        ok: true,
        message: `${env.autoBackupGitRemote}/${env.autoBackupGitBranch} dalına push edildi`,
        remote: env.autoBackupGitRemote,
        branch: env.autoBackupGitBranch,
      };
      this.record(result);
      logger.info("Backup git push ok", {
        reason,
        zip: name,
        remote: result.remote,
        branch: result.branch,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const result: GitPushResult = { ok: false, message };
      this.record(result);
      logger.error("Backup git push failed", { reason, error: message });
      return result;
    }
  }

  private record(result: GitPushResult) {
    this.lastAt = new Date();
    this.lastOk = result.ok;
    this.lastMessage = result.message;
  }

  private async ensureWorktree() {
    const branch = env.autoBackupGitBranch;
    const remote = env.autoBackupGitRemote;

    if (existsSync(worktreeDir)) {
      const check = await git(["rev-parse", "--abbrev-ref", "HEAD"], worktreeDir, {
        allowFail: true,
      });
      if (check.stdout.trim() && !check.stderr.includes("not a git")) {
        // Stay on configured branch name when possible
        const head = check.stdout.trim();
        if (head !== branch && head !== "HEAD") {
          await git(["checkout", "-B", branch], worktreeDir, { allowFail: true });
        }
        return;
      }
      await rm(worktreeDir, { recursive: true, force: true }).catch(() => undefined);
      await git(["worktree", "prune"], projectRoot, { allowFail: true });
    }

    await git(["fetch", remote, branch], projectRoot, { allowFail: true });
    const remoteRef = await git(["rev-parse", "--verify", `${remote}/${branch}`], projectRoot, {
      allowFail: true,
    });

    if (remoteRef.stdout.trim()) {
      await git(["worktree", "add", "-B", branch, worktreeDir, `${remote}/${branch}`], projectRoot);
      return;
    }

    const localRef = await git(["rev-parse", "--verify", branch], projectRoot, { allowFail: true });
    if (localRef.stdout.trim()) {
      await git(["worktree", "add", worktreeDir, branch], projectRoot);
      return;
    }

    // Fresh orphan branch with only backups/
    await git(["worktree", "add", "--detach", worktreeDir], projectRoot);
    await git(["checkout", "--orphan", branch], worktreeDir);
    await git(["rm", "-rf", "--ignore-unmatch", "."], worktreeDir, { allowFail: true });

    // Drop leftover untracked files from the source tree snapshot
    const entries = existsSync(worktreeDir) ? await readdir(worktreeDir) : [];
    for (const name of entries) {
      if (name === ".git") continue;
      await rm(join(worktreeDir, name), { recursive: true, force: true }).catch(() => undefined);
    }

    await mkdir(join(worktreeDir, "backups"), { recursive: true });
    await writeFile(
      join(worktreeDir, "README.md"),
      [
        "# EK LifeTracker — yedek dalı",
        "",
        "Bu dal yalnızca otomatik `backups/*.zip` arşivlerini tutar.",
        "Canlı uygulama kodu `main` üzerindedir.",
        "",
        "Geri yükleme: `backups/lifetracker-latest.zip` indir → içinden `backup.json.gz` / `backup.db`.",
        "",
      ].join("\n"),
      "utf8"
    );
    await git(["add", "README.md", "backups"], worktreeDir);
    await git(
      [
        "-c",
        "user.name=EK LifeTracker Backup",
        "-c",
        "user.email=backup@lifetracker.local",
        "commit",
        "-m",
        "chore: init backups branch",
      ],
      worktreeDir
    );
  }
}

export const backupGitPushService = new BackupGitPushService();
