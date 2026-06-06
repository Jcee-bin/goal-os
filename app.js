const STORAGE_KEY = "simple-budget-tracker";
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const state = loadState();
const PAGE_SIZE = 10;
let currentPage = 1;
let splitMode = "current";
let analysisPeriod = "month";

const elements = {
  safeBalance: document.querySelector("#safeBalance"),
  safeSummary: document.querySelector("#safeSummary"),
  totalBalance: document.querySelector("#totalBalance"),
  trackedTotal: document.querySelector("#trackedTotal"),
  cashBalance: document.querySelector("#cashBalance"),
  bankBalance: document.querySelector("#bankBalance"),
  savingsBalance: document.querySelector("#savingsBalance"),
  spentTotal: document.querySelector("#spentTotal"),
  pendingTotal: document.querySelector("#pendingTotal"),
  splitModeLabel: document.querySelector("#splitModeLabel"),
  donutModeLabel: document.querySelector("#donutModeLabel"),
  donutTotal: document.querySelector("#donutTotal"),
  donutCaption: document.querySelector("#donutCaption"),
  splitDonut: document.querySelector("#splitDonut"),
  currentSplitButton: document.querySelector("#currentSplitButton"),
  projectedSplitButton: document.querySelector("#projectedSplitButton"),
  needsAmount: document.querySelector("#needsAmount"),
  needsPercent: document.querySelector("#needsPercent"),
  wantsAmount: document.querySelector("#wantsAmount"),
  wantsPercent: document.querySelector("#wantsPercent"),
  splitSavingsAmount: document.querySelector("#splitSavingsAmount"),
  splitSavingsPercent: document.querySelector("#splitSavingsPercent"),
  needsBar: document.querySelector("#needsBar"),
  wantsBar: document.querySelector("#wantsBar"),
  savingsBar: document.querySelector("#savingsBar"),
  pendingNeedsBar: document.querySelector("#pendingNeedsBar"),
  pendingWantsBar: document.querySelector("#pendingWantsBar"),
  pendingSavingsBar: document.querySelector("#pendingSavingsBar"),
  pendingNeedsAmount: document.querySelector("#pendingNeedsAmount"),
  pendingWantsAmount: document.querySelector("#pendingWantsAmount"),
  pendingSavingsAmount: document.querySelector("#pendingSavingsAmount"),
  topChargesList: document.querySelector("#topChargesList"),
  checkedTotal: document.querySelector("#checkedTotal"),
  selectedCount: document.querySelector("#selectedCount"),
  entryCount: document.querySelector("#entryCount"),
  historyList: document.querySelector("#historyList"),
  historyFilter: document.querySelector("#historyFilter"),
  filterStartDate: document.querySelector("#filterStartDate"),
  filterEndDate: document.querySelector("#filterEndDate"),
  clearDateFilterButton: document.querySelector("#clearDateFilterButton"),
  previousPageButton: document.querySelector("#previousPageButton"),
  nextPageButton: document.querySelector("#nextPageButton"),
  pageStatus: document.querySelector("#pageStatus"),
  moneyForm: document.querySelector("#moneyForm"),
  expenseForm: document.querySelector("#expenseForm"),
  savingsForm: document.querySelector("#savingsForm"),
  bulkPayAccount: document.querySelector("#bulkPayAccount"),
  bulkCategory: document.querySelector("#bulkCategory"),
  categorySelectedButton: document.querySelector("#categorySelectedButton"),
  deleteSelectedButton: document.querySelector("#deleteSelectedButton"),
  toPaySelectedButton: document.querySelector("#toPaySelectedButton"),
  paidSelectedButton: document.querySelector("#paidSelectedButton"),
  resetButton: document.querySelector("#resetButton"),
  bulkActions: document.querySelector(".bulk-actions"),
  trendChart: document.querySelector("#trendChart"),
  trendTooltip: document.querySelector("#trendTooltip"),
  trendPeriodLabel: document.querySelector("#trendPeriodLabel"),
  donutTooltip: document.querySelector("#donutTooltip"),
  sparkCash: document.querySelector("#sparkCash"),
  sparkBank: document.querySelector("#sparkBank"),
  sparkSavings: document.querySelector("#sparkSavings"),
  sparkSpent: document.querySelector("#sparkSpent"),
  sparkPending: document.querySelector("#sparkPending"),
  sparkTotal: document.querySelector("#sparkTotal"),
  sparkTracked: document.querySelector("#sparkTracked"),
};

elements.moneyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = readAmount("#moneyAmount");
  if (!amount) return;

  addEntry({
    type: "income",
    account: document.querySelector("#moneyAccount").value,
    category: "income",
    amount,
    note: document.querySelector("#moneyNote").value.trim() || "Added money",
  });

  elements.moneyForm.reset();
});

