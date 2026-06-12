import { accounts, categories, conflict, getDateKey, LOCAL_USER_ID, validationError } from '../domain.js'

export function createImportService({ db, userId = LOCAL_USER_ID, now = () => new Date() }) {
  async function status() {
    const profile = await db.prepare(`
      SELECT legacy_imported AS legacyImported FROM profiles WHERE user_id = ?
    `).get(userId)
    return { imported: Boolean(profile.legacyImported), canImport: !profile.legacyImported }
  }

  async function importLegacy(payload) {
    if (!(await status()).canImport) throw conflict('Legacy data has already been imported')
    if (!payload || typeof payload !== 'object') {
      throw validationError('payload', 'Import payload is required')
    }
    const goal = normalizeGoal(payload.goal)
    const budget = normalizeBudget(payload.budget)
    if (!goal && !budget) throw validationError('payload', 'No legacy data was found')

    const timestamp = now().toISOString()
    await db.exec('BEGIN IMMEDIATE')
    try {
      if (goal) await importGoalData(goal, timestamp)
      if (budget) await importBudgetData(budget, timestamp)
      await db.prepare(`
        UPDATE profiles SET legacy_imported = 1 WHERE user_id = ?
      `).run(userId)
      await db.exec('COMMIT')
    } catch (error) {
      await db.exec('ROLLBACK')
      throw error
    }
    return { imported: true }
  }

  async function importGoalData(goal, timestamp) {
    await db.prepare('DELETE FROM xp_events WHERE user_id = ?').run(userId)
    await db.prepare('DELETE FROM evidence_entries WHERE user_id = ?').run(userId)
    await db.prepare('DELETE FROM goal_progress_events WHERE user_id = ?').run(userId)
    await db.prepare('DELETE FROM habit_completions WHERE user_id = ?').run(userId)
    await db.prepare('DELETE FROM habits WHERE user_id = ?').run(userId)
    await db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId)

    await db.prepare(`
      UPDATE profiles
      SET identity = ?, arena = ?, identity_confirmed = ?
      WHERE user_id = ?
    `).run(goal.identity, goal.arena, goal.identityConfirmed ? 1 : 0, userId)

    const insertHabit = db.prepare(`
      INSERT INTO habits
        (id, user_id, name, xp, target_per_day, cue, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `)
    const insertCompletion = db.prepare(`
      INSERT INTO habit_completions
        (id, user_id, habit_id, completed_on, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const habit of goal.habits) {
      await insertHabit.run(
        habit.id,
        userId,
        habit.name,
        habit.xp,
        habit.targetPerDay,
        habit.cue,
        timestamp,
      )
      for (const date of goal.completions[habit.originalId] || []) {
        if (!isDateKey(date)) continue
        await insertCompletion.run(crypto.randomUUID(), userId, habit.id, date, `${date}T12:00:00.000Z`)
      }
    }

    const insertGoal = db.prepare(`
      INSERT INTO goals
        (id, user_id, name, target, current, unit, cadence, week_key,
         completion_awarded, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const item of goal.goals) {
      await insertGoal.run(
        item.id,
        userId,
        item.name,
        item.target,
        Math.min(item.current, item.target),
        item.unit,
        item.cadence,
        item.weekKey,
        item.current >= item.target ? 1 : 0,
        timestamp,
      )
    }

    const insertEvidence = db.prepare(`
      INSERT INTO evidence_entries
        (id, user_id, source_type, source_id, description, xp_delta, event_on, created_at)
      VALUES (?, ?, 'legacy', NULL, ?, ?, ?, ?)
    `)
    for (const item of goal.evidence) {
      await insertEvidence.run(
        crypto.randomUUID(),
        userId,
        item.description,
        item.xpDelta,
        item.eventOn,
        `${item.eventOn}T12:00:00.000Z`,
      )
    }
    if (goal.xp > 0) {
      await db.prepare(`
        INSERT INTO xp_events
          (id, user_id, source_type, source_id, amount, event_on, created_at)
        VALUES (?, ?, 'legacy-import', NULL, ?, ?, ?)
      `).run(crypto.randomUUID(), userId, goal.xp, getDateKey(now()), timestamp)
    }
  }

  async function importBudgetData(budget, timestamp) {
    await db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId)
    const insert = db.prepare(`
      INSERT INTO transactions
        (id, user_id, type, account, destination_account, status, category,
         amount_centavos, note, transaction_on, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const entry of budget) {
      await insert.run(
        entry.id,
        userId,
        entry.type,
        entry.account,
        entry.type === 'saving' ? 'savings' : null,
        entry.status,
        entry.category,
        entry.amountCentavos,
        entry.note,
        entry.transactionOn,
        entry.createdAt || timestamp,
      )
    }
  }

  return { importLegacy, status }
}

function normalizeGoal(raw) {
  if (!raw || typeof raw !== 'object') return null
  const habits = Array.isArray(raw.habits) ? raw.habits.map((habit) => ({
    id: crypto.randomUUID(),
    originalId: String(habit.id || ''),
    name: cleanText(habit.name, 'Imported habit'),
    xp: positiveInteger(habit.xp, 10, 100),
    targetPerDay: positiveInteger(habit.targetPerDay, 1, 20),
    cue: ['morning', 'afternoon', 'night', 'anytime'].includes(habit.cue) ? habit.cue : 'anytime',
  })) : []
  const goals = Array.isArray(raw.goals) ? raw.goals.map((goal) => ({
    id: crypto.randomUUID(),
    name: cleanText(goal.name, 'Imported goal'),
    target: positiveInteger(goal.target, 1, 100000),
    current: Math.max(0, Number.parseInt(goal.current, 10) || 0),
    unit: cleanText(goal.unit, 'times').slice(0, 30),
    cadence: goal.cadence === 'weekly' ? 'weekly' : 'ongoing',
    weekKey: goal.cadence === 'weekly' && isDateKey(goal.weekKey) ? goal.weekKey : '',
  })) : []
  return {
    identity: cleanText(raw.identity, 'I am becoming someone who keeps promises to myself.').slice(0, 240),
    arena: cleanText(raw.arena, 'Personal growth').slice(0, 80),
    identityConfirmed: Boolean(raw.identityConfirmed),
    xp: Math.max(0, Number.parseInt(raw.xp, 10) || 0),
    habits,
    goals,
    completions: raw.completions && typeof raw.completions === 'object' ? raw.completions : {},
    evidence: Array.isArray(raw.evidence) ? raw.evidence.map((item) => ({
      description: cleanText(item.text || item.description, 'Imported evidence'),
      xpDelta: Math.max(0, Number.parseInt(item.xp ?? item.xpDelta, 10) || 0),
      eventOn: isDateKey(item.date || item.eventOn) ? item.date || item.eventOn : getDateKey(),
    })) : [],
  }
}

function normalizeBudget(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.entries)) return null
  return raw.entries.flatMap((entry) => {
    const type = ['income', 'expense', 'saving'].includes(entry.type) ? entry.type : null
    const account = accounts.has(entry.account) ? entry.account : 'cash'
    const amountCentavos = Math.round(Number(entry.amount) * 100)
    if (!type || !Number.isInteger(amountCentavos) || amountCentavos < 1) return []
    const rawDate = new Date(entry.date)
    const transactionOn = Number.isNaN(rawDate.getTime()) ? getDateKey() : getDateKey(rawDate)
    const status = type === 'expense' && (entry.status === 'pending' || entry.status === 'to-pay')
      ? 'to-pay'
      : 'paid'
    let category = entry.category
    if (category === 'savings') category = 'saving'
    if (!categories.has(category)) category = type === 'income' ? 'income' : type === 'saving' ? 'saving' : 'needs'
    return [{
      id: crypto.randomUUID(),
      type,
      account,
      status,
      category,
      amountCentavos,
      note: cleanText(entry.note, type === 'expense' ? 'Expense' : 'Imported entry').slice(0, 240),
      transactionOn,
      createdAt: Number.isNaN(rawDate.getTime()) ? null : rawDate.toISOString(),
    }]
  })
}

function cleanText(value, fallback) {
  const text = String(value ?? '').trim()
  return text || fallback
}

function positiveInteger(value, fallback, max) {
  const number = Number.parseInt(value, 10)
  return Number.isInteger(number) && number > 0 ? Math.min(number, max) : fallback
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
}
