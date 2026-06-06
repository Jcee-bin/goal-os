const STORAGE_KEY = "goal-os-identity";
const BUDGET_STORAGE_KEY = "simple-budget-tracker";
const VIEW_STORAGE_KEY = "goal-os-active-view";
const POPUP_STORAGE_KEY = "goal-os-popup-history";
const XP_PER_LEVEL = 100;
const todayKey = getDateKey(new Date());
const currentWeekKey = getWeekKey(new Date());
let lastBlock = getCurrentBlock();
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const habitTips = [
  {
    title: "Make it obvious",
    text: "Put the cue where your eyes already go. Shoes by the door, book on the desk, water beside the bed.",
  },
  {
    title: "Make it easy",
    text: "Shrink the habit until starting feels almost too small to avoid. Two minutes still counts as a vote.",
  },
  {
    title: "Make it satisfying",
    text: "Give yourself a clean finish: check it off, earn XP, and let the evidence log become the reward.",
  },
  {
    title: "Never miss twice",
    text: "A missed day is data, not identity. The next tiny rep is how you keep the streak from becoming a story.",
  },
];

const defaultState = {
  identity: "I am becoming someone who keeps promises to myself.",
  arena: "health",
  identityConfirmed: false,
  xp: 0,
  habits: [
    createHabit("Move my body", 10, 1, "morning"),
    createHabit("Learn for 25 minutes", 15, 1, "afternoon"),
    createHabit("Sleep reset routine", 10, 1, "night"),
  ],
  goals: [
    createGoal("Complete 5 identity votes", 5, "times"),
  ],
  completions: {},
  evidence: [],
};

let state = loadState();
if (resetWeeklyGoals()) saveState();
let habitTipIndex = 0;
const openHabitDetails = new Set();
const shownPopupKeys = loadPopupKeys();

const elements = {
  views: document.querySelectorAll("[data-view-panel]"),
  viewButtons: document.querySelectorAll("[data-view]"),
  mobileViewLabel: document.querySelector("#mobileViewLabel"),
  identityStatement: document.querySelector("#identityStatement"),
  identityForm: document.querySelector("#identityForm"),
  identityInput: document.querySelector("#identityInput"),
  arenaInput: document.querySelector("#arenaInput"),
  levelNumber: document.querySelector("#levelNumber"),
  xpTotal: document.querySelector("#xpTotal"),
  xpBar: document.querySelector("#xpBar"),
  xpToNext: document.querySelector("#xpToNext"),
  productivityPercent: document.querySelector("#productivityPercent"),
  productivityLabel: document.querySelector("#productivityLabel"),
  productivityBar: document.querySelector("#productivityBar"),
  financeSafe: document.querySelector("#financeSafe"),
  financeCurrent: document.querySelector("#financeCurrent"),
  financeSavings: document.querySelector("#financeSavings"),
  financePending: document.querySelector("#financePending"),
  financeSplit: document.querySelector("#financeSplit"),
  milestoneTitle: document.querySelector("#milestoneTitle"),
  milestoneProgress: document.querySelector("#milestoneProgress"),
  milestoneBar: document.querySelector("#milestoneBar"),
  habitTipPrev: document.querySelector("#habitTipPrev"),
  habitTipNext: document.querySelector("#habitTipNext"),
  habitTipTitle: document.querySelector("#habitTipTitle"),
  habitTipText: document.querySelector("#habitTipText"),
  habitTipCounter: document.querySelector("#habitTipCounter"),
  todayDate: document.querySelector("#todayDate"),
  todayXp: document.querySelector("#todayXp"),
  habitsDone: document.querySelector("#habitsDone"),
  bestStreak: document.querySelector("#bestStreak"),
  habitForm: document.querySelector("#habitForm"),
  habitName: document.querySelector("#habitName"),
  habitTarget: document.querySelector("#habitTarget"),
  habitCue: document.querySelector("#habitCue"),
  habitXp: document.querySelector("#habitXp"),
  habitList: document.querySelector("#habitList"),
  habitPopup: document.querySelector("#habitPopup"),
  goalForm: document.querySelector("#goalForm"),
  goalName: document.querySelector("#goalName"),
  goalTarget: document.querySelector("#goalTarget"),
  goalUnit: document.querySelector("#goalUnit"),
  goalCadence: document.querySelector("#goalCadence"),
  goalList: document.querySelector("#goalList"),
  evidenceList: document.querySelector("#evidenceList"),
  resetAppButton: document.querySelector("#resetAppButton"),
  resetMobileButton: document.querySelector("#resetMobileButton"),
};