elements.expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = readAmount("#expenseAmount");
  if (!amount) return;

  const account = document.querySelector("#expenseAccount").value;
  const status = document.querySelector("#expenseStatus").value;
  const balance = getBalance(account);
  if (status === "paid" && amount > balance) {
    alert(`Not enough ${account}. Current ${account} balance is ${peso.format(balance)}.`);
    return;
  }

  addEntry({
    type: "expense",
    account,
    status,
    category: document.querySelector("#expenseCategory").value,
    amount,
    note: document.querySelector("#expenseNote").value.trim(),
  });

  elements.expenseForm.reset();
});

elements.savingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = readAmount("#savingsAmount");
  if (!amount) return;

  const account = document.querySelector("#savingsAccount").value;
  const balance = getBalance(account);
  if (amount > balance) {
    alert(`Not enough ${account}. Current ${account} balance is ${peso.format(balance)}.`);
    return;
  }

  addEntry({
    type: "saving",
    account,
    amount,
    note: document.querySelector("#savingsNote").value.trim() || "Set aside",
  });

  elements.savingsForm.reset();
});

const formTabs = document.querySelectorAll("[data-form-tab]");
const formPanels = document.querySelectorAll("[data-form-panel]");
formTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.formTab;
    formTabs.forEach((item) => item.classList.toggle("active", item === tab));
    formPanels.forEach((panel) => {
      panel.hidden = panel.dataset.formPanel !== target;
    });
  });
});

document.querySelectorAll(".period-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    analysisPeriod = btn.dataset.period;
    document.querySelectorAll(".period-btn").forEach((b) => b.classList.toggle("active", b === btn));
    renderAnalysis();
  });
});

elements.historyList.addEventListener("change", (event) => {
  if (!event.target.matches("[data-entry-check]")) return;

  const entryId = event.target.value;
  if (event.target.checked) {
    state.checkedEntries.push(entryId);
  } else {
    state.checkedEntries = state.checkedEntries.filter((id) => id !== entryId);
  }

  saveState();
  renderTotals();
});

elements.deleteSelectedButton.addEventListener("click", deleteSelectedEntries);
elements.categorySelectedButton.addEventListener("click", categorizeSelectedEntries);
elements.toPaySelectedButton.addEventListener("click", markSelectedPending);
elements.paidSelectedButton.addEventListener("click", markSelectedPaid);
elements.currentSplitButton.addEventListener("click", () => {
  splitMode = "current";
  renderTotals();
});
elements.projectedSplitButton.addEventListener("click", () => {
  splitMode = "projected";
  renderTotals();
});
elements.historyFilter.addEventListener("change", () => {
  currentPage = 1;
  render();
});
elements.filterStartDate.addEventListener("change", () => {
  currentPage = 1;
  render();
});
elements.filterEndDate.addEventListener("change", () => {
  currentPage = 1;
  render();
});
elements.clearDateFilterButton.addEventListener("click", () => {
  elements.historyFilter.value = "all";
  elements.filterStartDate.value = "";
  elements.filterEndDate.value = "";
  currentPage = 1;
  render();
});
elements.previousPageButton.addEventListener("click", () => {
  currentPage = Math.max(1, currentPage - 1);
  render();
});
elements.nextPageButton.addEventListener("click", () => {
  currentPage += 1;
  render();
});

elements.resetButton.addEventListener("click", () => {
  const confirmed = confirm("Clear all balances and history?");
  if (!confirmed) return;

  state.entries = [];
  state.checkedEntries = [];
  saveState();
  render();
});

function addEntry(entry) {
  state.entries.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    ...entry,
  });
  saveState();
  render();
}

function deleteSelectedEntries() {
  const selectedIds = getSelectedIds();
  if (!selectedIds.length) return;

  const confirmed = confirm(`Delete ${selectedIds.length} selected transaction${selectedIds.length === 1 ? "" : "s"}?`);
  if (!confirmed) return;

  const selected = new Set(selectedIds);
  state.entries = state.entries.filter((item) => !selected.has(item.id));
  state.checkedEntries = [];
  saveState();
  render();
}

function markSelectedPaid() {
  const entries = getSelectedEntries().filter(
    (entry) => entry.type === "expense" && getExpenseStatus(entry) === "pending",
  );
  if (!entries.length) return;

  const account = elements.bulkPayAccount.value;
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const balance = getBalance(account);
  if (total > balance) {
    alert(`Not enough ${account}. Selected payments need ${peso.format(total)}, but ${account} has ${peso.format(balance)}.`);
    return;
  }

  entries.forEach((entry) => {
    entry.account = account;
    entry.status = "paid";
  });
  state.checkedEntries = [];
  saveState();
  render();
}

function markSelectedPending() {
  const entries = getSelectedEntries().filter(
    (entry) => entry.type === "expense" && getExpenseStatus(entry) === "paid",
  );
  if (!entries.length) return;

  entries.forEach((entry) => {
    entry.status = "pending";
  });
  state.checkedEntries = [];
  saveState();
  render();
}

