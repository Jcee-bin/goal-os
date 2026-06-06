import { ArrowDownToLine, Landmark, Plus, PiggyBank } from 'lucide-react'
import { useState } from 'react'
import { pesosToCentavos } from '../../api/client'

const defaults = {
  income: { amount: '', account: 'cash', note: '' },
  expense: { amount: '', account: 'cash', status: 'paid', category: 'needs', note: '' },
  saving: { amount: '', account: 'cash', note: '' },
}

export default function TransactionForm({ onCreate }) {
  const [type, setType] = useState('expense')
  const [forms, setForms] = useState(defaults)
  const [error, setError] = useState('')
  const form = forms[type]

  function update(field, value) {
    setForms({ ...forms, [type]: { ...form, [field]: value } })
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      await onCreate({
        ...form,
        type,
        amountCentavos: pesosToCentavos(form.amount),
      })
      setForms({ ...forms, [type]: defaults[type] })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <section className="panel transaction-workspace">
      <div className="segmented form-tabs">
        <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')} type="button"><ArrowDownToLine size={16} /> Add money</button>
        <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')} type="button"><Landmark size={16} /> Expense</button>
        <button className={type === 'saving' ? 'active' : ''} onClick={() => setType('saving')} type="button"><PiggyBank size={16} /> Set aside</button>
      </div>
      <form className="transaction-form" onSubmit={submit}>
        <label><span>Amount</span><input min="0.01" onChange={(event) => update('amount', event.target.value)} placeholder="0.00" required step="0.01" type="number" value={form.amount} /></label>
        <label>
          <span>{type === 'saving' ? 'Take from' : type === 'income' ? 'Where is it?' : 'Account'}</span>
          <select onChange={(event) => update('account', event.target.value)} value={form.account}>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            {type === 'income' && <option value="savings">Savings</option>}
          </select>
        </label>
        {type === 'expense' && (
          <>
            <label><span>Status</span><select onChange={(event) => update('status', event.target.value)} value={form.status}><option value="paid">Paid</option><option value="to-pay">To pay</option></select></label>
            <label><span>Budget type</span><select onChange={(event) => update('category', event.target.value)} value={form.category}><option value="needs">Needs</option><option value="wants">Wants</option><option value="debt">Debt</option><option value="saving">Saving</option></select></label>
          </>
        )}
        <label className="note-field"><span>Note</span><input onChange={(event) => update('note', event.target.value)} placeholder={type === 'expense' ? 'Food, fare, bills' : 'Allowance, emergency fund...'} value={form.note} /></label>
        <button className="primary-button" type="submit"><Plus size={17} /> Add entry</button>
      </form>
      {error && <p className="form-error">{error}</p>}
    </section>
  )
}
