import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HabitsView from './HabitsView'

describe('HabitsView', () => {
  it('creates a daily habit with cue, target, and XP', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(
      <HabitsView
        habits={[]}
        onComplete={() => {}}
        onCreate={onCreate}
        onDelete={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'NSDR' } })
    fireEvent.change(screen.getByLabelText('Times per day'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Time of day'), { target: { value: 'afternoon' } })
    fireEvent.change(screen.getByLabelText('XP reward'), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add habit' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      name: 'NSDR',
      targetPerDay: 2,
      cue: 'afternoon',
      xp: 15,
    }))
  })
})