const exportLegacyButton = document.querySelector("#exportLegacyButton");
if (exportLegacyButton) {
  exportLegacyButton.addEventListener("click", () => {
    const payload = {
      goal: JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"),
      budget: JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY) || "null"),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "goal-os-legacy-export.json";
    link.click();
    URL.revokeObjectURL(url);
  });
}

elements.identityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.identity = elements.identityInput.value.trim() || defaultState.identity;
  state.arena = elements.arenaInput.value;
  state.identityConfirmed = true;
  addEvidence("Identity updated", 5);
  saveState();
  render();
  setView("dashboard");
});

elements.habitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.habits.unshift(
    createHabit(
      elements.habitName.value.trim(),
      Number(elements.habitXp.value),
      Number(elements.habitTarget.value),
      elements.habitCue.value,
    ),
  );
  elements.habitForm.reset();
  elements.habitTarget.value = 1;
  elements.habitCue.value = "anytime";
  saveState();
  render();
});

elements.goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.goals.unshift(
    createGoal(
      elements.goalName.value.trim(),
      Number(elements.goalTarget.value),
      elements.goalUnit.value,
      elements.goalCadence.value,
    ),
  );
  elements.goalForm.reset();
  elements.goalCadence.value = "ongoing";
  saveState();
  render();
});

elements.viewButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    setView(button.dataset.view);
  });
});

elements.habitList.addEventListener("click", (event) => {
  const completeButton = event.target.closest("[data-complete-habit]");
  const deleteButton = event.target.closest("[data-delete-habit]");
  const detailButton = event.target.closest("[data-toggle-habit]");
  if (completeButton) completeHabit(completeButton.dataset.completeHabit);
  if (deleteButton) deleteHabit(deleteButton.dataset.deleteHabit);
  if (detailButton) toggleHabitDetails(detailButton.dataset.toggleHabit);
});

elements.habitPopup.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-popup]");
  const completeButton = event.target.closest("[data-complete-habit]");
  if (closeButton) hideHabitPopup();
  if (completeButton) {
    const block = getCurrentBlock();
    completeHabit(completeButton.dataset.completeHabit);
    const habits = getPendingForBlock(block);
    if (habits.length) {
      showHabitPopup({
        title: `${getBlockLabel(block)} habits`,
        text: `You still have ${habits.length} ${getBlockLabel(block).toLowerCase()} habit${habits.length === 1 ? "" : "s"} to do.`,
        habits,
        allowComplete: true,
      });
    }
  }
});

elements.goalList.addEventListener("click", (event) => {
  const progressButton = event.target.closest("[data-progress-goal]");
  const deleteButton = event.target.closest("[data-delete-goal]");
  if (progressButton) progressGoal(progressButton.dataset.progressGoal);
  if (deleteButton) deleteGoal(deleteButton.dataset.deleteGoal);
});

elements.resetAppButton.addEventListener("click", resetApp);
elements.resetMobileButton.addEventListener("click", resetApp);
elements.habitTipPrev.addEventListener("click", () => {
  habitTipIndex = (habitTipIndex - 1 + habitTips.length) % habitTips.length;
  renderHabitTip();
});
elements.habitTipNext.addEventListener("click", () => {
  habitTipIndex = (habitTipIndex + 1) % habitTips.length;
  renderHabitTip();
});
window.addEventListener("focus", renderFinance);
window.addEventListener("storage", (event) => {
  if (event.key === BUDGET_STORAGE_KEY) renderFinance();
});
setInterval(() => {
  const block = getCurrentBlock();
  if (block === lastBlock) return;
  lastBlock = block;
  showBlockReminder(block);
}, 60000);

