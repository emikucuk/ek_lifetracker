const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { spawn, execFile } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

const PROJECT_ROOT = path.join(__dirname, "..");
const PORTS = { backend: 3081, frontend: 5181 };
const ICON_ICO = path.join(__dirname, "assets", "icon.ico");
const ICON_PNG = path.join(__dirname, "assets", "icon.png");
const ICON_PATH =
  process.platform === "win32" && fs.existsSync(ICON_ICO) ? ICON_ICO : ICON_PNG;

if (process.platform === "win32") {
  app.setAppUserModelId("com.ek.lifetracker.devpanel");
}

let mainWindow = null;
/** @type {{ proc: import("node:child_process").ChildProcess; label: "backend" | "frontend"; kind: "service" | "task" }[]} */
let devProcesses = [];
let portTimer = null;
let stoppingDev = false;

const RUNNER = process.execPath;
const TSX_CLI = path.join(PROJECT_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const VITE_CLI = path.join(PROJECT_ROOT, "node_modules", "vite", "bin", "vite.js");
const PRISMA_CLI = path.join(PROJECT_ROOT, "node_modules", "prisma", "build", "index.js");
const LOAD_ENV = path.join(PROJECT_ROOT, "server", "scripts", "load-root-env.cjs");
const SERVER_CWD = path.join(PROJECT_ROOT, "server");
const CLIENT_CWD = path.join(PROJECT_ROOT, "client");

const SPAWN_ENV = {
  ...process.env,
  ELECTRON_RUN_AS_NODE: "1",
  FORCE_COLOR: "0",
  NO_COLOR: "1",
  CI: "1",
};

const SPAWN_OPTS = {
  shell: false,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
  env: SPAWN_ENV,
};

function isDevRunning() {
  return devProcesses.some((entry) => entry.kind === "service");
}

function isServiceRunning(label) {
  return devProcesses.some((entry) => entry.kind === "service" && entry.label === label);
}

function getRunningMode() {
  const backend = isServiceRunning("backend");
  const frontend = isServiceRunning("frontend");
  if (backend && frontend) return "all";
  if (backend) return "server";
  if (frontend) return "client";
  return null;
}

function stripAnsi(text) {
  return text
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b./g, "")
    .replace(/\u009b[0-9;]*m/g, "");
}

function normalizeLogText(text) {
  return stripAnsi(text).replace(/\r/g, "").trimEnd();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 720,
    minHeight: 520,
    title: "EK LifeTracker — Dev Panel",
    icon: ICON_PATH,
    backgroundColor: "#1a1a18",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function classifyLogLine(text, fallback) {
  const line = text.toLowerCase();
  if (
    line.includes("error") ||
    line.includes("eaddrinuse") ||
    line.includes("failed") ||
    line.includes("npm error")
  ) {
    return "error";
  }
  if (line.includes("vite") || line.includes("5181")) return "frontend";
  if (line.includes("tsx") || line.includes("listening on") || line.includes("3081")) {
    return "backend";
  }
  return fallback ?? "system";
}

function pushLog(text, source = "system", stream = "stdout") {
  const cleaned = normalizeLogText(text);
  if (!cleaned.trim()) return;

  for (const part of cleaned.split("\n")) {
    if (!part.trim()) continue;
    send("log", {
      text: part,
      stream,
      source: classifyLogLine(part, source),
      time: new Date().toISOString(),
    });
  }
}

function emitState() {
  send("state", {
    running: isDevRunning(),
    mode: getRunningMode(),
    backend: isServiceRunning("backend"),
    frontend: isServiceRunning("frontend"),
  });
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
    socket.connect(port, "127.0.0.1");
  });
}

async function refreshPortStatus() {
  const [backend, frontend] = await Promise.all([
    isPortOpen(PORTS.backend),
    isPortOpen(PORTS.frontend),
  ]);

  send("ports", {
    backend: { port: PORTS.backend, open: backend },
    frontend: { port: PORTS.frontend, open: frontend },
    processRunning: isDevRunning(),
    mode: getRunningMode(),
    backendRunning: isServiceRunning("backend"),
    frontendRunning: isServiceRunning("frontend"),
  });
}

function startPortPolling() {
  if (portTimer) return;
  void refreshPortStatus();
  portTimer = setInterval(() => void refreshPortStatus(), 2000);
}

function stopPortPolling() {
  if (!portTimer) return;
  clearInterval(portTimer);
  portTimer = null;
}

function killProcessTree(pid) {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      execFile(
        "taskkill",
        ["/pid", String(pid), "/T", "/F"],
        { windowsHide: true },
        () => resolve()
      );
      return;
    }
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        /* ignore */
      }
    }
    resolve();
  });
}

async function stopServices(labels = null) {
  const targets = devProcesses.filter((entry) => {
    if (entry.kind !== "service") return false;
    if (!labels) return true;
    return labels.includes(entry.label);
  });

  if (!targets.length) {
    emitState();
    await refreshPortStatus();
    return;
  }

  stoppingDev = true;
  pushLog(
    labels ? `${labels.join(" + ")} durduruluyor…` : "Tüm servisler durduruluyor…",
    "system"
  );

  devProcesses = devProcesses.filter((entry) => !targets.includes(entry));
  await Promise.all(targets.map(({ proc }) => killProcessTree(proc.pid)));

  stoppingDev = false;
  emitState();
  await refreshPortStatus();
  pushLog("Durduruldu.", "system");
}