function categorizeSelectedEntries() {
  const entries = getSelectedEntries();
  if (!entries.length) return;

  const [targetType, category] = elements.bulkCategory.value.split(":");
  const compatibleEntries = entries.filter((entry) => {
    if (targetType === "expense") return entry.type === "expense";
    return entry.type === "income";
  });

  if (!compatibleEntries.length) {
    alert(`That category is for ${targetType === "expense" ? "charges" : "additions"}. Check a matching transaction first.`);
    return;
  }

  compatibleEntries.forEach((entry) => {
    entry.category = category;
  });
  state.checkedEntries = [];
  saveState();
  render();
}

function getBalance(account) {
  return state.entries.reduce((total, entry) => {
    if (account === "savings" && entry.type === "saving") return total + entry.amount;
    if (entry.account !== account) return total;
    if (entry.type === "income") return total + entry.amount;
    if (entry.type === "expense" && getExpenseStatus(entry) === "paid") return total - entry.amount;
    if (entry.type === "saving") return total - entry.amount;
    return total;
  }, 0);
}

function getSpentTotal() {
  return state.entries
    .filter((entry) => entry.type === "expense" && getExpenseStatus(entry) === "paid")
    .reduce((total, entry) => total + entry.amount, 0);
}

function getPendingTotal() {
  return state.entries
    .filter((entry) => entry.type === "expense" && getExpenseStatus(entry) === "pending")
    .reduce((total, entry) => total + entry.amount, 0);
}

function getMonthlyCategoryTotals() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return state.entries.reduce(
    (totals, entry) => {
      const date = new Date(entry.date);
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return totals;

      if (entry.type === "saving") {
        totals.savings += entry.amount;
        return totals;
      }

      if (entry.type === "expense" && getExpenseStatus(entry) === "paid") {
        totals[getCategory(entry)] += entry.amount;
      }

      return totals;
    },
    { needs: 0, wants: 0, savings: 0 },
  );
}

function getMonthlyPendingCategoryTotals() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return state.entries.reduce(
    (totals, entry) => {
      const date = new Date(entry.date);
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return totals;
      if (entry.type !== "expense" || getExpenseStatus(entry) !== "pending") return totals;

      totals[getCategory(entry)] += entry.amount;
      return totals;
    },
    { needs: 0, wants: 0, savings: 0 },
  );
}

function getCheckedTotal() {
  const checked = new Set(state.checkedEntries);
  return state.entries
    .filter((entry) => checked.has(entry.id) && entry.type === "expense")
    .reduce((total, entry) => total + entry.amount, 0);
}

function renderTotals() {
  const cash = getBalance("cash");
  const bank = getBalance("bank");
  const savings = getBalance("savings");
  const total = cash + bank + savings;
  const spent = getSpentTotal();
  const pending = getPendingTotal();
  const safe = Math.max(0, cash + bank - pending);
  const categoryTotals = getMonthlyCategoryTotals();
  const splitTotal = categoryTotals.needs + categoryTotals.wants + categoryTotals.savings;
  const pendingCategoryTotals = getMonthlyPendingCategoryTotals();
  const projectedTotals = {
    needs: categoryTotals.needs + pendingCategoryTotals.needs,
    wants: categoryTotals.wants + pendingCategoryTotals.wants,
    savings: categoryTotals.savings + pendingCategoryTotals.savings,
  };
  const projectedSplitTotal = projectedTotals.needs + projectedTotals.wants + projectedTotals.savings;
  const visibleTotals = splitMode === "projected" ? projectedTotals : categoryTotals;
  const visibleSplitTotal = splitMode === "projected" ? projectedSplitTotal : splitTotal;

  elements.safeBalance.textContent = peso.format(safe);
  elements.safeSummary.textContent =
    pending > 0 ? `${peso.format(pending)} planned payments are waiting.` : "No planned payments waiting.";
  elements.totalBalance.textContent = peso.format(total);
  elements.trackedTotal.textContent = peso.format(total + spent);
  elements.cashBalance.textContent = peso.format(cash);
  elements.bankBalance.textContent = peso.format(bank);
  elements.savingsBalance.textContent = peso.format(savings);
  elements.spentTotal.textContent = peso.format(spent);
  elements.pendingTotal.textContent = peso.format(pending);
  elements.splitModeLabel.textContent = splitMode === "projected" ? "Paid plus To Pay" : "This month";
  elements.currentSplitButton.classList.toggle("active", splitMode === "current");
  elements.projectedSplitButton.classList.toggle("active", splitMode === "projected");
  elements.needsAmount.textContent = peso.format(visibleTotals.needs);
  elements.needsPercent.textContent = formatPercent(visibleTotals.needs, visibleSplitTotal);
  elements.wantsAmount.textContent = peso.format(visibleTotals.wants);
  elements.wantsPercent.textContent = formatPercent(visibleTotals.wants, visibleSplitTotal);
  elements.splitSavingsAmount.textContent = peso.format(visibleTotals.savings);
  elements.splitSavingsPercent.textContent = formatPercent(visibleTotals.savings, visibleSplitTotal);
  setSplitBar(elements.needsBar, visibleTotals.needs, visibleSplitTotal, 50);
  setSplitBar(elements.wantsBar, visibleTotals.wants, visibleSplitTotal, 30);
  setSplitBar(elements.savingsBar, visibleTotals.savings, visibleSplitTotal, 20);
  renderCharts(visibleTotals, visibleSplitTotal, pendingCategoryTotals);
  renderAnalysis();
  renderSparklines();
  elements.checkedTotal.textContent = peso.format(getCheckedTotal());
  updateBulkActions();
}

