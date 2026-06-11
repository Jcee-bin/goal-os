import { useEffect, useRef, useState } from 'react'

const ITEM_H = 52

export default function DrumPicker({ items, defaultValue, onChange, width = 64 }) {
  const scrollRef = useRef(null)
  const debounceRef = useRef(null)
  const snappingRef = useRef(false)
  const initIdx = Math.max(0, items.indexOf(defaultValue))
  const [selectedIdx, setSelectedIdx] = useState(initIdx)

  useEffect(() => {
    if (scrollRef.current) {
      snappingRef.current = true
      scrollRef.current.scrollTop = initIdx * ITEM_H
      setTimeout(() => { snappingRef.current = false }, 60)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleScroll() {
    if (snappingRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const raw = scrollRef.current?.scrollTop ?? 0
      const idx = Math.max(0, Math.min(Math.round(raw / ITEM_H), items.length - 1))
      snappingRef.current = true
      scrollRef.current.scrollTop = idx * ITEM_H
      setTimeout(() => { snappingRef.current = false }, 60)
      setSelectedIdx(idx)
      onChange(items[idx])
    }, 130)
  }

  function clickItem(idx) {
    setSelectedIdx(idx)
    onChange(items[idx])
    scrollRef.current.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
  }

  return (
    <div className="drum-wrap" style={{ width }}>
      <div className="drum-selection" />
      <div className="drum-scroll" ref={scrollRef} onScroll={handleScroll}>
        <div className="drum-spacer" />
        {items.map((item, i) => (
          <div
            key={item}
            className={`drum-item${i === selectedIdx ? ' sel' : ''}`}
            onClick={() => clickItem(i)}
          >
            {item}
          </div>
        ))}
        <div className="drum-spacer" />
      </div>
    </div>
  )
}
