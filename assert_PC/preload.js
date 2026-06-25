const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("assertDesktop", {
  version: "2.0.0"
});
