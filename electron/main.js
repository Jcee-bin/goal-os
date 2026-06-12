const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage, dialog, shell } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const isDev = process.env.NODE_ENV !== 'production'

let mainWindow = null
let miniWindow = null
let tray = null
let serverProcess = null
let trayTimerLabel = '25:00'
let trayRunning = false

// ── Tray icon (16×16 green circle, embedded so no external file needed at dev time) ──
const TRAY_ICON_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAe0lEQVQ4y2NgGAWkAkYG' +
  'BgZGBgaG/1QwgAEqzkCsOAOxYoABRB0DsWKAAUQdA7FiAABEHQOxYgAAggYgMQ0AAAAASUVORK5CYII='

function buildTrayIcon() {
  try {
    return nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray-icon.png'))
  } catch {
    return nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_B64}`)
  }
}

function rebuildTrayMenu() {
  if (!tray) return
  const label = trayRunning ? `⏱ ${trayTimerLabel}  ▶` : `⏸ ${trayTimerLabel}`
  tray.setToolTip(`Goal OS — ${label}`)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Goal OS', enabled: false },
    { type: 'separator' },
    { label: 'Show / Hide', click: toggleWindow },
    { type: 'separator' },
    { label, enabled: false },
    {
      label: trayRunning ? 'Pause' : 'Resume',
      click: () => mainWindow?.webContents.send('tray-toggle'),
    },
    {
      label: 'Reset',
      click: () => mainWindow?.webContents.send('tray-reset'),
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } },
  ]))
}

function toggleWindow() {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

// ── Server ──
function startServer() {
  const dbPath = path.join(app.getPath('userData'), 'goal-os.sqlite')
  const serverEntry = isDev
    ? path.join(__dirname, '..', 'server', 'src', 'index.js')
    : path.join(process.resourcesPath, 'server', 'src', 'index.js')

  serverProcess = spawn(process.execPath, [serverEntry, `--db-path=${dbPath}`], {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit',
  })
  serverProcess.on('error', (err) => console.error('[server]', err.message))
}

// ── Windows ──
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Hide to tray on close instead of quitting
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show()
    miniWindow.focus()
    return
  }
  miniWindow = new BrowserWindow({
    width: 200,
    height: 220,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (isDev) {
    miniWindow.loadURL('http://localhost:5174/mini-timer.html')
  } else {
    miniWindow.loadFile(path.join(__dirname, '..', 'client', 'dist', 'mini-timer.html'))
  }
  miniWindow.on('closed', () => { miniWindow = null })
}

// ── IPC ──
ipcMain.handle('pomodoro-notify', (_, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show()
  }
})

ipcMain.handle('open-mini-timer', () => createMiniWindow())

ipcMain.on('pomodoro-tick', (_, label, running) => {
  trayTimerLabel = label
  trayRunning = running
  rebuildTrayMenu()
})

ipcMain.handle('pick-sound-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a ring sound',
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }],
    properties: ['openFile'],
  })
  return result.canceled ? null : result.filePaths[0]
})

// ── App lifecycle ──
app.whenReady().then(() => {

  createMainWindow()

  tray = new Tray(buildTrayIcon())
  tray.on('double-click', toggleWindow)
  rebuildTrayMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  // On Windows keep running in tray
})

app.on('before-quit', () => {
  app.isQuitting = true
  serverProcess?.kill()
})
