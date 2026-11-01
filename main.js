const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');

const W = 400, H = 330;
const IDLE_SECONDS = 300; // 5 min sin usar la PC cuenta como pausa
let win, tray, nextAt = null, drag = null;

if (!app.requestSingleInstanceLock()) app.quit();

const configPath = () => path.join(app.getPath('userData'), 'config.json');
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch { return {}; }
}
function saveConfig(patch) {
  fs.writeFileSync(configPath(), JSON.stringify({ ...loadConfig(), ...patch }));
}

function setAutostart(on) {
  app.setLoginItemSettings({
    openAtLogin: on,
    path: process.execPath,
    args: app.isPackaged ? [] : [app.getAppPath()],
  });
}

function startPosition() {
  const pos = loadConfig().pos;
  const onScreen = pos && screen.getAllDisplays().some(({ bounds: b }) =>
    pos.x >= b.x && pos.x < b.x + b.width && pos.y >= b.y && pos.y < b.y + b.height);
  if (onScreen) return pos;
  const { workArea: a } = screen.getPrimaryDisplay();
  return { x: a.x + a.width - W - 12, y: a.y + a.height - H };
}

// Circulito rosa para la bandeja del sistema (BGRA premultiplicado)
function trayIcon() {
  const s = 32, buf = Buffer.alloc(s * s * 4);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const a = Math.max(0, Math.min(1, 14.5 - Math.hypot(x - 15.5, y - 15.5)));
    const i = (y * s + x) * 4;
    buf[i] = 0x7f * a; buf[i + 1] = 0x65 * a; buf[i + 2] = 0xd8 * a; buf[i + 3] = 255 * a;
  }
  return nativeImage.createFromBitmap(buf, { width: s, height: s, scaleFactor: 2 });
}

function buildMenu() {
  const time = nextAt && new Date(nextAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  tray.setToolTip(nextAt ? `Próxima pausa: ${time}` : 'Hora de estirarte');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: nextAt ? `Próxima pausa: ${time}` : 'Pausa en curso', enabled: false },
    { label: 'Estirarme ahora', click: () => { win.show(); win.webContents.send('stretch-now'); } },
    { label: win.isVisible() ? 'Ocultar' : 'Mostrar', click: () => { win.isVisible() ? win.hide() : win.show(); buildMenu(); } },
    { type: 'separator' },
    {
      label: 'Iniciar con Windows', type: 'checkbox', checked: loadConfig().autostart !== false,
      click: (item) => { saveConfig({ autostart: item.checked }); setAutostart(item.checked); },
    },
    { label: 'Salir', click: () => app.quit() },
  ]));
}

app.whenReady().then(() => {
  const pos = startPosition();
  win = new BrowserWindow({
    width: W, height: H, x: pos.x, y: pos.y,
    transparent: true, frame: false, resizable: false, maximizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('index.html');

  setAutostart(loadConfig().autostart !== false);

  tray = new Tray(trayIcon());
  tray.on('click', () => tray.popUpContextMenu());
  buildMenu();

  setInterval(() => {
    if (powerMonitor.getSystemIdleTime() >= IDLE_SECONDS) win.webContents.send('idle');
  }, 30_000);
});

ipcMain.on('ignore', (_, ignore) => win.setIgnoreMouseEvents(ignore, { forward: true }));

ipcMain.on('drag-start', () => {
  drag = { cursor: screen.getCursorScreenPoint(), win: win.getPosition() };
});
ipcMain.on('drag-move', () => {
  if (!drag) return;
  const c = screen.getCursorScreenPoint();
  win.setPosition(drag.win[0] + c.x - drag.cursor.x, drag.win[1] + c.y - drag.cursor.y);
});
ipcMain.on('drag-end', () => {
  drag = null;
  const [x, y] = win.getPosition();
  saveConfig({ pos: { x, y } });
});

ipcMain.on('next', (_, t) => {
  nextAt = t;
  if (!t && !win.isVisible()) win.show();
  buildMenu();
});

app.on('window-all-closed', () => app.quit());
