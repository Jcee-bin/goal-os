import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TransactionForm from './TransactionForm'

describe('TransactionForm', () => {
  it('submits a to-pay needs expense in centavos', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm onCreate={onCreate} />)

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '250.50' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'to-pay' } })
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Future order' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      amount: '250.50',
      amountCentavos: 25050,
      account: 'cash',
      category: 'needs',
      note: 'Future order',
      status: 'to-pay',
      type: 'expense',
    }))
  })
})
