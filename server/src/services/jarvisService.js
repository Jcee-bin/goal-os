const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL_PRIMARY = 'llama-3.1-8b-instant'
const MODEL_FALLBACK = 'llama-3.3-70b-versatile'

const tools = [
  {
    type: 'function',
    function: {
      name: 'markHabitDone',
      description: 'Mark one habit as completed for today. Call once per habit.',
      parameters: {
        type: 'object',
        properties: {
          habitName: { type: 'string', description: 'The habit name exactly as shown in the habits list' },
        },
        required: ['habitName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createTask',
      description: 'Create a task or calendar event. Use this when the user wants to schedule something, add an appointment, set a reminder, or create any kind of task or event.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task or event title' },
          scheduledOn: { type: 'string', description: 'Date in YYYY-MM-DD format ONLY. Resolve relative terms like "tomorrow" or "Friday" to an actual date before passing.' },
          startTime: { type: 'string', description: 'HH:MM 24h format. Required when the user mentions a specific time.' },
          endTime: { type: 'string', description: 'HH:MM 24h format, optional' },
          priority: { type: 'string', description: 'low, normal, or high' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addExpense',
      description: 'Log a paid expense in the budget',
      parameters: {
        type: 'object',
        properties: {
          amountCentavos: { type: 'number', description: 'Amount in centavos (pesos × 100)' },
          note: { type: 'string', description: 'What the expense was for' },
          category: { type: 'string', description: 'Must be exactly one of: "needs" (app development tools, coding subscriptions, software, anything for Kairo or business), "wants" (food, snacks, clothes, entertainment, personal items — anything not business-related), "debt" (loan or bill payments), "saving" (savings transfers). When in doubt between needs/wants: if it\'s for the app or business, needs. If it\'s personal, wants.' },
        },
        required: ['amountCentavos', 'note', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'logSleep',
      description: 'Log a sleep session or nap. Only call when the user reports sleeping or napping — NOT for questions or opinions about sleep.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: '"night" for overnight sleep, "nap" for daytime nap' },
          bedtime: { type: 'string', description: 'Time fell asleep in 24h HH:MM. Convert: 11pm→"23:00", 1pm→"13:00", 2am→"02:00"' },
          waketime: { type: 'string', description: 'Time woke up in 24h HH:MM. Convert: 7am→"07:00", 4pm→"16:00"' },
          quality: { type: 'number', description: '1-5. good/great/amazing=5, pretty good=4, okay/fine=3, not great=2, bad/terrible=1. Default 3.' },
          notes: { type: 'string', description: 'Optional notes' },
        },
        required: ['bedtime', 'waketime'],
      },
    },
  },
]

function buildContext({ dashboard, tasks, finance, sleep, nowTime, tomorrowFirst }) {
  const hour = new Date().getHours()
  return {
    mode: hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'night',
    identity: dashboard.profile.identity,
    productivity: dashboard.analytics.productivity,
    todayXp: dashboard.analytics.todayXp,
    habits: dashboard.habits.map((h) => ({
      id: h.id,
      name: h.name,
      done: h.done,
      cue: h.cue,
      streak: h.streak,
    })),
    timed: tasks.timed.map((t) => ({ title: t.title, startTime: t.startTime })),
    inbox: tasks.inbox.map((t) => ({ id: t.id, title: t.title, priority: t.priority })),
    safeToSpend: finance.safeToSpend,
    pending: finance.pending,
    budgetWarning: finance.pending > finance.safeToSpend * 0.5,
    sleep,
    nowTime,
    tomorrowFirst,
  }
}

function buildSystemPrompt(ctx, today, nowTime) {
  const habits = ctx.habits.length
    ? ctx.habits.map((h) => `  - ${h.name} (${h.cue}, ${h.done ? 'done' : 'pending'}, streak ${h.streak}d, id: ${h.id})`).join('\n')
    : '  none'
  const schedule = ctx.timed.length
    ? ctx.timed.map((t) => `  - ${t.title} at ${t.startTime}`).join('\n')
    : '  nothing scheduled'
  const inbox = ctx.inbox.length
    ? ctx.inbox.map((t) => `  - [${t.priority}] ${t.title}`).join('\n')
    : '  empty'

  const sl = ctx.sleep
  const tomorrowEvent = ctx.tomorrowFirst
    ? `${ctx.tomorrowFirst.title} at ${ctx.tomorrowFirst.startTime}`
    : 'nothing scheduled'
  const sleepSection = sl
    ? `Sleep (last 7 nights):
  Avg: ${sl.avgMinutes ? (sl.avgMinutes / 60).toFixed(1) + 'h' : 'no data'}  |  Debt: ${sl.sleepDebtMinutes > 0 ? (sl.sleepDebtMinutes / 60).toFixed(1) + 'h behind' : 'on track'}  |  Streak: ${sl.streak}d
  Last quality: ${sl.lastQuality ? `${sl.lastQuality}/5` : 'not logged'}
  Tomorrow's first event: ${tomorrowEvent}`
    : 'Sleep: no data'

  return `You are J.A.R.V.I.S. — the personal AI of a 17-year-old builder in the Philippines. You have the dry wit, precision, and quiet confidence of Tony Stark's assistant. You speak in short, sharp sentences. You call the user "sir" occasionally but not constantly. You never hedge or soften — you state facts and let them land. You notice things the user didn't ask about and mention them briefly. You confirm actions with a single dry line, never just "Done."
Today is ${today}. Current time: ${nowTime}. Use these to resolve dates and calculate hours of sleep remaining before events.

Identity: "${ctx.identity}"
Mode: ${ctx.mode}  |  Productivity: ${ctx.productivity}%  |  XP today: ${ctx.todayXp}

Habits today:
${habits}

Schedule:
${schedule}

Inbox:
${inbox}

Budget: safe to spend ₱${(ctx.safeToSpend / 100).toFixed(2)}, pending ₱${(ctx.pending / 100).toFixed(2)}${ctx.budgetWarning ? ' ⚠ over half committed' : ''}

${sleepSection}

Rules:
- Be concise and direct. One or two sentences max unless asked to elaborate.
- No filler phrases. Never respond with just "Done" or "Okay" to a question — always give an actual answer.
- After completing an action, confirm with ONE dry line. Never list data or repeat context back — the user can see it themselves.
- For sleep questions: be brutally specific. Quote the actual avg/debt numbers. Calculate how many hours of sleep they'd get if they slept right now vs tomorrow's first event. Name the event. Say plainly if it's enough or not. If nothing tomorrow, call out which habit streaks are at risk. Never say "aim for 8 hours" generically.
- ALWAYS call the appropriate function when the user asks to schedule, add, create, log, or mark something. Never just say "Done" without calling a function.
- "Add to calendar", "schedule", "remind me", "set a meeting" → call createTask with scheduledOn and startTime.
- "I spent", "I bought", "logged expense" → call addExpense. Convert pesos to centavos (×100). App dev / Kairo / business = "needs". Everything personal = "wants".
- "I slept X hours", "I went to bed at", "log my sleep", "slept at 11pm woke at 7am" → call logSleep. Do NOT call logSleep for questions about sleep or opinions on sleep habits.
- "Mark habit done", "did my habit" → call markHabitDone.
- If unsure of a habit ID, ask rather than guessing.`
}

function stripFunctionTags(text) {
  return text
    .replace(/<function[\s\S]*?<\/function>/g, '')
    .replace(/<function[\s\S]*/g, '')
    // strip Python-style leaked function calls: toolName(key="val", ...)
    .replace(/^\s*\w+\([^)]*\)\s*\.?\s*/gm, '')
    .trim()
}

function selectTools(message) {
  const msg = message.toLowerCase()
  const selected = []
  if (/i (did|do|finished|completed|done|checked|worked out|drank|drink|made|read|studied|cleaned|wrote)|mark.*habit|log.*habit|habit.*done/.test(msg)) selected.push(tools.find((t) => t.function.name === 'markHabitDone'))
  if (/(add|set|create|schedule|remind|put).{0,20}(task|event|meeting|appointment|calendar|reminder|sched)|(add to|set.{0,5}reminder|remind me|schedule (a|an|me|it)|set (a|an) meeting)/.test(msg)) selected.push(tools.find((t) => t.function.name === 'createTask'))
  if (/spent|bought|paid|expense|cost|₱|peso|purchase|bayad/.test(msg)) selected.push(tools.find((t) => t.function.name === 'addExpense'))
  if (/i slept|log.{0,10}sleep|went to bed|slept at|woke up at|bedtime was|slept for|(took|had).{0,15}nap|napped (from|at|for)|log.{0,10}nap/.test(msg)) selected.push(tools.find((t) => t.function.name === 'logSleep'))
  const filtered = selected.filter(Boolean)
  return filtered.length > 0 ? filtered : []
}

async function callGroq(apiKey, messages, selectedTools, model = MODEL_PRIMARY, noTools = false) {
  const useTools = !noTools && selectedTools.length > 0
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 512,
      ...(useTools ? { tools: selectedTools, tool_choice: 'required' } : {}),
    }),
    signal: AbortSignal.timeout(20_000),
  })

  if (response.status === 429 && model === MODEL_PRIMARY) {
    console.warn('[Jarvis] 8b rate limited, falling back to 70b')
    return callGroq(apiKey, messages, selectedTools, MODEL_FALLBACK)
  }

  if (response.status === 400) {
    const errText = await response.text()
    let errCode
    try { errCode = JSON.parse(errText)?.error?.code } catch { errCode = null }
    if (errCode === 'tool_use_failed' && !noTools) {
      // Model tried to call a tool it shouldn't — retry as pure text
      return callGroq(apiKey, messages, selectedTools, model, true)
    }
    throw new Error(`Groq 400: ${errText.slice(0, 300)}`)
  }

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq ${response.status}: ${err.slice(0, 300)}`)
  }
  return response.json()
}

export function createJarvisService({ apiKey, activityService, taskService, financeService, sleepService, now }) {
  if (!apiKey) return null

  const getToday = () => (now ? now() : new Date()).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

  function buildISO(hour, minute, period, yesterday) {
    let h = Number(hour)
    if (period === 'AM' && h === 12) h = 0
    if (period === 'PM' && h !== 12) h += 12
    const d = new Date()
    if (yesterday) d.setDate(d.getDate() - 1)
    d.setHours(h, Number(minute ?? 0), 0, 0)
    return d.toISOString()
  }

  function addHour(hhmm) {
    const [h, m] = hhmm.split(':').map(Number)
    const total = h * 60 + m + 60
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  async function executeTool(name, args) {
    if (name === 'markHabitDone') {
      const dashboard = activityService.dashboard()
      const query = (args.habitName ?? '').toLowerCase().trim()
      const habit = dashboard.habits.find((h) =>
        h.name.toLowerCase() === query ||
        h.name.toLowerCase().includes(query) ||
        query.includes(h.name.toLowerCase())
      )
      if (!habit) return { ok: false, description: `No habit matching "${args.habitName}"` }
      activityService.completeHabit(habit.id)
      return { ok: true, description: `Marked "${habit.name}" done` }
    }
    if (name === 'createTask') {
      const startTime = args.startTime || null
      const endTime = args.endTime || (startTime ? addHour(startTime) : null)
      await taskService.create({
        title: args.title,
        notes: '',
        area: 'personal',
        priority: args.priority || 'normal',
        scheduledOn: args.scheduledOn || null,
        startTime,
        endTime,
        calendarEnabled: !!startTime,
      })
      return { ok: true, description: `Created task: ${args.title}` }
    }
    if (name === 'addExpense') {
      financeService.create({
        type: 'expense',
        amountCentavos: Math.round(args.amountCentavos),
        note: args.note,
        category: args.category,
        status: 'paid',
        account: 'cash',
      })
      return { ok: true, description: `Logged expense: ${args.note}` }
    }
    if (name === 'logSleep') {
      // Parse HH:MM strings into Date objects (Manila local time on server)
      function hhmm(str, yesterday = false) {
        const [h, m] = String(str ?? '00:00').split(':').map(Number)
        const d = now ? now() : new Date()
        if (yesterday) d.setDate(d.getDate() - 1)
        d.setHours(h, m || 0, 0, 0)
        return d.toISOString()
      }
      const bedH = parseInt((args.bedtime ?? '23:00').split(':')[0], 10)
      const wakeH = parseInt((args.waketime ?? '07:00').split(':')[0], 10)
      const isNap = args.type === 'nap'
      // Night: bed in evening (>=18 or >=20) and wake in morning (<12) → bed was yesterday
      const isYesterday = !isNap && bedH >= 18 && wakeH < 14
      sleepService.log({
        type: isNap ? 'nap' : 'night',
        sleptAt: hhmm(args.bedtime, isYesterday),
        wokeAt: hhmm(args.waketime, false),
        quality: args.quality ?? 3,
        notes: args.notes ?? '',
      })
      return { ok: true, description: 'Logged sleep' }
    }
    return { ok: false, description: `Unknown tool: ${name}` }
  }

  async function chat(message) {
    const dashboard = activityService.dashboard()
    const today = getToday()
    const nowDate = now ? now() : new Date()
    const nowTime = nowDate.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true })
    const tomorrowDate = new Date(nowDate)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrowKey = tomorrowDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    const tasks = taskService.list(today)
    const tomorrowTasks = taskService.list(tomorrowKey)
    const finance = financeService.summary()
    const sleep = sleepService ? sleepService.analytics() : null
    const tomorrowFirst = tomorrowTasks.timed[0] ?? null
    const ctx = buildContext({ dashboard, tasks, finance, sleep, nowTime, tomorrowFirst })
    const system = buildSystemPrompt(ctx, today, nowTime)

    const selectedTools = selectTools(message)
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ]

    const turn1 = await callGroq(apiKey, messages, selectedTools)
    const assistantMsg = turn1.choices[0].message
    const toolCalls = assistantMsg.tool_calls ?? []

    if (toolCalls.length === 0) {
      return { reply: stripFunctionTags(assistantMsg.content ?? "I didn't catch that."), actionsExecuted: [] }
    }

    const actionsExecuted = []
    const toolResults = []
    for (const call of toolCalls) {
      let args
      try {
        args = JSON.parse(call.function.arguments)
      } catch {
        args = {}
      }
      let result
      try {
        result = await executeTool(call.function.name, args)
      } catch (e) {
        result = { ok: false, description: e.message }
      }
      actionsExecuted.push(result.description)
      toolResults.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result.ok ? 'Done.' : `Error: ${result.description}`,
      })
    }

    // Second turn: confirmation only — stripped system so model doesn't dump context
    const confirmSystem = `You are J.A.R.V.I.S. — dry, sharp, precise. Acknowledge what was just done in ONE short sentence with personality. Examples: "On the calendar, sir.", "Logged. ₱X against your budget.", "Marked. Streak intact.". No lists, no extra commentary.`
    const messages2 = [
      { role: 'system', content: confirmSystem },
      { role: 'user', content: message },
      assistantMsg,
      ...toolResults,
    ]
    const turn2 = await callGroq(apiKey, messages2, [], MODEL_PRIMARY, true)
    const reply = stripFunctionTags(turn2.choices[0].message.content || 'Done.')

    return { reply, actionsExecuted }
  }

  return { chat }
}