function setView(name) {
  const nextView = ["dashboard", "habits", "identity"].includes(name) ? name : "dashboard";
  elements.views.forEach((view) => {
    view.classList.toggle("active", view.dataset.viewPanel === nextView);
  });
  elements.viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === nextView);
  });
  if (elements.mobileViewLabel) elements.mobileViewLabel.textContent = getViewLabel(nextView);
  localStorage.setItem(VIEW_STORAGE_KEY, nextView);
}

function getInitialView() {
  if (!state.identityConfirmed) return "identity";
  const saved = localStorage.getItem(VIEW_STORAGE_KEY);
  return ["dashboard", "habits", "identity"].includes(saved) ? saved : "dashboard";
}

function getViewLabel(view) {
  const labels = {
    dashboard: "Dashboard",
    habits: "Habits",
    identity: "Identity",
  };
  return labels[view] || labels.dashboard;
}

function resetApp() {
  const confirmed = window.confirm("Reset Goal OS? This clears XP, habit completions, goals, and evidence logs.");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(defaultState);
  render();
}

function completeHabit(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit || isHabitDone(habit)) return;
  const blockBefore = getCurrentBlock();
  const pendingBefore = getPendingForBlock(blockBefore).length;

  state.completions[habitId] = [...(state.completions[habitId] || []), todayKey];
  state.xp += habit.xp;
  addEvidence(habit.name, habit.xp);
  saveState();
  render();
  const pendingAfter = getPendingForBlock(blockBefore).length;
  if (pendingBefore > 0 && pendingAfter === 0) showNextBlockPreview(blockBefore);
}

function deleteHabit(habitId) {
  state.habits = state.habits.filter((habit) => habit.id !== habitId);
  openHabitDetails.delete(habitId);
  delete state.completions[habitId];
  saveState();
  render();
}

function toggleHabitDetails(habitId) {
  if (openHabitDetails.has(habitId)) {
    openHabitDetails.delete(habitId);
  } else {
    openHabitDetails.add(habitId);
  }
  renderHabits();
}

function progressGoal(goalId) {
  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal || goal.current >= goal.target) return;

  goal.current += 1;
  state.xp += 20;
  addEvidence(`Progressed: ${goal.name}`, 20);
  if (goal.current >= goal.target) {
    state.xp += 50;
    addEvidence(`Completed goal: ${goal.name}`, 50);
  }
  saveState();
  render();
}

function deleteGoal(goalId) {
  state.goals = state.goals.filter((goal) => goal.id !== goalId);
  saveState();
  render();
}

