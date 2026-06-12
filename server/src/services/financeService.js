import {
  accounts,
  categories,
  conflict,
  getDateKey,
  notFound,
  requireEnum,
  requireText,
  transactionStatuses,
  transactionTypes,
  validationError,
} from '../domain.js'
import { createFinanceRepository } from '../repositories/financeRepository.js'

const PAGE_SIZE = 10

export function createFinanceService({ db, userId, now = () => new Date() }) {
  const repository = createFinanceRepository(db)

  async function transaction(work) {
    await db.exec('BEGIN IMMEDIATE')
    try {
      const result = await work()
      await db.exec('COMMIT')
      return result
    } catch (error) {
      await db.exec('ROLLBACK')
      throw error
    }
  }

  async function all() {
    return repository.list(userId)
  }

  function balances(entries = []) {
    const result = { cash: 0, bank: 0, savings: 0 }
    for (const entry of entries) {
      if (entry.type === 'income') result[entry.account] += entry.amountCentavos
      if (entry.type === 'expense' && entry.status === 'paid') {
        result[entry.account] -= entry.amountCentavos
      }
      if (entry.type === 'saving') {
        result[entry.account] -= entry.amountCentavos
        result.savings += entry.amountCentavos
      }
    }
    return result
  }

  function assertFunds(account, amountCentavos, entries = []) {
    const available = balances(entries)[account]
    if (amountCentavos > available) {
      throw conflict(`Not enough ${account}. Available balance is ${available} centavos.`)
    }
  }

  function normalizeAmount(value) {
    const amount = Number(value)
    if (!Number.isInteger(amount) || amount < 1 || amount > 100_000_000_00) {
      throw validationError('amountCentavos', 'amountCentavos must be a positive integer')
    }
    return amount
  }

  function normalizeCreate(input) {
    const type = requireEnum(input.type, 'type', transactionTypes)
    const account = requireEnum(input.account, 'account', accounts)
    const amountCentavos = normalizeAmount(input.amountCentavos)
    const note = String(input.note ?? '').trim().slice(0, 240)
    const transactionOn = input.transactionOn || getDateKey(now())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionOn)) {
      throw validationError('transactionOn', 'transactionOn must use YYYY-MM-DD')
    }

    if (type === 'income') {
      return {
        type,
        account,
        destinationAccount: null,
        status: 'paid',
        category: 'income',
        amountCentavos,
        note: note || 'Added money',
        transactionOn,
      }
    }

    if (type === 'saving') {
      if (account === 'savings') {
        throw validationError('account', 'Savings transfers must come from cash or bank')
      }
      return {
        type,
        account,
        destinationAccount: 'savings',
        status: 'paid',
        category: 'saving',
        amountCentavos,
        note: note || 'Set aside',
        transactionOn,
      }
    }

    const status = requireEnum(input.status ?? 'paid', 'status', transactionStatuses)
    const category = requireEnum(input.category ?? 'needs', 'category', categories)
    if (category === 'income') throw validationError('category', 'Expense category cannot be income')
    return {
      type,
      account,
      destinationAccount: null,
      status,
      category,
      amountCentavos,
      note: note || 'Expense',
      transactionOn,
    }
  }

  function summary(entries = [], period = 'month', projected = false) {
    const accountBalances = balances(entries)
    const spent = sum(entries.filter(isPaidExpense))
    const pending = sum(entries.filter(isPendingExpense))
    const currentMoney = accountBalances.cash + accountBalances.bank + accountBalances.savings
    const inRange = entries.filter((entry) => isInPeriod(entry.transactionOn, period, now()))
    const categoryTotals = categorySplit(inRange, projected)
    const splitTotal = Object.values(categoryTotals).reduce((total, value) => total + value, 0)

    return {
      balances: accountBalances,
      spent,
      pending,
      currentMoney,
      safeToSpend: Math.max(0, accountBalances.cash + accountBalances.bank - pending),
      totalTracked: currentMoney + spent,
      split: {
        ...categoryTotals,
        total: splitTotal,
        needsPercent: percent(categoryTotals.needs, splitTotal),
        wantsPercent: percent(categoryTotals.wants, splitTotal),
        debtSavingPercent: percent(categoryTotals.debtSaving, splitTotal),
      },
    }
  }

  async function listTransactions(filters = {}) {
    const entries = (await all()).filter((entry) => {
      if (filters.startDate && entry.transactionOn < filters.startDate) return false
      if (filters.endDate && entry.transactionOn > filters.endDate) return false
      if (filters.filter && filters.filter !== 'all' && !matchesFilter(entry, filters.filter)) {
        return false
      }
      return true
    })
    const page = Math.max(1, Number(filters.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize) || PAGE_SIZE))
    const totalPages = Math.max(1, Math.ceil(entries.length / pageSize))
    const currentPage = Math.min(page, totalPages)
    return {
      entries: entries.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      pagination: {
        page: currentPage,
        pageSize,
        totalEntries: entries.length,
        totalPages,
      },
    }
  }

  return {
    listTransactions,

    async create(input) {
      const normalized = normalizeCreate(input)
      if (
        normalized.type === 'saving'
        || (normalized.type === 'expense' && normalized.status === 'paid')
      ) {
        assertFunds(normalized.account, normalized.amountCentavos, await all())
      }
      return repository.insert(userId, {
        id: crypto.randomUUID(),
        ...normalized,
        createdAt: now().toISOString(),
      })
    },

    async delete(id) {
      const result = await repository.delete(userId, id)
      if (!result.changes) throw notFound('Transaction not found')
      return { deleted: true }
    },

    async bulk(input) {
      const ids = Array.isArray(input.ids) ? [...new Set(input.ids)] : []
      if (!ids.length) throw validationError('ids', 'Select at least one transaction')
      const selected = await Promise.all(ids.map((id) => repository.get(userId, id)))
      if (selected.some((entry) => !entry)) throw notFound('Transaction not found')

      return transaction(async () => {
        if (input.action === 'delete') {
          for (const entry of selected) await repository.delete(userId, entry.id)
        } else if (input.action === 'paid') {
          const account = requireEnum(input.account, 'account', accounts)
          const pending = selected.filter(isPendingExpense)
          if (!pending.length) throw conflict('No selected to-pay expenses')
          const total = sum(pending)
          assertFunds(account, total, await all())
          for (const entry of pending) {
            await repository.updateStatusAndAccount(userId, entry.id, 'paid', account)
          }
        } else if (input.action === 'to-pay') {
          const paid = selected.filter(isPaidExpense)
          if (!paid.length) throw conflict('No selected paid expenses')
          for (const entry of paid) {
            await repository.updateStatusAndAccount(userId, entry.id, 'to-pay', entry.account)
          }
        } else if (input.action === 'categorize') {
          const category = requireEnum(input.category, 'category', categories)
          const compatible = selected.filter((entry) => (
            entry.type === 'expense' ? category !== 'income' : entry.type === 'income' && category === 'income'
          ))
          if (!compatible.length) throw conflict('No selected transactions accept that category')
          for (const entry of compatible) await repository.updateCategory(userId, entry.id, category)
        } else {
          throw validationError('action', 'Invalid bulk action')
        }
        return {
          changed: selected.length,
          summary: summary(await all()),
        }
      })
    },

    async summary(options = {}) {
      return summary(await all(), options.period || 'month', Boolean(options.projected))
    },

    async analytics(options = {}) {
      const period = options.period || 'month'
      const allEntries = await all()
      const entries = allEntries.filter((entry) => isInPeriod(entry.transactionOn, period, now()))
      const paidExpenses = entries.filter(isPaidExpense)
      const trendMap = new Map()
      for (const entry of paidExpenses) {
        trendMap.set(
          entry.transactionOn,
          (trendMap.get(entry.transactionOn) || 0) + entry.amountCentavos,
        )
      }
      return {
        period,
        current: summary(entries, 'all', false).split,
        projected: summary(entries, 'all', true).split,
        trend: [...trendMap.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([date, amountCentavos]) => ({ date, amountCentavos })),
        largestCharges: entries
          .filter((entry) => entry.type === 'expense')
          .sort((left, right) => right.amountCentavos - left.amountCentavos)
          .slice(0, 5),
        sparklines: balanceTimeline(allEntries, now()),
      }
    },

    async reset() {
      await repository.deleteAll(userId)
      return summary([])
    },
  }
}