function render() {
  renderTotals();

  const filteredEntries = getFilteredEntries();
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  elements.entryCount.textContent = getEntryCountText(filteredEntries.length);
  elements.pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
  elements.previousPageButton.disabled = currentPage === 1;
  elements.nextPageButton.disabled = currentPage === totalPages;

  if (!filteredEntries.length) {
    elements.historyList.innerHTML = `<p class="empty">${state.entries.length ? "No entries match those dates." : "No entries yet."}</p>`;
    return;
  }

  const checked = new Set(state.checkedEntries);

  elements.historyList.innerHTML = pageEntries
    .map((entry) => {
      const date = new Date(entry.date).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const status = getExpenseStatus(entry);
      const sign = entry.type === "income" ? "+" : entry.type === "expense" && status === "paid" ? "-" : "";
      const typeLabel = getTypeLabel(entry.type);
      const pillAccount = entry.type === "expense" && status === "pending" ? "pending" : entry.type === "saving" ? "savings" : entry.account;
      const checkedAttribute = checked.has(entry.id) ? "checked" : "";
      const amountClass = entry.type === "expense" && status === "pending" ? "pending" : entry.type;
      const categoryPill =
        entry.type === "expense"
          ? `<span class="category-pill ${getCategory(entry)}">${getCategoryLabel(entry)}</span>`
          : "";

      return `
        <article class="history-item">
          <label class="history-check" aria-label="Select transaction">
            <input type="checkbox" value="${entry.id}" data-entry-check ${checkedAttribute} />
          </label>
          <div class="history-tags">
            <span class="pill ${pillAccount}">${getAccountLabel(entry)}</span>
            ${categoryPill}
          </div>
          <div class="history-note">
            <strong>${escapeHtml(entry.note)}</strong>
            <span>${getEntryMeta(entry, typeLabel)} · ${date}</span>
          </div>
          <span class="history-amount ${amountClass}">${sign}${peso.format(entry.amount)}</span>
        </article>
      `;
    })
    .join("");
}

