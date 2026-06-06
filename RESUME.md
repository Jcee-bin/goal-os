# Resume Context — Budget Tracker Charts Feature

## What this is
A plain HTML/CSS/JS local app (no build step, no framework, data in localStorage).
Files: `index.html`, `styles.css`, `app.js` — all in `C:\Users\shend\Documents\Codex\2026-05-16\goal\`.

## What was already done (complete, working)
1. `index.html` — fully updated:
   - Removed the old `.budget-split` three-bar block
   - Added sparkline `<svg>` slots to every stat tile (ids: `sparkCash`, `sparkBank`, `sparkSavings`, `sparkSpent`, `sparkPending`, `sparkTotal`, `sparkTracked`)
   - Added `.analysis-section` with period selector buttons (`data-period="week|month|lastmonth|all"`)
   - Added `.analysis-row` containing `#trendChart` (SVG) + `#trendTooltip` (left card) and the existing `#splitDonut` donut card (right card, side by side)
   - Moved the Current/Projected toggle and donut legend INTO the donut card inside analysis-row
   - Donut legend now shows amounts: `#needsAmount`, `#wantsAmount`, `#splitSavingsAmount`, percents, and targets
   - Hidden dummy elements for `#needsBar`, `#wantsBar`, `#savingsBar`, `#splitModeLabel` (still in DOM so existing JS doesn't break)
   - Added `#donutTooltip` inside the donut card
   - Added `#trendPeriodLabel` label span in the trend card

2. `styles.css` — fully updated:
   - Added `.analysis-section`, `.analysis-header`, `.analysis-row` (1.5fr / 1fr grid, collapses to 1fr at 820px)
   - Added `.period-pills` / `.period-btn` / `.period-btn.active` styles
   - Added `.trend-chart`, `.trend-wrap`, `.trend-area`, `.trend-line`, `.trend-dot`, `.trend-hit`, `.trend-axis-label`, `.trend-grid`
   - Added `.sparkline`, `.sparkline-line`, `.sparkline-hit`
   - Added `.chart-tooltip` (dark pill, absolute positioned, hidden by default)
   - Removed old `.budget-split`, `.split-grid`, `.split-row`, `.split-meter` rules
   - Added responsive rules for `.analysis-row` and `.period-pills`

3. `app.js` — partially updated:
   - Added `let analysisPeriod = "month";` at the top
   - Added new element refs: `trendChart`, `trendTooltip`, `trendPeriodLabel`, `donutTooltip`, `sparkCash`, `sparkBank`, `sparkSavings`, `sparkSpent`, `sparkPending`, `sparkTotal`, `sparkTracked`
   - Added period button click handlers (toggle `.active`, set `analysisPeriod`, call `renderAnalysis()`)
   - `renderTotals()` now calls `renderAnalysis()` and `renderSparklines()` after `renderCharts()`
   - `renderCharts()` now calls `setupDonutHover(visibleTotals, visibleSplitTotal)` at the end

## What is NOT done yet — the JS functions that need to be added to app.js

These functions need to be appended to `app.js` before the final `render();` call at the bottom.

### 1. `getPeriodRange(period)`
Returns `{ start: Date, end: Date }` for the 4 periods.
```js
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
```

### 2. `getEntriesInRange(start, end)`
```js
function getEntriesInRange(start, end) {
  return state.entries.filter((entry) => {
    const d = new Date(entry.date);
    return d >= start && d <= end;
  });
}
```

### 3. `getCategoryTotalsForRange(start, end, includePending)`
```js
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
```

### 4. `getTrendSeriesForRange(start, end)`
Groups paid expenses by day bucket, returns array of `{ label, x, amount }`.
For "all time" with many days, bucket by month instead.
```js
function getTrendSeriesForRange(start, end) {
  const entries = getEntriesInRange(start, end).filter(
    (e) => e.type === "expense" && getExpenseStatus(e) === "paid",
  );

  const msRange = end - start;
  const bucketByMonth = msRange > 1000 * 60 * 60 * 24 * 90; // >90 days → bucket by month

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
```

### 5. `renderTrendChart()`
Renders the area/line SVG with ₱ Y-axis gridlines and hover hit areas.
```js
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

    // Invisible hit rect for hover
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const hitW = series.length > 1 ? xStep : chartW;
    hit.setAttribute("x", cx - hitW / 2); hit.setAttribute("y", PT);
    hit.setAttribute("width", hitW); hit.setAttribute("height", chartH);
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
```

### 6. `renderAnalysis()`
Calls `renderTrendChart()` and also updates the donut/legend for the selected period.
```js
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
}
```

### 7. `setupDonutHover(visibleTotals, visibleSplitTotal)`
Adds mouseover to each `[data-donut-slice]` legend row showing that category's amount.
```js
function setupDonutHover(visibleTotals, visibleSplitTotal) {
  const slices = document.querySelectorAll("[data-donut-slice]");
  const tooltip = elements.donutTooltip;
  if (!tooltip) return;

  const labels = { needs: "Needs", wants: "Wants", savings: "Debt/Saving" };

  slices.forEach((el) => {
    const cat = el.dataset.donutSlice;
    const amount = visibleTotals[cat] || 0;
    const pct = formatPercent(amount, visibleSplitTotal);

    el.onmouseenter = (e) => {
      tooltip.textContent = `${labels[cat]}: ${peso.format(amount)} (${pct})`;
      tooltip.hidden = false;
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY - 8}px`;
    };
    el.onmousemove = (e) => {
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY - 8}px`;
    };
    el.onmouseleave = () => { tooltip.hidden = true; };
  });
}
```

