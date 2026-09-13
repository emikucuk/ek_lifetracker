const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("devPanel", {
  start: (mode) => ipcRenderer.invoke("start", mode),
  stop: () => ipcRenderer.invoke("stop"),
  stopService: (label) => ipcRenderer.invoke("stop-service", label),
  restartService: (label) => ipcRenderer.invoke("restart-service", label),
  runTask: (task) => ipcRenderer.invoke("run-task", task),
  getPorts: () => ipcRenderer.invoke("ports"),
  openUrl: (url) => ipcRenderer.invoke("open-url", url),
  onLog: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("log", handler);
    return () => ipcRenderer.removeListener("log", handler);
  },
  onPorts: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("ports", handler);
    return () => ipcRenderer.removeListener("ports", handler);
  },
  onState: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("state", handler);
    return () => ipcRenderer.removeListener("state", handler);
  },
});
