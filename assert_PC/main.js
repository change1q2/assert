const { app, BrowserWindow, Menu, shell } = require("electron");

// 可通过环境变量 ASSERT_APP_URL 覆盖（生产环境请设置为 HTTPS 域名）
// Override via ASSERT_APP_URL env var (use HTTPS for production)
const APP_URL = process.env.ASSERT_APP_URL || "http://localhost:4173";
const APP_TITLE = "Wealth OS - 个人资产管理";

function errorHtml(url, message) {
  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${APP_TITLE}</title>
      <style>
        :root {
          color-scheme: light;
          font-family: "Microsoft YaHei UI", "Segoe UI", sans-serif;
          background: #f4f7ff;
          color: #1f295a;
        }
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at top, rgba(101, 101, 255, 0.15), transparent 36%),
            #f4f7ff;
        }
        .panel {
          width: min(560px, calc(100vw - 48px));
          padding: 32px;
          border-radius: 24px;
          background: rgba(255,255,255,0.94);
          box-shadow: 0 18px 48px rgba(31, 41, 90, 0.16);
        }
        h1 {
          margin: 0 0 10px;
          font-size: 30px;
        }
        p {
          margin: 0 0 12px;
          line-height: 1.7;
          color: #4b5585;
        }
        code {
          display: block;
          padding: 12px 14px;
          margin: 12px 0 20px;
          overflow-wrap: anywhere;
          border-radius: 14px;
          background: #eef1ff;
          color: #4350a3;
        }
        button {
          border: 0;
          border-radius: 14px;
          padding: 12px 18px;
          margin-right: 12px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          background: linear-gradient(135deg, #5964ff, #7b55ff);
          color: #fff;
        }
        button.secondary {
          background: #eef1ff;
          color: #4350a3;
        }
      </style>
    </head>
    <body>
      <main class="panel">
        <h1>暂时连不上 Wealth OS</h1>
        <p>桌面端已经打包好了，但当前无法连接线上地址。你可以先重试，或者直接在浏览器里打开目标站点确认网络状态。</p>
        <code>${url}</code>
        <p>${message}</p>
        <button onclick="location.reload()">重新加载</button>
        <button class="secondary" onclick="window.open('${url}')">在浏览器中打开</button>
      </main>
    </body>
  </html>`;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1160,
    minHeight: 760,
    backgroundColor: "#f4f7ff",
    title: APP_TITLE,
    autoHideMenuBar: true,
    webPreferences: {
      preload: `${__dirname}/preload.js`,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(APP_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.on("did-fail-load", (_event, _code, description, url, isMainFrame) => {
    if (!isMainFrame) return;
    win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(errorHtml(url || APP_URL, description || "连接失败"))}`);
  });
  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
