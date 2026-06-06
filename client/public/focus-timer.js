// Floating, draggable Pomodoro focus timer shared by Goal OS and Budget Tracker.
// Self-contained: injects its own DOM, persists to localStorage with a
// timestamp-based countdown so it keeps running across page navigation/reload.
// Includes a settings panel (durations, auto-start, long-break interval).
(() => {
  if (document.getElementById("focusTimerWidget")) return;

  const STORAGE_KEY = "focus-timer-state";
  const MODE_KEY = { focus: "pomodoro", short: "short", long: "long" };
  const MODE_LABELS = { focus: "Focus", short: "Short break", long: "Long break" };
  const MAX_DOTS = 4;
  const DEFAULT_SETTINGS = {
    pomodoro: 25,
    short: 5,
    long: 15,
    autoBreaks: false,
    autoPomodoros: false,
    longInterval: 4,
  };

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function loadSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  // ── State ──
  let settings = { ...DEFAULT_SETTINGS };
  let mode = "focus";
  let totalMs = modeSeconds(mode) * 1000;
  let remainingMs = totalMs;
  let endTime = 0;
  let running = false;
  let focusCount = 0; // daily dots flourish
  let focusDate = todayKey();
  let roundCount = 0; // pomodoros since start, drives long-break interval
  let collapsed = false;
  let settingsOpen = false;
  let pos = null; // {x, y} once dragged; null = default top-right
  let tickId = null;

  function modeSeconds(m) {
    const key = MODE_KEY[m];
    const minutes = Math.max(1, Math.round(settings[key] ?? DEFAULT_SETTINGS[key]));
    return minutes * 60;
  }

  // ── DOM ──
  const root = document.createElement("div");
  root.id = "focusTimerWidget";
  root.innerHTML = `
    <div class="ft-card">
      <div class="ft-header" data-ft-drag>
        <span class="ft-title">Focus</span>
        <div class="ft-actions">
          <div class="ft-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <button class="ft-min" type="button" data-ft-settings aria-label="Timer settings">&#9881;</button>
          <button class="ft-min" type="button" data-ft-min aria-label="Minimize timer">&#8211;</button>
        </div>
      </div>
      <div class="ft-modes" role="group" aria-label="Timer mode">
        <button type="button" data-ft-mode="focus">Focus</button>
        <button type="button" data-ft-mode="short">Short</button>
        <button type="button" data-ft-mode="long">Long</button>
      </div>
      <div class="ft-dial">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="ft-track" cx="60" cy="60" r="52"></circle>
          <circle class="ft-progress" cx="60" cy="60" r="52"></circle>
        </svg>
        <div class="ft-readout">
          <strong data-ft-time>25:00</strong>
          <span data-ft-caption>Focus</span>
        </div>
      </div>
      <div class="ft-controls">
        <button class="ft-toggle" type="button" data-ft-toggle aria-pressed="false">Start</button>
        <button class="ft-icon" type="button" data-ft-reset aria-label="Reset timer">&#8634;</button>
      </div>
    </div>

    <div class="ft-settings">
      <div class="ft-settings-head">
        <span>Setting</span>
        <button class="ft-min" type="button" data-ft-settings-close aria-label="Close settings">&#215;</button>
      </div>
      <div class="ft-field">
        <span class="ft-group-label">&#128339; Time (minutes)</span>
        <div class="ft-time-grid">
          <label>Pomodoro<input type="number" min="1" max="180" data-ft-set="pomodoro"></label>
          <label>Short Break<input type="number" min="1" max="60" data-ft-set="short"></label>
          <label>Long Break<input type="number" min="1" max="120" data-ft-set="long"></label>
        </div>
      </div>
      <div class="ft-row">
        <span>Auto Start Breaks</span>
        <label class="ft-switch"><input type="checkbox" data-ft-set="autoBreaks"><span></span></label>
      </div>
      <div class="ft-row">
        <span>Auto Start Pomodoros</span>
        <label class="ft-switch"><input type="checkbox" data-ft-set="autoPomodoros"><span></span></label>
      </div>
      <div class="ft-row">
        <span>Long Break interval</span>
        <input class="ft-num" type="number" min="1" max="12" data-ft-set="longInterval">
      </div>
    </div>

    <button class="ft-pill" type="button" data-ft-drag data-ft-expand aria-label="Expand timer">
      <span class="ft-pill-dot"></span>
      <span class="ft-pill-time" data-ft-pill-time>25:00</span>
    </button>
  `;
  document.body.appendChild(root);

  const timeEl = root.querySelector("[data-ft-time]");
  const captionEl = root.querySelector("[data-ft-caption]");
  const toggleEl = root.querySelector("[data-ft-toggle]");
  const resetEl = root.querySelector("[data-ft-reset]");
  const minEl = root.querySelector("[data-ft-min]");
  const gearEl = root.querySelector("[data-ft-settings]");
  const closeSettingsEl = root.querySelector("[data-ft-settings-close]");
  const progressEl = root.querySelector(".ft-progress");
  const modeButtons = root.querySelectorAll("[data-ft-mode]");
  const dots = root.querySelectorAll(".ft-dots i");
  const pill = root.querySelector(".ft-pill");
  const pillTimeEl = root.querySelector("[data-ft-pill-time]");
  const settingInputs = root.querySelectorAll("[data-ft-set]");

  const radius = progressEl.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  progressEl.style.strokeDasharray = `${circumference}`;

  // ── Persistence ──
  function persist() {
    const payload = { settings, mode, running, focusCount, focusDate, roundCount, collapsed, pos };
    if (running) payload.endTime = endTime;
    else payload.remainingMs = remainingMs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  // ── Rendering ──
  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function renderTimer() {
    const label = formatTime(remainingMs);
    timeEl.textContent = label;
    pillTimeEl.textContent = label;
    captionEl.textContent = MODE_LABELS[mode];
    const fraction = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
    progressEl.style.strokeDashoffset = `${circumference * (1 - fraction)}`;
    toggleEl.textContent = running ? "Pause" : "Start";
    toggleEl.setAttribute("aria-pressed", running ? "true" : "false");
    pill.classList.toggle("is-running", running);
    modeButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.ftMode === mode));
    dots.forEach((dot, index) => dot.classList.toggle("is-filled", index < focusCount));
  }

  function fillSettingsInputs() {
    settingInputs.forEach((input) => {
      const key = input.dataset.ftSet;
      if (input.type === "checkbox") input.checked = Boolean(settings[key]);
      else input.value = settings[key];
    });
  }

  function applyLayout() {
    root.classList.toggle("is-collapsed", collapsed);
    root.classList.toggle("is-settings", settingsOpen);
    if (pos) {
      const maxX = Math.max(4, window.innerWidth - root.offsetWidth - 4);
      const maxY = Math.max(4, window.innerHeight - root.offsetHeight - 4);
      const x = Math.min(Math.max(4, pos.x), maxX);
      const y = Math.min(Math.max(4, pos.y), maxY);
      pos = { x, y };
      root.style.left = `${x}px`;
      root.style.top = `${y}px`;
      root.style.right = "auto";
    }
  }

  // ── Timer engine ──
  function stopTick() {
    if (tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function tick() {
    remainingMs = endTime - Date.now();
    if (remainingMs <= 0) {
      remainingMs = 0;
      finish();
      return;
    }
    renderTimer();
  }

  function start() {
    if (running) return;
    if (remainingMs <= 0) remainingMs = totalMs;
    endTime = Date.now() + remainingMs;
    running = true;
    stopTick();
    tickId = setInterval(tick, 250);
    renderTimer();
    persist();
  }

  function pause() {
    if (!running) return;
    remainingMs = Math.max(0, endTime - Date.now());
    running = false;
    stopTick();
    renderTimer();
    persist();
  }

  function loadMode(next, { autoStart = false } = {}) {
    mode = next;
    totalMs = modeSeconds(mode) * 1000;
    remainingMs = totalMs;
    running = false;
    stopTick();
    if (autoStart) {
      start();
    } else {
      renderTimer();
      persist();
    }
  }

  function nextModeAfter(finishedMode) {
    if (finishedMode !== "focus") return "focus";
    return roundCount % Math.max(1, settings.longInterval) === 0 ? "long" : "short";
  }

  function finish() {
    stopTick();
    running = false;
    const finishedMode = mode;
    if (finishedMode === "focus") {
      focusCount = Math.min(MAX_DOTS, focusCount + 1);
      roundCount += 1;
    }
    pulse();
    playChime();
    const next = nextModeAfter(finishedMode);
    const autoStart = next === "focus" ? settings.autoPomodoros : settings.autoBreaks;
    loadMode(next, { autoStart });
  }

  function resetTimer() {
    stopTick();
    running = false;
    remainingMs = totalMs;
    renderTimer();
    persist();
  }

  function pulse() {
    root.classList.remove("is-complete");
    void root.offsetWidth;
    root.classList.add("is-complete");
  }

  function playChime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      osc.onended = () => ctx.close();
    } catch (error) {
      /* audio unavailable; visual cue is enough */
    }
  }

  // ── Settings handling ──
  function applySettingChange(key, rawValue, inputEl) {
    if (typeof settings[key] === "boolean") {
      settings[key] = Boolean(rawValue);
    } else {
      let value = parseInt(rawValue, 10);
      if (!Number.isFinite(value)) value = DEFAULT_SETTINGS[key];
      const min = Number(inputEl.min) || 1;
      const max = Number(inputEl.max) || 999;
      value = Math.min(max, Math.max(min, value));
      settings[key] = value;
      if (inputEl) inputEl.value = value;
    }
    // Refresh the current mode's duration; only reset the clock when idle.
    totalMs = modeSeconds(mode) * 1000;
    if (!running) remainingMs = totalMs;
    renderTimer();
    persist();
  }

  // ── Dragging (header in full mode, pill in collapsed mode) ──
  function attachDrag(handle, isPill) {
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (!isPill && event.target.closest("button")) return; // header buttons aren't drag handles
      const rect = root.getBoundingClientRect();
      const offX = event.clientX - rect.left;
      const offY = event.clientY - rect.top;
      const startX = event.clientX;
      const startY = event.clientY;
      let moved = false;
      handle.classList.add("is-dragging");
      try { handle.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }

      const onMove = (moveEvent) => {
        if (Math.abs(moveEvent.clientX - startX) > 4 || Math.abs(moveEvent.clientY - startY) > 4) {
          moved = true;
        }
        pos = { x: moveEvent.clientX - offX, y: moveEvent.clientY - offY };
        applyLayout();
      };
      const onUp = () => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.classList.remove("is-dragging");
        if (moved) {
          persist();
        } else if (isPill) {
          collapsed = false;
          applyLayout();
          persist();
        }
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
    });
  }

  // ── Wiring ──
  toggleEl.addEventListener("click", () => {
    if (running) pause();
    else start();
  });
  resetEl.addEventListener("click", resetTimer);
  minEl.addEventListener("click", () => {
    collapsed = true;
    settingsOpen = false;
    applyLayout();
    persist();
  });
  gearEl.addEventListener("click", () => {
    settingsOpen = true;
    collapsed = false;
    applyLayout();
  });
  closeSettingsEl.addEventListener("click", () => {
    settingsOpen = false;
    applyLayout();
  });
  modeButtons.forEach((btn) => btn.addEventListener("click", () => loadMode(btn.dataset.ftMode)));
  settingInputs.forEach((input) => {
    input.addEventListener("change", () => {
      applySettingChange(input.dataset.ftSet, input.type === "checkbox" ? input.checked : input.value, input);
    });
  });
  root.addEventListener("animationend", () => root.classList.remove("is-complete"));
  root.querySelectorAll("[data-ft-drag]").forEach((handle) => {
    attachDrag(handle, handle.hasAttribute("data-ft-expand"));
  });
  window.addEventListener("resize", applyLayout);

  // ── Hydrate from saved state ──
  function hydrate() {
    const saved = loadSaved();
    if (saved.settings && typeof saved.settings === "object") {
      settings = { ...DEFAULT_SETTINGS, ...saved.settings };
    }
    if (saved.mode && MODE_KEY[saved.mode]) mode = saved.mode;
    totalMs = modeSeconds(mode) * 1000;
    focusCount = Number.isFinite(saved.focusCount) ? saved.focusCount : 0;
    roundCount = Number.isFinite(saved.roundCount) ? saved.roundCount : 0;
    focusDate = saved.focusDate || todayKey();
    if (focusDate !== todayKey()) {
      focusCount = 0;
      focusDate = todayKey();
    }
    collapsed = Boolean(saved.collapsed);
    pos = saved.pos && typeof saved.pos.x === "number" ? saved.pos : null;

    if (saved.running && saved.endTime) {
      const remaining = saved.endTime - Date.now();
      if (remaining > 0) {
        remainingMs = remaining;
        endTime = saved.endTime;
        running = true;
        stopTick();
        tickId = setInterval(tick, 250);
      } else {
        // Completed while away: register it once, advance one step, stay paused.
        const finishedMode = mode;
        if (finishedMode === "focus") {
          focusCount = Math.min(MAX_DOTS, focusCount + 1);
          roundCount += 1;
        }
        mode = nextModeAfter(finishedMode);
        totalMs = modeSeconds(mode) * 1000;
        remainingMs = totalMs;
        running = false;
        persist();
      }
    } else {
      remainingMs = Number.isFinite(saved.remainingMs)
        ? Math.min(saved.remainingMs, totalMs)
        : totalMs;
      running = false;
    }

    fillSettingsInputs();
    applyLayout();
    renderTimer();
  }

  hydrate();
})();