function render() {
  const level = Math.floor(state.xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = state.xp % XP_PER_LEVEL;
  const doneCount = state.habits.filter((habit) => isHabitDone(habit)).length;
  const totalHabitVotes = state.habits.reduce((total, habit) => total + getHabitTarget(habit), 0);
  const completedHabitVotes = state.habits.reduce(
    (total, habit) => total + Math.min(getHabitCountToday(habit.id), getHabitTarget(habit)),
    0,
  );
  const productivity = totalHabitVotes ? Math.round((completedHabitVotes / totalHabitVotes) * 100) : 0;
  const bestStreak = Math.max(0, ...state.habits.map((habit) => getStreak(habit.id)));
  const todayXp = state.evidence
    .filter((item) => item.date === todayKey)
    .reduce((total, item) => total + item.xp, 0);

  elements.identityStatement.textContent = state.identity;
  elements.identityInput.value = state.identity;
  elements.arenaInput.value = state.arena;
  elements.levelNumber.textContent = level;
  elements.xpTotal.textContent = `${state.xp} XP`;
  elements.xpBar.style.width = `${xpIntoLevel}%`;
  elements.xpToNext.textContent = `${XP_PER_LEVEL - xpIntoLevel} XP to Level ${level + 1}`;
  elements.productivityPercent.textContent = `${productivity}%`;
  elements.productivityLabel.textContent = `${productivity}%`;
  elements.productivityBar.style.width = `${productivity}%`;
  elements.milestoneTitle.textContent = getMilestoneTitle(state.xp);
  elements.milestoneProgress.textContent = `${state.xp % 500}/500 XP toward the next system milestone.`;
  elements.milestoneBar.style.width = `${Math.min(100, Math.round(((state.xp % 500) / 500) * 100))}%`;
  elements.todayDate.textContent = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  elements.todayXp.textContent = todayXp;
  elements.habitsDone.textContent = `${doneCount}/${state.habits.length}`;
  elements.bestStreak.textContent = bestStreak;

  renderHabits();
  renderGoals();
  renderEvidence();
  renderHabitTip();
  renderFinance();
}

function renderFinance() {
  const budget = loadBudgetState();
  const cash = getBudgetBalance(budget.entries, "cash");
  const bank = getBudgetBalance(budget.entries, "bank");
  const savings = getBudgetBalance(budget.entries, "savings");
  const pending = getBudgetPendingTotal(budget.entries);
  const currentMoney = cash + bank + savings;
  const safeToSpend = Math.max(0, cash + bank - pending);
  const monthly = getBudgetMonthlyCategoryTotals(budget.entries);
  const splitTotal = monthly.needs + monthly.wants + monthly.savings;

  elements.financeSafe.textContent = peso.format(safeToSpend);
  elements.financeCurrent.textContent = peso.format(currentMoney);
  elements.financeSavings.textContent = peso.format(savings);
  elements.financePending.textContent = peso.format(pending);
  elements.financeSplit.textContent = splitTotal
    ? `Needs ${getPercent(monthly.needs, splitTotal)} / Wants ${getPercent(monthly.wants, splitTotal)} / Save ${getPercent(monthly.savings, splitTotal)}`
    : "No spending yet";
}

function renderHabitTip() {
  const tip = habitTips[habitTipIndex];
  elements.habitTipTitle.textContent = tip.title;
  elements.habitTipText.textContent = tip.text;
  elements.habitTipCounter.textContent = `${habitTipIndex + 1}/${habitTips.length}`;
}

function maybeShowHabitPopup() {
  showBlockReminder(getCurrentBlock());
}

function showBlockReminder(block) {
  const habits = getPendingForBlock(block);
  const key = `${todayKey}:${block}:reminder`;
  if (!habits.length || hasPopupKey(key)) return;

  markPopupKey(key);
  showHabitPopup({
    title: `${getBlockLabel(block)} habits`,
    text: `You still have ${habits.length} ${getBlockLabel(block).toLowerCase()} habit${habits.length === 1 ? "" : "s"} to do.`,
    habits,
    allowComplete: true,
  });
}

function showNextBlockPreview(block) {
  const nextBlock = getNextBlock(block);
  const habits = getPendingForBlock(nextBlock);
  const key = `${todayKey}:${block}:cleared`;
  if (!habits.length || hasPopupKey(key)) return;

  markPopupKey(key);
  showHabitPopup({
    title: `${getBlockLabel(block)} done`,
    text: `Coming up this ${getBlockLabel(nextBlock).toLowerCase()}:`,
    habits,
    allowComplete: true,
  });
}

function showHabitPopup({ title, text, habits, allowComplete }) {
  elements.habitPopup.hidden = false;
  elements.habitPopup.innerHTML = `
    <div class="habit-popup-card">
      <div class="habit-popup-head">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(text)}</p>
        </div>
        <button type="button" data-close-popup aria-label="Close habit popup">x</button>
      </div>
      <div class="habit-popup-list">
        ${habits.map((habit) => renderPopupHabit(habit, allowComplete)).join("")}
      </div>
      <button class="habit-popup-later" type="button" data-close-popup>Later</button>
    </div>
  `;
  requestAnimationFrame(() => {
    elements.habitPopup.classList.add("visible");
  });
}

function renderPopupHabit(habit, allowComplete) {
  const target = getHabitTarget(habit);
  const completedToday = getHabitCountToday(habit.id);
  return `
    <article class="popup-habit-row">
      ${allowComplete ? `<button class="habit-check" type="button" data-complete-habit="${habit.id}" aria-label="Complete ${escapeHtml(habit.name)}">+</button>` : ""}
      <div>
        <strong>${escapeHtml(habit.name)}</strong>
        <span>${completedToday}/${target} today</span>
      </div>
    </article>
  `;
}

function hideHabitPopup() {
  elements.habitPopup.classList.remove("visible");
  setTimeout(() => {
    if (!elements.habitPopup.classList.contains("visible")) elements.habitPopup.hidden = true;
  }, 180);
}

function getCurrentBlock() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  return "night";
}

