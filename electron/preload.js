const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // API base URL — empty in dev (Vite proxy), Railway URL in packaged prod
  // process.defaultApp is true when launched as `electron .` (dev), undefined when packaged
  apiBase: () => process.defaultApp ? '' : 'https://goal-os-production-8a7a.up.railway.app',

  // Built-in chime path exposed to renderer
  builtinChimePath: () => __dirname + '\\assets\\chime.wav',

  // System notification when timer finishes
  pomodoroNotify: (title, body) => ipcRenderer.invoke('pomodoro-notify', title, body),

  // Open the always-on-top mini timer window
  openMiniTimer: () => ipcRenderer.invoke('open-mini-timer'),

  // Update tray label with current countdown
  pomodoroTick: (label, running) => ipcRenderer.send('pomodoro-tick', label, running),

  // File picker for custom sound
  pickSoundFile: () => ipcRenderer.invoke('pick-sound-file'),
})

// Forward tray actions (sent from main via webContents.send) as DOM events
ipcRenderer.on('tray-toggle', () => document.dispatchEvent(new CustomEvent('tray-toggle')))
ipcRenderer.on('tray-reset',  () => document.dispatchEvent(new CustomEvent('tray-reset')))