### 8. `renderSparklines()`
Renders a small trend line per tile using recent daily balances/totals.
```js
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

  const sparkData = {
    sparkCash: runningBalance("cash"),
    sparkBank: runningBalance("bank"),
    sparkSavings: runningBalance("savings"),
    sparkSpent: dailyTotals((e) => e.type === "expense" && getExpenseStatus(e) === "paid"),
    sparkPending: dailyTotals((e) => e.type === "expense" && getExpenseStatus(e) === "pending"),
    sparkTotal: buckets.map((_, i) => {
      const c = runningBalance("cash")[i];
      const b = runningBalance("bank")[i];
      const s = runningBalance("savings")[i];
      return c + b + s;
    }),
    sparkTracked: buckets.map((_, i) => {
      const c = runningBalance("cash")[i];
      const b = runningBalance("bank")[i];
      const s = runningBalance("savings")[i];
      const spent = dailyTotals((e) => e.type === "expense" && getExpenseStatus(e) === "paid")[i];
      return c + b + s + spent;
    }),
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
```

## How to resume in a new chat

1. Paste this file's contents into the new chat as context.
2. Say: **"Continue implementing the budget tracker. Append all the JS functions listed in RESUME.md to `app.js` before the final `render()` call. The HTML and CSS are already done."**
3. The new chat should open `app.js`, find the `render();` at the bottom (line ~720), and insert all 8 functions above it.
4. After inserting, open `index.html` in a browser and verify:
   - Period buttons (Week/Month/Last month/All time) update the trend chart and donut
   - Trend chart shows ₱ Y-axis gridlines, day labels, hover tooltip with date + amount
   - Donut legend hover shows category total for the period
   - Stat tiles show sparkline trend lines with hover amount
   - Balances and history are unaffected by period changes
   - Current/Projected toggle on the donut still works

## File paths
- `C:\Users\shend\Documents\Codex\2026-05-16\goal\index.html` — DONE
- `C:\Users\shend\Documents\Codex\2026-05-16\goal\styles.css` — DONE
- `C:\Users\shend\Documents\Codex\2026-05-16\goal\app.js` — PARTIAL (needs the 8 functions above appended before final `render();`)