function getBlockCues(block) {
  const cues = {
    morning: ["morning", "anytime"],
    afternoon: ["afternoon", "anytime"],
    night: ["evening", "night", "anytime"],
  };
  return cues[block] || cues.morning;
}

function getPendingForBlock(block) {
  const cues = getBlockCues(block);
  return state.habits.filter((habit) => cues.includes(getHabitCue(habit)) && !isHabitDone(habit));
}

function getNextBlock(block) {
  const order = ["morning", "afternoon", "night"];
  const index = order.indexOf(block);
  return order[(index + 1) % order.length] || "morning";
}

function getBlockLabel(block) {
  const labels = {
    morning: "Morning",
    afternoon: "Afternoon",
    night: "Night",
  };
  return labels[block] || labels.morning;
}

function loadPopupKeys() {
  try {
    const parsed = JSON.parse(localStorage.getItem(POPUP_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function hasPopupKey(key) {
  return shownPopupKeys.has(key);
}

function markPopupKey(key) {
  shownPopupKeys.add(key);
  localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify([...shownPopupKeys]));
}

function renderHabits() {
  if (!state.habits.length) {
    elements.habitList.innerHTML = '<p class="empty">No habits yet.</p>';
    return;
  }

  const cueGroups = [
    { label: "Morning", cues: ["morning"] },
    { label: "Afternoon", cues: ["afternoon"] },
    { label: "Night", cues: ["evening", "night"] },
    { label: "Anytime", cues: ["anytime"] },
  ];

  elements.habitList.innerHTML = `
    <div class="habit-table">
      ${cueGroups
        .map((group) => {
          const habits = state.habits.filter((habit) => group.cues.includes(getHabitCue(habit)));

          return `
            <section class="habit-table-column">
              <div class="habit-table-head">
                <strong>${group.label}</strong>
                <span>${habits.length}</span>
              </div>
              <div class="habit-table-items">
                ${habits.length ? habits.map(renderHabitItem).join("") : '<p class="empty">No habits</p>'}
              </div>
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderHabitItem(habit) {
  const target = getHabitTarget(habit);
  const completedToday = getHabitCountToday(habit.id);
  const done = isHabitDone(habit);
  const streak = getStreak(habit.id);
  const detailsOpen = openHabitDetails.has(habit.id);

  return `
    <article class="habit-item">
      <div class="habit-row">
        <button class="habit-check ${done ? "done" : ""}" type="button" data-complete-habit="${habit.id}" aria-label="Complete ${escapeHtml(habit.name)}">
          ${done ? "✓" : "+"}
        </button>
        <div class="habit-main">
          <strong class="habit-name">${escapeHtml(habit.name)}</strong>
          <span class="habit-progress">${completedToday}/${target} today</span>
        </div>
        <div class="habit-actions">
          <button class="small-button icon-button" type="button" data-toggle-habit="${habit.id}" aria-expanded="${detailsOpen}">
            ${detailsOpen ? "-" : "i"}
          </button>
          <button class="small-button danger icon-button" type="button" data-delete-habit="${habit.id}" aria-label="Delete ${escapeHtml(habit.name)}">x</button>
        </div>
      </div>
      <div class="habit-detail ${detailsOpen ? "open" : ""}">
        <span>${habit.xp} XP each</span>
        <span>${streak} day streak</span>
        <span>${getHabitCueLabel(getHabitCue(habit))}</span>
      </div>
    </article>
  `;
}

function renderGoals() {
  if (!state.goals.length) {
    elements.goalList.innerHTML = '<p class="empty">No goals yet.</p>';
    return;
  }

  elements.goalList.innerHTML = state.goals
    .map((goal) => {
      const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
      const cadence = getGoalCadence(goal);
      const cadenceLabel = cadence === "weekly" ? "weekly reset" : "ongoing";
      return `
        <article class="goal-item">
          <div class="goal-row">
            <div>
              <strong class="goal-name">${escapeHtml(goal.name)}</strong>
              <span class="goal-meta">${goal.current}/${goal.target} ${goal.unit} / ${cadenceLabel}</span>
            </div>
            <div class="goal-actions">
              <button class="small-button" type="button" data-progress-goal="${goal.id}">+1</button>
              <button class="small-button danger" type="button" data-delete-goal="${goal.id}">Delete</button>
            </div>
          </div>
          <div class="goal-progress">
            <div class="goal-track"><i style="width:${percent}%"></i></div>
            <b>${percent}%</b>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderEvidence() {
  const items = state.evidence.slice(0, 5);
  if (!items.length) {
    elements.evidenceList.innerHTML = '<p class="empty">Complete a habit to create proof.</p>';
    return;
  }

  elements.evidenceList.innerHTML = items
    .map((item) => `
      <article class="evidence-item">
        <b>+${item.xp} XP</b>
        <strong>${escapeHtml(item.text)}</strong>
        <span>${item.date}</span>
      </article>
    `)
    .join("");
}

function loadBudgetState() {
  const saved = localStorage.getItem(BUDGET_STORAGE_KEY);
  if (!saved) return { entries: [] };

  try {
    const parsed = JSON.parse(saved);
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return { entries: [] };
  }
}

function getBudgetBalance(entries, account) {
  return entries.reduce((total, entry) => {
    if (account === "savings" && entry.type === "saving") return total + Number(entry.amount || 0);
    if (entry.account !== account) return total;
    if (entry.type === "income") return total + Number(entry.amount || 0);
    if (entry.type === "expense" && getBudgetExpenseStatus(entry) === "paid") return total - Number(entry.amount || 0);
    if (entry.type === "saving") return total - Number(entry.amount || 0);
    return total;
  }, 0);
}

function getBudgetPendingTotal(entries) {
  return entries
    .filter((entry) => entry.type === "expense" && getBudgetExpenseStatus(entry) === "pending")
    .reduce((total, entry) => total + Number(entry.amount || 0), 0);
}

function getBudgetMonthlyCategoryTotals(entries) {
  const now = new Date();
  return entries.reduce(
    (totals, entry) => {
      const date = new Date(entry.date);
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return totals;

      if (entry.type === "saving") {
        totals.savings += Number(entry.amount || 0);
        return totals;
      }

      if (entry.type !== "expense" || getBudgetExpenseStatus(entry) !== "paid") return totals;
      totals[getBudgetCategory(entry)] += Number(entry.amount || 0);
      return totals;
    },
    { needs: 0, wants: 0, savings: 0 },
  );
}

function getBudgetExpenseStatus(entry) {
  return entry.status || "paid";
}

function getBudgetCategory(entry) {
  if (entry.category === "wants" || entry.category === "savings") return entry.category;
  return "needs";
}

function getPercent(amount, total) {
  if (!total) return "0%";
  return `${Math.round((amount / total) * 100)}%`;
}

function addEvidence(text, xp) {
  state.evidence.unshift({
    id: crypto.randomUUID(),
    text,
    xp,
    date: todayKey,
  });
}

function isHabitDone(habitOrId) {
  const habit = typeof habitOrId === "string" ? state.habits.find((item) => item.id === habitOrId) : habitOrId;
  if (!habit) return false;
  return getHabitCountToday(habit.id) >= getHabitTarget(habit);
}

function getHabitCountToday(habitId) {
  return (state.completions[habitId] || []).filter((date) => date === todayKey).length;
}

function getHabitTarget(habit) {
  return Number.isFinite(habit.targetPerDay) && habit.targetPerDay > 0 ? habit.targetPerDay : 1;
}

function getHabitCue(habit) {
  const cues = new Set(["anytime", "morning", "afternoon", "evening", "night"]);
  return cues.has(habit.cue) ? habit.cue : "anytime";
}

function getHabitCueLabel(cue) {
  const labels = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    night: "Night",
    anytime: "Anytime",
  };
  return labels[cue] || labels.anytime;
}

function getMilestoneTitle(xp) {
  if (xp >= 1500) return "Identity Architect";
  if (xp >= 1000) return "Systems Builder";
  if (xp >= 500) return "Master of Focus";
  return "Foundation Builder";
}

function getStreak(habitId) {
  const days = new Set(state.completions[habitId] || []);
  let streak = 0;
  const cursor = new Date();

  while (days.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function createHabit(name, xp, targetPerDay = 1, cue = "anytime") {
  return {
    id: crypto.randomUUID(),
    name: name || "New habit",
    xp: Number.isFinite(xp) ? xp : 10,
    targetPerDay: Number.isFinite(targetPerDay) && targetPerDay > 0 ? targetPerDay : 1,
    cue: getHabitCue({ cue }),
  };
}

function createGoal(name, target, unit, cadence = "ongoing") {
  const normalizedCadence = getGoalCadence({ cadence });
  return {
    id: crypto.randomUUID(),
    name: name || "New goal",
    target: Number.isFinite(target) && target > 0 ? target : 1,
    current: 0,
    unit: unit || "times",
    cadence: normalizedCadence,
    weekKey: normalizedCadence === "weekly" ? currentWeekKey : "",
  };
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekKey(date) {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  return getDateKey(weekStart);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      identityConfirmed: Boolean(parsed.identityConfirmed),
      habits: normalizeHabits(parsed.habits),
      goals: normalizeGoals(parsed.goals),
      completions: parsed.completions && typeof parsed.completions === "object" ? parsed.completions : {},
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeHabits(habits) {
  const source = Array.isArray(habits) ? habits : structuredClone(defaultState.habits);
  return source.map((habit) => ({
    ...habit,
    targetPerDay: getHabitTarget(habit),
    cue: getHabitCue(habit),
  }));
}

function normalizeGoals(goals) {
  const source = Array.isArray(goals) ? goals : structuredClone(defaultState.goals);
  return source.map((goal) => {
    const cadence = getGoalCadence(goal);
    return {
      ...goal,
      cadence,
      weekKey: cadence === "weekly" ? goal.weekKey || currentWeekKey : "",
    };
  });
}

function getGoalCadence(goal) {
  return goal.cadence === "weekly" ? "weekly" : "ongoing";
}

function resetWeeklyGoals() {
  let changed = false;
  state.goals.forEach((goal) => {
    if (getGoalCadence(goal) !== "weekly") return;
    if (goal.weekKey === currentWeekKey) return;

    goal.current = 0;
    goal.weekKey = currentWeekKey;
    changed = true;
  });
  return changed;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

render();
setView(getInitialView());
maybeShowHabitPopup();