function sum(entries) {
  return entries.reduce((total, entry) => total + entry.amountCentavos, 0)
}

function isPaidExpense(entry) {
  return entry.type === 'expense' && entry.status === 'paid'
}

function isPendingExpense(entry) {
  return entry.type === 'expense' && entry.status === 'to-pay'
}

function categorySplit(entries, projected) {
  return entries.reduce(
    (totals, entry) => {
      if (entry.type === 'saving') totals.debtSaving += entry.amountCentavos
      if (entry.type === 'expense' && (entry.status === 'paid' || projected)) {
        if (entry.category === 'needs') totals.needs += entry.amountCentavos
        else if (entry.category === 'wants') totals.wants += entry.amountCentavos
        else totals.debtSaving += entry.amountCentavos
      }
      return totals
    },
    { needs: 0, wants: 0, debtSaving: 0 },
  )
}

function percent(amount, total) {
  return total ? Math.round((amount / total) * 100) : 0
}

function balanceTimeline(entries, today) {
  const points = []
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)
    const dateKey = getDateKey(date)
    const available = entries.filter((entry) => entry.transactionOn <= dateKey)
    const accountBalances = available.reduce(
      (result, entry) => {
        if (entry.type === 'income') result[entry.account] += entry.amountCentavos
        if (entry.type === 'expense' && entry.status === 'paid') {
          result[entry.account] -= entry.amountCentavos
        }
        if (entry.type === 'saving') {
          result[entry.account] -= entry.amountCentavos
          result.savings += entry.amountCentavos
        }
        return result
      },
      { cash: 0, bank: 0, savings: 0 },
    )
    const spent = sum(available.filter(isPaidExpense))
    const pending = sum(available.filter(isPendingExpense))
    const currentMoney = accountBalances.cash + accountBalances.bank + accountBalances.savings
    points.push({
      date: dateKey,
      ...accountBalances,
      spent,
      pending,
      currentMoney,
      totalTracked: currentMoney + spent,
    })
  }
  return points
}

function matchesFilter(entry, filter) {
  if (filter === 'to-pay') return isPendingExpense(entry)
  if (filter === 'paid') return isPaidExpense(entry)
  if (filter === 'income') return entry.type === 'income'
  if (filter === 'saving') return entry.type === 'saving' || entry.category === 'saving'
  if (['needs', 'wants', 'debt'].includes(filter)) return entry.category === filter
  return true
}

function isInPeriod(dateKey, period, now) {
  if (period === 'all') return true
  const date = new Date(`${dateKey}T00:00:00`)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const start = new Date(end)
  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    start.setHours(0, 0, 0, 0)
  } else if (period === 'lastmonth') {
    start.setFullYear(end.getFullYear(), end.getMonth() - 1, 1)
    start.setHours(0, 0, 0, 0)
    end.setFullYear(end.getFullYear(), end.getMonth(), 0)
    end.setHours(23, 59, 59, 999)
  } else {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }
  return date >= start && date <= end
}
