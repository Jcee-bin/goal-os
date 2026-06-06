import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppShell from './AppShell'

describe('AppShell', () => {
  it('shows all unified views and changes navigation', () => {
    const onNavigate = vi.fn()
    render(
      <AppShell activeView="dashboard" onNavigate={onNavigate} onReset={() => {}}>
        <p>Content</p>
      </AppShell>,
    )

    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'Budget' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Analytics' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Habits' }))
    expect(onNavigate).toHaveBeenCalledWith('habits')
  })
})