async function stopDev() {
  await stopServices(null);
  send("state", { running: false, mode: null, backend: false, frontend: false });
}

function attachProcessLogs(proc, label, kind) {
  const tag = label === "backend" ? "backend" : label === "frontend" ? "frontend" : "system";

  const onData = (chunk, stream) => {
    const text = normalizeLogText(chunk.toString("utf8"));
    if (!text.trim()) return;
    for (const part of text.split("\n")) {
      if (!part.trim()) continue;
      send("log", {
        text: part,
        stream,
        source: classifyLogLine(part, tag),
        time: new Date().toISOString(),
      });
    }
  };

  proc.stdout.on("data", (chunk) => onData(chunk, "stdout"));
  proc.stderr.on("data", (chunk) => onData(chunk, "stderr"));

  proc.on("error", (err) => {
    pushLog(`${label} başlatma hatası: ${err.message}`, "error", "stderr");
  });

  proc.on("close", (code) => {
    devProcesses = devProcesses.filter((entry) => entry.proc !== proc);
    if (stoppingDev) return;

    if (kind === "task") {
      pushLog(
        code === 0 ? `${label} tamamlandı.` : `${label} hata ile bitti (kod: ${code ?? "?"})`,
        code === 0 ? "system" : "error"
      );
      emitState();
      void refreshPortStatus();
      return;
    }

    pushLog(`${label} kapandı (çıkış kodu: ${code ?? "?"})`, "system");
    emitState();
    void refreshPortStatus();
  });
}

function spawnProcess(label, nodeArgs, cwd, kind = "service") {
  const missing = nodeArgs.find((arg) => arg.endsWith(".mjs") || arg.endsWith(".js") || arg.endsWith(".cjs"));
  if (missing && !fs.existsSync(missing)) {
    throw new Error(`Dosya bulunamadı: ${missing}`);
  }

  const proc = spawn(RUNNER, nodeArgs, { ...SPAWN_OPTS, cwd });
  devProcesses.push({ proc, label, kind });
  attachProcessLogs(proc, label, kind);
  return proc;
}

function startBackend() {
  if (isServiceRunning("backend")) {
    pushLog("Backend zaten çalışıyor.", "system");
    return;
  }
  if (!fs.existsSync(TSX_CLI)) {
    pushLog("tsx bulunamadı. Proje kökünde npm install çalıştır.", "error");
    return;
  }
  pushLog("Backend başlatılıyor (tsx watch)…", "system");
  spawnProcess("backend", [TSX_CLI, "watch", "src/index.ts"], SERVER_CWD);
  emitState();
  setTimeout(() => void refreshPortStatus(), 1500);
}

function startFrontend() {
  if (isServiceRunning("frontend")) {
    pushLog("Frontend zaten çalışıyor.", "system");
    return;
  }
  if (!fs.existsSync(VITE_CLI)) {
    pushLog("vite bulunamadı. Proje kökünde npm install çalıştır.", "error");
    return;
  }
  pushLog("Frontend başlatılıyor (vite)…", "system");
  spawnProcess("frontend", [VITE_CLI], CLIENT_CWD);
  emitState();
  setTimeout(() => void refreshPortStatus(), 1500);
}

function startDev(mode = "all") {
  if (mode === "all") {
    startBackend();
    startFrontend();
    return;
  }
  if (mode === "server") {
    startBackend();
    return;
  }
  if (mode === "client") {
    startFrontend();
  }
}

async function restartService(label) {
  const name = label === "backend" ? "Backend" : "Frontend";
  if (isServiceRunning(label)) {
    pushLog(`${name} yeniden başlatılıyor…`, "system");
    await stopServices([label]);
  }
  if (label === "backend") startBackend();
  else startFrontend();
}

function runDbPush() {
  if (!fs.existsSync(PRISMA_CLI) || !fs.existsSync(LOAD_ENV)) {
    pushLog("Prisma bulunamadı.", "error");
    return;
  }
  pushLog("DB push çalıştırılıyor…", "system");
  spawnProcess(
    "db-push",
    ["-r", LOAD_ENV, PRISMA_CLI, "db", "push"],
    SERVER_CWD,
    "task"
  );
  emitState();
}

ipcMain.handle("start", (_event, mode) => {
  startDev(mode ?? "all");
});

ipcMain.handle("stop", async () => {
  await stopDev();
});

ipcMain.handle("stop-service", async (_event, label) => {
  if (label !== "backend" && label !== "frontend") return;
  await stopServices([label]);
});

ipcMain.handle("restart-service", async (_event, label) => {
  if (label !== "backend" && label !== "frontend") return;
  await restartService(label);
});

ipcMain.handle("run-task", (_event, task) => {
  if (task === "db-push") runDbPush();
});

ipcMain.handle("ports", async () => {
  const [backend, frontend] = await Promise.all([
    isPortOpen(PORTS.backend),
    isPortOpen(PORTS.frontend),
  ]);
  return {
    backend: { port: PORTS.backend, open: backend },
    frontend: { port: PORTS.frontend, open: frontend },
    processRunning: isDevRunning(),
    mode: getRunningMode(),
    backendRunning: isServiceRunning("backend"),
    frontendRunning: isServiceRunning("frontend"),
  };
});

ipcMain.handle("open-url", (_event, url) => {
  void shell.openExternal(url);
});

app.whenReady().then(() => {
  createWindow();
  startPortPolling();
  emitState();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopPortPolling();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async () => {
  stopPortPolling();
  await stopDev();
});
