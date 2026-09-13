const logOutput = document.getElementById("log-output");
const btnStartAll = document.getElementById("btn-start-all");
const btnStop = document.getElementById("btn-stop");
const btnClear = document.getElementById("btn-clear");
const btnStartServer = document.getElementById("btn-start-server");
const btnStopServer = document.getElementById("btn-stop-server");
const btnRestartServer = document.getElementById("btn-restart-server");
const btnStartClient = document.getElementById("btn-start-client");
const btnStopClient = document.getElementById("btn-stop-client");
const btnRestartClient = document.getElementById("btn-restart-client");
const btnDbPush = document.getElementById("btn-db-push");
const autoscroll = document.getElementById("autoscroll");

const MAX_LINES = 1500;
const lines = [];

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour12: false });
}

function renderLogs() {
  logOutput.innerHTML = lines
    .map(
      (line) =>
        `<span class="log-line ${line.source}"><span class="log-time">${line.time}</span>${escapeHtml(line.text)}</span>`
    )
    .join("\n");

  if (autoscroll.checked) {
    logOutput.scrollTop = logOutput.scrollHeight;
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function appendLog(entry) {
  lines.push({
    text: entry.text,
    source: entry.source,
    time: formatTime(entry.time),
  });
  if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
  renderLogs();
}

function setPortUi(prefix, open, port) {
  const indicator = document.getElementById(`indicator-${prefix}`);
  const text = document.getElementById(`text-${prefix}`);
  const num = document.getElementById(`port-${prefix}-num`);

  if (num) num.textContent = String(port);
  indicator.className = `indicator ${open ? "open" : "closed"}`;
  text.textContent = open ? `Port ${port} açık` : `Port ${port} kapalı`;
}

function setProcessUi(state) {
  const indicator = document.getElementById("indicator-process");
  const text = document.getElementById("text-process");

  const running = state?.running ?? false;
  indicator.className = `indicator ${running ? "running" : "closed"}`;

  if (!running) {
    text.textContent = "Boşta";
    return;
  }

  const parts = [];
  if (state.backend) parts.push("backend");
  if (state.frontend) parts.push("frontend");
  text.textContent = parts.length ? parts.join(" + ") : "Çalışıyor";
}

function applyState(state) {
  const running = state?.running ?? false;
  const backend = state?.backend ?? false;
  const frontend = state?.frontend ?? false;

  btnStop.disabled = !running;
  btnStartServer.disabled = backend;
  btnStopServer.disabled = !backend;
  btnStartClient.disabled = frontend;
  btnStopClient.disabled = !frontend;
  setProcessUi(state);
}

btnStartAll.addEventListener("click", () => void window.devPanel.start("all"));
btnStartServer.addEventListener("click", () => void window.devPanel.start("server"));
btnStartClient.addEventListener("click", () => void window.devPanel.start("client"));
btnStop.addEventListener("click", () => void window.devPanel.stop());
btnStopServer.addEventListener("click", () => void window.devPanel.stopService("backend"));
btnStopClient.addEventListener("click", () => void window.devPanel.stopService("frontend"));
btnRestartServer.addEventListener("click", () => void window.devPanel.restartService("backend"));
btnRestartClient.addEventListener("click", () => void window.devPanel.restartService("frontend"));
btnDbPush.addEventListener("click", () => void window.devPanel.runTask("db-push"));
btnClear.addEventListener("click", () => {
  lines.length = 0;
  renderLogs();
});

document.querySelectorAll("[data-open]").forEach((btn) => {
  btn.addEventListener("click", () => {
    void window.devPanel.openUrl(btn.dataset.open);
  });
});

window.devPanel.onLog(appendLog);

window.devPanel.onPorts((data) => {
  setPortUi("backend", data.backend.open, data.backend.port);
  setPortUi("frontend", data.frontend.open, data.frontend.port);
  applyState({
    running: data.processRunning,
    backend: data.backendRunning,
    frontend: data.frontendRunning,
  });
});

window.devPanel.onState((state) => {
  applyState(state);
});

void window.devPanel.getPorts().then((data) => {
  setPortUi("backend", data.backend.open, data.backend.port);
  setPortUi("frontend", data.frontend.open, data.frontend.port);
  applyState({
    running: data.processRunning,
    backend: data.backendRunning,
    frontend: data.frontendRunning,
  });
});

appendLog({
  text: "Dev Panel hazır. Tümünü başlat veya servisleri ayrı ayrı yönet.",
  source: "system",
  time: new Date().toISOString(),
});
