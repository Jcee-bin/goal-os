import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/database.js'

async function withApi(run) {
  const db = createDatabase()
  const now = new Date(2026, 5, 6, 10, 0, 0)
  const { app } = createApp({ db, now: () => new Date(now) })
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...options.headers },
      body: options.body && JSON.stringify(options.body),
    })
    return { status: response.status, body: await response.json() }
  }

  try {
    await run({ request })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
  }
}

const create = (request, body) => request('/transactions', { method: 'POST', body })

test('ledger derives cash, bank, savings, spent, pending, and tracked totals', async () => {
  await withApi(async ({ request }) => {
    await create(request, {
      type: 'income', account: 'cash', amountCentavos: 200000, note: 'Cash',
    })
    await create(request, {
      type: 'income', account: 'bank', amountCentavos: 500000, note: 'Bank',
    })
    await create(request, {
      type: 'saving', account: 'cash', amountCentavos: 50000, note: 'Emergency fund',
    })
    await create(request, {
      type: 'expense', account: 'bank', status: 'paid', category: 'needs',
      amountCentavos: 100000, note: 'Course',
    })
    await create(request, {
      type: 'expense', account: 'bank', status: 'to-pay', category: 'wants',
      amountCentavos: 75000, note: 'Future order',
    })

    const summary = (await request('/budget/summary')).body
    assert.deepEqual(summary.balances, { cash: 150000, bank: 400000, savings: 50000 })
    assert.equal(summary.spent, 100000)
    assert.equal(summary.pending, 75000)
    assert.equal(summary.currentMoney, 600000)
    assert.equal(summary.safeToSpend, 475000)
    assert.equal(summary.totalTracked, 700000)
  })
})

test('paid expenses and savings reject insufficient funds', async () => {
  await withApi(async ({ request }) => {
    const expense = await create(request, {
      type: 'expense', account: 'cash', status: 'paid', category: 'needs',
      amountCentavos: 100, note: 'No money',
    })
    assert.equal(expense.status, 409)

    const saving = await create(request, {
      type: 'saving', account: 'bank', amountCentavos: 100, note: 'No money',
    })
    assert.equal(saving.status, 409)
  })
})

test('bulk paid and to-pay actions select the account and reverse naturally', async () => {
  await withApi(async ({ request }) => {
    await create(request, {
      type: 'income', account: 'bank', amountCentavos: 200000, note: 'Money',
    })
    const pending = await create(request, {
      type: 'expense', account: 'cash', status: 'to-pay', category: 'needs',
      amountCentavos: 80000, note: 'Order',
    })

    const paid = await request('/transactions/bulk', {
      method: 'POST',
      body: { ids: [pending.body.id], action: 'paid', account: 'bank' },
    })
    assert.equal(paid.status, 200)
    assert.equal(paid.body.summary.balances.bank, 120000)

    const reverted = await request('/transactions/bulk', {
      method: 'POST',
      body: { ids: [pending.body.id], action: 'to-pay' },
    })
    assert.equal(reverted.body.summary.balances.bank, 200000)
    assert.equal(reverted.body.summary.pending, 80000)
  })
})

test('deleting a transaction reverses its ledger effect', async () => {
  await withApi(async ({ request }) => {
    const income = await create(request, {
      type: 'income', account: 'cash', amountCentavos: 100000, note: 'Money',
    })
    assert.equal((await request('/budget/summary')).body.balances.cash, 100000)
    await request(`/transactions/${income.body.id}`, { method: 'DELETE' })
    assert.equal((await request('/budget/summary')).body.balances.cash, 0)
  })
})

test('filters and pagination return ten entries per page', async () => {
  await withApi(async ({ request }) => {
    for (let index = 0; index < 12; index += 1) {
      await create(request, {
        type: 'expense',
        account: 'cash',
        status: 'to-pay',
        category: index % 2 ? 'wants' : 'needs',
        amountCentavos: 100 + index,
        note: `Pending ${index}`,
      })
    }
    const first = (await request('/transactions?filter=to-pay&page=1')).body
    const second = (await request('/transactions?filter=to-pay&page=2')).body
    assert.equal(first.entries.length, 10)
    assert.equal(first.pagination.totalEntries, 12)
    assert.equal(second.entries.length, 2)
  })
})

test('current and projected 50/30/20 summaries include the correct entries', async () => {
  await withApi(async ({ request }) => {
    await create(request, {
      type: 'income', account: 'cash', amountCentavos: 500000, note: 'Money',
    })
    await create(request, {
      type: 'expense', account: 'cash', status: 'paid', category: 'needs',
      amountCentavos: 100000, note: 'Need',
    })
    await create(request, {
      type: 'expense', account: 'cash', status: 'to-pay', category: 'wants',
      amountCentavos: 50000, note: 'Want',
    })
    await create(request, {
      type: 'saving', account: 'cash', amountCentavos: 75000, note: 'Saving',
    })
    const current = (await request('/budget/summary')).body.split
    const projected = (await request('/budget/summary?projected=true')).body.split
    assert.deepEqual(
      { needs: current.needs, wants: current.wants, debtSaving: current.debtSaving },
      { needs: 100000, wants: 0, debtSaving: 75000 },
    )
    assert.equal(projected.wants, 50000)
  })
})

test('analytics returns fourteen days of ledger-backed sparkline values', async () => {
  await withApi(async ({ request }) => {
    await create(request, {
      type: 'income', account: 'cash', amountCentavos: 300000, note: 'Money',
      transactionOn: '2026-06-01',
    })
    await create(request, {
      type: 'expense', account: 'cash', status: 'paid', category: 'needs',
      amountCentavos: 50000, note: 'Supplies', transactionOn: '2026-06-05',
    })

    const analytics = (await request('/budget/analytics?period=month')).body
    assert.equal(analytics.sparklines.length, 14)
    assert.deepEqual(
      analytics.sparklines.at(-1),
      {
        date: '2026-06-06',
        cash: 250000,
        bank: 0,
        savings: 0,
        spent: 50000,
        pending: 0,
        currentMoney: 250000,
        totalTracked: 300000,
      },
    )
  })
})
