import { DatabaseZap, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'

export default function LegacyImport({ onImported }) {
  const [available, setAvailable] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    api('/import/status', { signal: controller.signal })
      .then((status) => setAvailable(status.canImport))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  if (!available || dismissed) return null

  async function importData(payload) {
    if (!window.confirm('Import the data from the original Goal OS and Budget Tracker into the new database? This replaces the starter data.')) return
    setError('')
    try {
      await api('/import/legacy', {
        method: 'POST',
        body: payload,
      })
      setAvailable(false)
      await onImported()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function chooseFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      await importData(payload)
    } catch {
      setError('That file is not a valid Goal OS export.')
    } finally {
      event.target.value = ''
    }
  }

  function importSameOriginData() {
    const parse = (key) => {
      const value = window.localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    }
    return importData({
      goal: parse('goal-os-identity'),
      budget: parse('simple-budget-tracker'),
    })
  }

  const hasSameOriginData = Boolean(
    window.localStorage.getItem('goal-os-identity')
    || window.localStorage.getItem('simple-budget-tracker'),
  )

  return (
    <aside className="import-banner">
      <DatabaseZap size={20} />
      <div><strong>Import original app data</strong><span>Use the export file from the old Goal OS, or import browser data when available.</span>{error && <small>{error}</small>}</div>
      <input accept="application/json,.json" hidden onChange={chooseFile} ref={fileInput} type="file" />
      <button onClick={() => hasSameOriginData ? importSameOriginData() : fileInput.current?.click()} type="button">
        Import
      </button>
      <button aria-label="Dismiss import" className="dismiss" onClick={() => setDismissed(true)} type="button"><X size={16} /></button>
    </aside>
  )
}
