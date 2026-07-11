const { app, BrowserWindow, Menu, dialog } = require("electron");
const { writeFile } = require("node:fs/promises");
const path = require("node:path");

if (require("electron-squirrel-startup")) {
  app.quit();
}

const APP_ID = "com.quakfoolee-dotcom.centrifugal-pump-sizing";
const APP_NAME = "Centrifugal Pump Sizing";
const smokeResultPath = process.env.PUMP_DESKTOP_SMOKE_RESULT || "";
const acceptancePdfPath = process.env.PUMP_DESKTOP_ACCEPTANCE_PDF || "";
let mainWindow = null;

app.setName(APP_NAME);
app.setAppUserModelId(APP_ID);

function activeWindow() {
  return BrowserWindow.getFocusedWindow() || mainWindow;
}

async function showReportForPdf(window) {
  await window.webContents.executeJavaScript(
    'document.getElementById("tab-report")?.click(); true;',
    true,
  );
  await new Promise(resolve => setTimeout(resolve, 150));
}

async function saveReportPdf() {
  const window = activeWindow();
  if (!window || window.isDestroyed()) return;

  await showReportForPdf(window);
  const selection = await dialog.showSaveDialog(window, {
    title: "Save pump sizing report",
    defaultPath: "Centrifugal-Pump-Sizing-Report.pdf",
    filters: [{ name: "PDF document", extensions: ["pdf"] }],
  });
  if (selection.canceled || !selection.filePath) return;

  await writeReportPdf(window, selection.filePath);
}

async function writeReportPdf(window, filePath) {
  const pdf = await window.webContents.printToPDF({
    printBackground: true,
    preferCSSPageSize: true,
    pageSize: "A4",
  });
  await writeFile(filePath, pdf);
}

function printReport() {
  const window = activeWindow();
  if (!window || window.isDestroyed()) return;
  window.webContents.executeJavaScript(
    'document.querySelector(".print-report")?.click(); true;',
    true,
  );
}

function installMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Print Report / PDF…",
          accelerator: "CmdOrCtrl+P",
          click: printReport,
        },
        {
          label: "Save Report as PDF…",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => saveReportPdf().catch(error => {
            dialog.showErrorBox("Could not save PDF", error.message);
          }),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => dialog.showMessageBox(activeWindow(), {
            type: "info",
            title: `About ${APP_NAME}`,
            message: `${APP_NAME} v${app.getVersion()}`,
            detail: "Engineering screening tool. Confirm final selections against vendor-certified curves and governing project standards.",
          }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const window = new BrowserWindow({
    title: APP_NAME,
    width: 1500,
    height: 980,
    minWidth: 900,
    minHeight: 680,
    backgroundColor: "#F5F3EE",
    icon: path.join(__dirname, "assets", "icon.png"),
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", event => event.preventDefault());
  window.webContents.on("will-attach-webview", event => event.preventDefault());
  window.once("ready-to-show", () => {
    if (!smokeResultPath) window.show();
  });

  window.webContents.once("did-finish-load", async () => {
    if (!smokeResultPath && !acceptancePdfPath) return;
    try {
      const snapshot = await window.webContents.executeJavaScript(`new Promise(resolve => {
        const started = Date.now();
        const inspect = () => {
          const printButton = document.querySelector('.print-report');
          const ready = Boolean(window.PumpCases && document.getElementById('root') && printButton);
          if (ready || Date.now() - started > 15000) {
            resolve({
              ready,
              title: document.title,
              version: window.PumpCases?.APP_VERSION || null,
              hasRoot: Boolean(document.getElementById('root')),
              hasPrintButton: Boolean(printButton),
            });
          } else {
            setTimeout(inspect, 100);
          }
        };
        inspect();
      })`, true);
      if (acceptancePdfPath) {
        if (!snapshot.ready) throw new Error("Installed app did not become ready for PDF acceptance");
        await showReportForPdf(window);
        await writeReportPdf(window, acceptancePdfPath);
        app.exit(0);
        return;
      }
      await writeFile(smokeResultPath, JSON.stringify({ ok: snapshot.ready, ...snapshot }, null, 2));
      app.exit(snapshot.ready ? 0 : 1);
    } catch (error) {
      const resultPath = smokeResultPath || `${acceptancePdfPath}.error.json`;
      await writeFile(resultPath, JSON.stringify({ ok: false, error: error.message }, null, 2));
      app.exit(1);
    }
  });

  window.webContents.once("did-fail-load", async (_event, code, description, url) => {
    if (!smokeResultPath) return;
    await writeFile(smokeResultPath, JSON.stringify({
      ok: false,
      error: `Load failed ${code}: ${description}`,
      url,
    }, null, 2));
    app.exit(1);
  });

  const appFile = path.join(app.getAppPath(), "Pump_Calculator_standalone.html");
  window.loadFile(appFile);
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });
  return window;
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    installMenu();
    mainWindow = createWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
