import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { money } from '../../api/client'

export default function TransactionHistory({
  filters,
  onBulk,
  onFilterChange,
  onPage,
  onSelect,
  selected,
  transactions,
}) {
  const checkedTotal = transactions.entries
    .filter((entry) => selected.has(entry.id) && entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amountCentavos, 0)

  return (
    <section className="panel history-panel">
      <div className="panel-heading">
        <div><h2>History</h2><p>{transactions.pagination.totalEntries} entries</p></div>
        <strong>{money.format(checkedTotal / 100)} selected</strong>
      </div>
      <div className="history-filters">
        <label><span>Show</span><select onChange={(event) => onFilterChange('filter', event.target.value)} value={filters.filter}>
          <option value="all">All logs</option><option value="to-pay">To pay</option><option value="paid">Paid</option>
          <option value="needs">Needs</option><option value="wants">Wants</option><option value="debt">Debt</option>
          <option value="saving">Saving</option><option value="income">Income</option>
        </select></label>
        <label><span>From</span><input onChange={(event) => onFilterChange('startDate', event.target.value)} type="date" value={filters.startDate} /></label>
        <label><span>To</span><input onChange={(event) => onFilterChange('endDate', event.target.value)} type="date" value={filters.endDate} /></label>
      </div>
      <div className="history-list">
        {transactions.entries.length === 0 && <p className="empty">No entries match these filters.</p>}
        {transactions.entries.map((entry) => (
          <article className="history-row" key={entry.id}>
            <input
              aria-label={`Select ${entry.note}`}
              checked={selected.has(entry.id)}
              onChange={(event) => onSelect(entry.id, event.target.checked)}
              type="checkbox"
            />
            <div className="history-tags">
              <span className={`pill ${entry.account}`}>{entry.type === 'expense' && entry.status === 'to-pay' ? 'To pay' : entry.account}</span>
              <span className={`pill category ${entry.category}`}>{entry.category}</span>
            </div>
            <div><strong>{entry.note}</strong><span>{entry.type} · {entry.transactionOn}</span></div>
            <strong className={`history-amount ${entry.type} ${entry.status}`}>
              {entry.type === 'income' ? '+' : entry.type === 'expense' && entry.status === 'paid' ? '-' : ''}
              {money.format(entry.amountCentavos / 100)}
            </strong>
          </article>
        ))}
      </div>
      <footer className="pagination">
        <button aria-label="Previous page" disabled={transactions.pagination.page <= 1} onClick={() => onPage(transactions.pagination.page - 1)} type="button"><ChevronLeft size={17} /></button>
        <span>Page {transactions.pagination.page} of {transactions.pagination.totalPages}</span>
        <button aria-label="Next page" disabled={transactions.pagination.page >= transactions.pagination.totalPages} onClick={() => onPage(transactions.pagination.page + 1)} type="button"><ChevronRight size={17} /></button>
      </footer>

      {selected.size > 0 && (
        <div className="bulk-bar">
          <strong>{selected.size} selected</strong>
          <select id="bulk-account" defaultValue="cash"><option value="cash">Cash</option><option value="bank">Bank</option><option value="savings">Savings</option></select>
          <select id="bulk-category" defaultValue="needs"><option value="needs">Needs</option><option value="wants">Wants</option><option value="debt">Debt</option><option value="saving">Saving</option></select>
          <button onClick={() => onBulk('categorize', { category: document.querySelector('#bulk-category').value })} type="button">Categorize</button>
          <button onClick={() => onBulk('to-pay')} type="button">To pay</button>
          <button onClick={() => onBulk('paid', { account: document.querySelector('#bulk-account').value })} type="button">Paid</button>
          <button className="danger-button" onClick={() => onBulk('delete')} type="button"><Trash2 size={15} /> Delete</button>
        </div>
      )}
    </section>
  )
}