function readAmount(selector) {
  const value = Number.parseFloat(document.querySelector(selector).value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { entries: [], checkedEntries: [] };

  try {
    const parsed = JSON.parse(saved);
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      checkedEntries: Array.isArray(parsed.checkedEntries) ? parsed.checkedEntries : [],
    };
  } catch {
    return { entries: [], checkedEntries: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSelectedIds() {
  const existingIds = new Set(state.entries.map((entry) => entry.id));
  return state.checkedEntries.filter((id, index, ids) => existingIds.has(id) && ids.indexOf(id) === index);
}

function getSelectedEntries() {
  const selected = new Set(getSelectedIds());
  return state.entries.filter((entry) => selected.has(entry.id));
}

function getFilteredEntries() {
  const startDate = elements.filterStartDate.value;
  const endDate = elements.filterEndDate.value;
  const historyFilter = elements.historyFilter.value;

  return state.entries.filter((entry) => {
    const entryDate = getDateInputValue(entry.date);
    if (startDate && entryDate < startDate) return false;
    if (endDate && entryDate > endDate) return false;
    if (!matchesHistoryFilter(entry, historyFilter)) return false;
    return true;
  });
}

function matchesHistoryFilter(entry, preset) {
  if (preset === "all") return true;
  if (preset === "to-pay") return entry.type === "expense" && getExpenseStatus(entry) === "pending";
  if (preset === "paid") return entry.type === "expense" && getExpenseStatus(entry) === "paid";
  if (preset === "income") return entry.type === "income";
  if (preset === "needs" || preset === "wants" || preset === "savings") {
    return entry.type === "expense" && getCategory(entry) === preset;
  }
  return false;
}

function getEntryCountText(count) {
  const label = count === 1 ? "entry" : "entries";
  if (elements.historyFilter.value !== "all" || elements.filterStartDate.value || elements.filterEndDate.value) {
    return `${count} filtered ${label}`;
  }
  return `${count} ${label}`;
}

function updateBulkActions() {
  const entries = getSelectedEntries();
  const selectedCount = entries.length;
  const hasPendingExpense = entries.some((entry) => entry.type === "expense" && getExpenseStatus(entry) === "pending");
  const hasPaidExpense = entries.some((entry) => entry.type === "expense" && getExpenseStatus(entry) === "paid");
  const hasCategorizableEntry = entries.some((entry) => entry.type === "expense" || entry.type === "income");

  state.checkedEntries = getSelectedIds();
  const hasSelection = selectedCount > 0;
  elements.bulkActions.hidden = !hasSelection;
  document.body.classList.toggle("has-bulk", hasSelection);
  elements.selectedCount.textContent = `${selectedCount} selected`;
  elements.categorySelectedButton.disabled = !hasCategorizableEntry;
  elements.deleteSelectedButton.disabled = selectedCount === 0;
  elements.toPaySelectedButton.disabled = !hasPaidExpense;
  elements.paidSelectedButton.disabled = !hasPendingExpense;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
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

function getTypeLabel(type) {
  const labels = {
    income: "Money in",
    expense: "Expense",
    saving: "Set aside",
  };
  return labels[type] || "Entry";
}

function setSplitBar(element, amount, total, targetPercent) {
  const actualPercent = total > 0 ? (amount / total) * 100 : 0;
  const width = Math.min(100, total > 0 ? (actualPercent / targetPercent) * 100 : 0);
  element.style.width = `${width}%`;
  element.dataset.over = actualPercent > targetPercent ? "true" : "false";
}

function renderCharts(visibleTotals, visibleSplitTotal, pendingCategoryTotals) {
  const needsPercent = getPercentValue(visibleTotals.needs, visibleSplitTotal);
  const wantsPercent = getPercentValue(visibleTotals.wants, visibleSplitTotal);
  const savingsPercent = Math.max(0, 100 - needsPercent - wantsPercent);

  elements.splitDonut.style.setProperty("--needs-end", `${needsPercent}%`);
  elements.splitDonut.style.setProperty("--wants-end", `${needsPercent + wantsPercent}%`);
  elements.donutTotal.textContent = peso.format(visibleSplitTotal);
  elements.donutCaption.textContent = splitMode === "projected" ? "paid + to pay" : "paid";
  elements.donutModeLabel.textContent = splitMode === "projected" ? "Projected" : "Current";

  const pendingTotal = pendingCategoryTotals.needs + pendingCategoryTotals.wants + pendingCategoryTotals.savings;
  elements.pendingNeedsAmount.textContent = peso.format(pendingCategoryTotals.needs);
  elements.pendingWantsAmount.textContent = peso.format(pendingCategoryTotals.wants);
  elements.pendingSavingsAmount.textContent = peso.format(pendingCategoryTotals.savings);
  setSimpleBar(elements.pendingNeedsBar, pendingCategoryTotals.needs, pendingTotal);
  setSimpleBar(elements.pendingWantsBar, pendingCategoryTotals.wants, pendingTotal);
  setSimpleBar(elements.pendingSavingsBar, pendingCategoryTotals.savings, pendingTotal);

  renderTopCharges();
  setupDonutHover(visibleTotals, visibleSplitTotal);
}

function renderTopCharges() {
  const topCharges = getCurrentMonthEntries()
    .filter((entry) => entry.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  if (!topCharges.length) {
    elements.topChargesList.innerHTML = '<p class="empty compact">No charges this month.</p>';
    return;
  }

  elements.topChargesList.innerHTML = topCharges
    .map((entry, index) => {
      const status = getExpenseStatus(entry) === "pending" ? "To pay" : "Paid";
      return `
        <div class="top-charge">
          <span>${index + 1}</span>
          <div>
            <strong>${escapeHtml(entry.note)}</strong>
            <small>${getCategoryLabel(entry)} · ${status}</small>
          </div>
          <b>${peso.format(entry.amount)}</b>
        </div>
      `;
    })
    .join("");
}

function setSimpleBar(element, amount, total) {
  const width = total > 0 ? Math.max(3, (amount / total) * 100) : 0;
  element.style.width = `${width}%`;
}

function getPercentValue(amount, total) {
  return total > 0 ? Math.round((amount / total) * 100) : 0;
}

function formatPercent(amount, total) {
  if (!total) return "0%";
  return `${getPercentValue(amount, total)}%`;
}

function getCategory(entry) {
  if (entry.category === "wants" || entry.category === "savings") return entry.category;
  return "needs";
}

function getIncomeCategory(entry) {
  return entry.category === "savings" ? "savings" : "income";
}

function getCurrentMonthEntries() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return state.entries.filter((entry) => {
    const date = new Date(entry.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
}

function getAccountLabel(entry) {
  if (entry.type === "expense" && getExpenseStatus(entry) === "pending") return "To pay";
  if (entry.type === "saving") return `Saved from ${entry.account}`;
  return entry.account;
}

function getEntryMeta(entry, typeLabel) {
  if (entry.type === "expense" && getExpenseStatus(entry) === "pending") {
    return `To pay from ${entry.account} · ${getCategoryLabel(entry)}`;
  }

  if (entry.type === "expense") {
    return `${typeLabel} · ${getCategoryLabel(entry)}`;
  }

  if (entry.type === "income") {
    return `${typeLabel} · ${getIncomeCategoryLabel(entry)}`;
  }

  return typeLabel;
}

function getExpenseStatus(entry) {
  return entry.status || "paid";
}

function getCategoryLabel(entry) {
  const labels = {
    needs: "Needs",
    wants: "Wants",
    savings: "Debt/Saving",
  };
  return labels[getCategory(entry)];
}

function getIncomeCategoryLabel(entry) {
  const labels = {
    income: "Income",
    savings: "Saving",
  };
  return labels[getIncomeCategory(entry)];
}

function getDateInputValue(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodRange(period) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  if (period === "week") {
    const day = now.getDay();
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === "lastmonth") {
    start.setMonth(now.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(0); // last day of previous month
    end.setHours(23, 59, 59, 999);
  } else {
    // all time
    start.setFullYear(2000, 0, 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

function getEntriesInRange(start, end) {
  return state.entries.filter((entry) => {
    const d = new Date(entry.date);
    return d >= start && d <= end;
  });
}

function getCategoryTotalsForRange(start, end, includePending = false) {
  return getEntriesInRange(start, end).reduce(
    (totals, entry) => {
      if (entry.type === "saving") {
        totals.savings += entry.amount;
        return totals;
      }
      if (entry.type === "expense") {
        const status = getExpenseStatus(entry);
        if (status === "paid" || (includePending && status === "pending")) {
          totals[getCategory(entry)] += entry.amount;
        }
      }
      return totals;
    },
    { needs: 0, wants: 0, savings: 0 },
  );
}

function getTrendSeriesForRange(start, end) {
  const entries = getEntriesInRange(start, end).filter(
    (e) => e.type === "expense" && getExpenseStatus(e) === "paid",
  );
  if (!entries.length) return [];

  // Decide bucketing from the ACTUAL span of the data, not the nominal period
  // range. Otherwise "All time" (which starts at year 2000) always buckets by
  // month and a couple of months of data collapses into a 2-point straight line.
  const times = entries.map((e) => new Date(e.date).getTime());
  const dataSpan = Math.max(...times) - Math.min(...times);
  const bucketByMonth = dataSpan > 1000 * 60 * 60 * 24 * 90; // >90 days of data → bucket by month

  const map = new Map();
  entries.forEach((entry) => {
    const d = new Date(entry.date);
    const key = bucketByMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    map.set(key, (map.get(key) || 0) + entry.amount);
  });

  const sorted = [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  return sorted.map(([key, amount], i) => {
    const parts = key.split("-");
    const label = bucketByMonth
      ? new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleDateString("en-PH", { month: "short", year: "2-digit" })
      : new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    return { key, label, x: i, amount };
  });
}

function renderTrendChart() {
  const { start, end } = getPeriodRange(analysisPeriod);
  const series = getTrendSeriesForRange(start, end);

  const periodLabels = { week: "This week", month: "This month", lastmonth: "Last month", all: "All time" };
  if (elements.trendPeriodLabel) elements.trendPeriodLabel.textContent = periodLabels[analysisPeriod];

  const svg = elements.trendChart;
  if (!svg) return;
  svg.innerHTML = "";

  const W = 560, H = 240, PL = 60, PR = 16, PT = 20, PB = 36;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  if (!series.length) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", W / 2);
    text.setAttribute("y", H / 2);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "trend-axis-label");
    text.textContent = "No spending in this period";
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.appendChild(text);
    return;
  }

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const maxAmt = Math.max(...series.map((p) => p.amount));
  const niceMax = Math.ceil(maxAmt / 500) * 500 || 500;
  const steps = 4;

  // Gridlines + Y labels
  for (let i = 0; i <= steps; i++) {
    const y = PT + chartH - (i / steps) * chartH;
    const val = Math.round((i / steps) * niceMax);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", PL); line.setAttribute("x2", W - PR);
    line.setAttribute("y1", y); line.setAttribute("y2", y);
    line.setAttribute("class", "trend-grid");
    svg.appendChild(line);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", PL - 6);
    label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "trend-axis-label");
    label.textContent = val >= 1000 ? `₱${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `₱${val}`;
    svg.appendChild(label);
  }

  const xStep = series.length > 1 ? chartW / (series.length - 1) : chartW;

  const toX = (i) => PL + (series.length > 1 ? i * xStep : chartW / 2);
  const toY = (amt) => PT + chartH - (amt / niceMax) * chartH;

  // Area
  const areaPoints = series.map((p, i) => `${toX(i)},${toY(p.amount)}`).join(" L ");
  const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  areaPath.setAttribute("d", `M ${areaPoints} L ${toX(series.length - 1)},${PT + chartH} L ${toX(0)},${PT + chartH} Z`);
  areaPath.setAttribute("class", "trend-area");
  svg.appendChild(areaPath);

  // Line
  const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  linePath.setAttribute("d", `M ${areaPoints}`);
  linePath.setAttribute("class", "trend-line");
  svg.appendChild(linePath);

  // Dots + hit areas + X labels
  series.forEach((p, i) => {
    const cx = toX(i);
    const cy = toY(p.amount);

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", 4);
    dot.setAttribute("class", "trend-dot");
    svg.appendChild(dot);

    // X label (show first, last, and every ~5th to avoid crowding)
    if (i === 0 || i === series.length - 1 || i % Math.max(1, Math.floor(series.length / 6)) === 0) {
      const xlabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      xlabel.setAttribute("x", cx);
      xlabel.setAttribute("y", H - 4);
      xlabel.setAttribute("text-anchor", "middle");
      xlabel.setAttribute("class", "trend-axis-label");
      xlabel.textContent = p.label;
      svg.appendChild(xlabel);
    }

    // Invisible hit rect for hover — clamp to the plot area [PL, W-PR] so it
    // never extends past the chart edge (the SVG has overflow:visible, so an
    // unclamped wide rect would bleed across the gap onto the donut card).
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const hitW = series.length > 1 ? xStep : chartW;
    let hx = cx - hitW / 2;
    let hw = hitW;
    if (hx < PL) { hw -= PL - hx; hx = PL; }
    if (hx + hw > W - PR) { hw = W - PR - hx; }
    hit.setAttribute("x", hx); hit.setAttribute("y", PT);
    hit.setAttribute("width", Math.max(0, hw)); hit.setAttribute("height", chartH);
    hit.setAttribute("class", "trend-hit");
    hit.addEventListener("mouseenter", (e) => {
      const tooltip = elements.trendTooltip;
      if (!tooltip) return;
      const rect = svg.getBoundingClientRect();
      const svgScaleX = rect.width / W;
      const svgScaleY = rect.height / H;
      tooltip.textContent = `${p.label} · ${peso.format(p.amount)}`;
      tooltip.hidden = false;
      tooltip.style.left = `${(cx * svgScaleX)}px`;
      tooltip.style.top = `${(cy * svgScaleY)}px`;
    });
    hit.addEventListener("mouseleave", () => {
      if (elements.trendTooltip) elements.trendTooltip.hidden = true;
    });
    svg.appendChild(hit);
  });
}

function renderAnalysis() {
  renderTrendChart();

  const { start, end } = getPeriodRange(analysisPeriod);
  const categoryTotals = getCategoryTotalsForRange(start, end, false);
  const pendingTotals = getCategoryTotalsForRange(start, end, true);
  const visibleTotals = splitMode === "projected"
    ? { needs: pendingTotals.needs, wants: pendingTotals.wants, savings: pendingTotals.savings }
    : categoryTotals;
  const visibleSplitTotal = visibleTotals.needs + visibleTotals.wants + visibleTotals.savings;

  const needsPercent = getPercentValue(visibleTotals.needs, visibleSplitTotal);
  const wantsPercent = getPercentValue(visibleTotals.wants, visibleSplitTotal);

  elements.splitDonut.style.setProperty("--needs-end", `${needsPercent}%`);
  elements.splitDonut.style.setProperty("--wants-end", `${needsPercent + wantsPercent}%`);
  elements.donutTotal.textContent = peso.format(visibleSplitTotal);
  elements.donutCaption.textContent = splitMode === "projected" ? "paid + to pay" : "paid";
  elements.donutModeLabel.textContent = splitMode === "projected" ? "Projected" : "Current";

  elements.needsAmount.textContent = peso.format(visibleTotals.needs);
  elements.needsPercent.textContent = formatPercent(visibleTotals.needs, visibleSplitTotal);
  elements.wantsAmount.textContent = peso.format(visibleTotals.wants);
  elements.wantsPercent.textContent = formatPercent(visibleTotals.wants, visibleSplitTotal);
  elements.splitSavingsAmount.textContent = peso.format(visibleTotals.savings);
  elements.splitSavingsPercent.textContent = formatPercent(visibleTotals.savings, visibleSplitTotal);

  setupDonutHover(visibleTotals, visibleSplitTotal);
}

function setupDonutHover(visibleTotals, visibleSplitTotal) {
  const tooltip = elements.donutTooltip;
  if (!tooltip) return;

  const labels = { needs: "Needs", wants: "Wants", savings: "Debt/Saving" };

  const tipFor = (cat) => {
    const amount = visibleTotals[cat] || 0;
    return `${labels[cat]}: ${peso.format(amount)} (${formatPercent(amount, visibleSplitTotal)})`;
  };
  const showTip = (text, clientX, clientY) => {
    tooltip.textContent = text;
    tooltip.hidden = false;
    tooltip.style.left = `${clientX}px`;
    tooltip.style.top = `${clientY - 8}px`;
  };
  const hideTip = () => { tooltip.hidden = true; };

  // Legend rows (kept) — hover a row to see that category's amount.
  document.querySelectorAll("[data-donut-slice]").forEach((el) => {
    const cat = el.dataset.donutSlice;
    el.onmouseenter = (e) => showTip(tipFor(cat), e.clientX, e.clientY);
    el.onmousemove = (e) => showTip(tipFor(cat), e.clientX, e.clientY);
    el.onmouseleave = hideTip;
  });

  // Donut arcs — the donut is a CSS conic-gradient (no per-slice elements), so
  // determine the hovered slice from the cursor's angle around the centre.
  const donut = elements.splitDonut;
  if (!donut) return;

  // Slice boundaries in percent, clockwise from 12 o'clock (matches the
  // conic-gradient: needs, then wants, then savings).
  const needsEnd = getPercentValue(visibleTotals.needs, visibleSplitTotal);
  const wantsEnd = needsEnd + getPercentValue(visibleTotals.wants, visibleSplitTotal);
  const catAtPercent = (p) => (p < needsEnd ? "needs" : p < wantsEnd ? "wants" : "savings");

  donut.onmousemove = (e) => {
    if (!visibleSplitTotal) { hideTip(); return; }
    const rect = donut.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const outer = rect.width / 2;
    const inner = outer * 0.54; // matches radial-gradient hole at 54%
    if (dist < inner || dist > outer) { hideTip(); return; }
    // Angle measured clockwise from the top (0% = 12 o'clock).
    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    showTip(tipFor(catAtPercent((angle / 360) * 100)), e.clientX, e.clientY);
  };
  donut.onmouseleave = hideTip;
}

function renderSparklines() {
  const now = new Date();
  const days = 14;
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    buckets.push(key);
  }

  function runningBalance(account) {
    return buckets.map((dayKey) => {
      const dayEnd = new Date(dayKey);
      dayEnd.setHours(23, 59, 59, 999);
      return state.entries
        .filter((e) => new Date(e.date) <= dayEnd)
        .reduce((total, e) => {
          if (account === "savings" && e.type === "saving") return total + e.amount;
          if (e.account !== account) return total;
          if (e.type === "income") return total + e.amount;
          if (e.type === "expense" && getExpenseStatus(e) === "paid") return total - e.amount;
          if (e.type === "saving") return total - e.amount;
          return total;
        }, 0);
    });
  }

  function dailyTotals(filterFn) {
    return buckets.map((dayKey) => {
      return state.entries
        .filter((e) => getDateInputValue(e.date) === dayKey && filterFn(e))
        .reduce((sum, e) => sum + e.amount, 0);
    });
  }

  const cashSeries = runningBalance("cash");
  const bankSeries = runningBalance("bank");
  const savingsSeries = runningBalance("savings");
  const spentSeries = dailyTotals((e) => e.type === "expense" && getExpenseStatus(e) === "paid");
  const pendingSeries = dailyTotals((e) => e.type === "expense" && getExpenseStatus(e) === "pending");

  const sparkData = {
    sparkCash: cashSeries,
    sparkBank: bankSeries,
    sparkSavings: savingsSeries,
    sparkSpent: spentSeries,
    sparkPending: pendingSeries,
    sparkTotal: buckets.map((_, i) => cashSeries[i] + bankSeries[i] + savingsSeries[i]),
    sparkTracked: buckets.map((_, i) => cashSeries[i] + bankSeries[i] + savingsSeries[i] + spentSeries[i]),
  };

  const colors = {
    sparkCash: "var(--cash)", sparkBank: "var(--bank)", sparkSavings: "var(--savings)",
    sparkSpent: "var(--spent)", sparkPending: "var(--pending)",
    sparkTotal: "var(--accent)", sparkTracked: "var(--muted)",
  };

  Object.entries(sparkData).forEach(([id, values]) => {
    const svg = elements[id];
    if (!svg) return;
    svg.innerHTML = "";

    const W = 120, H = 28;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const toX = (i) => (i / (values.length - 1)) * W;
    const toY = (v) => H - 4 - ((v - min) / range) * (H - 8);

    const pts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(" L ");

    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", `M ${pts}`);
    line.setAttribute("class", "sparkline-line");
    line.setAttribute("stroke", colors[id]);
    svg.appendChild(line);

    // Hover hit rects
    const stepW = W / values.length;
    values.forEach((v, i) => {
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      hit.setAttribute("x", toX(i) - stepW / 2);
      hit.setAttribute("y", 0);
      hit.setAttribute("width", stepW);
      hit.setAttribute("height", H);
      hit.setAttribute("class", "sparkline-hit");
      hit.setAttribute("data-sparkline-id", id);

      const tile = svg.closest(".stat-tile");
      hit.addEventListener("mouseenter", (e) => {
        if (!tile) return;
        let tip = tile.querySelector(".sparkline-tooltip");
        if (!tip) {
          tip = document.createElement("div");
          tip.className = "chart-tooltip sparkline-tooltip";
          tip.style.position = "absolute";
          tip.style.pointerEvents = "none";
          tile.style.position = "relative";
          tile.appendChild(tip);
        }
        tip.textContent = `${buckets[i].slice(5)} · ${peso.format(v)}`;
        tip.hidden = false;
        tip.style.left = `${e.offsetX}px`;
        tip.style.top = `${e.offsetY - 8}px`;
      });
      hit.addEventListener("mouseleave", () => {
        const tip = tile && tile.querySelector(".sparkline-tooltip");
        if (tip) tip.hidden = true;
      });
      svg.appendChild(hit);
    });
  });
}

render();
