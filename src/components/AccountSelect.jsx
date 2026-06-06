import { useState, useRef, useEffect } from 'react'
import { accounts as _staticAccounts, CATEGORIES } from '../data/accounts'

export default function AccountSelect({
  value,
  onChange,
  placeholder = '科目を選択',
  hasError = false,
  accounts,
}) {
  const allAccounts = accounts || _staticAccounts
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const searchRef = useRef(null)

  const selected = allAccounts.find(a => a.code === value)

  const filtered = search.trim()
    ? allAccounts.filter(a => a.code.includes(search) || a.name.includes(search))
    : allAccounts

  const grouped = Object.entries(CATEGORIES)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, cat]) => ({ key, name: cat.name, items: filtered.filter(a => a.category === key) }))
    .filter(g => g.items.length > 0)

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchRef.current) searchRef.current.focus()
  }, [isOpen])

  function handleSelect(code) {
    onChange(code)
    setIsOpen(false)
    setSearch('')
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(v => !v) }
    if (e.key === 'Escape') { setIsOpen(false); setSearch('') }
  }

  return (
    <div
      ref={containerRef}
      className={`acsel ${isOpen ? 'acsel--open' : ''} ${hasError ? 'acsel--error' : ''}`}
    >
      <div
        className="acsel__trigger"
        onClick={() => setIsOpen(v => !v)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selected ? (
          <span className="acsel__selected">
            <span className="acsel__code">{selected.code}</span>
            <span className="acsel__name">{selected.name}</span>
          </span>
        ) : (
          <span className="acsel__placeholder">{placeholder}</span>
        )}
        <span className="acsel__controls">
          {selected && (
            <button type="button" className="acsel__clear" onClick={handleClear} tabIndex={-1} aria-label="クリア">
              ×
            </button>
          )}
          <span className="acsel__chevron">{isOpen ? '▲' : '▼'}</span>
        </span>
      </div>

      {isOpen && (
        <div className="acsel__dropdown" role="listbox">
          <div className="acsel__search-wrap">
            <input
              ref={searchRef}
              type="text"
              className="acsel__search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="コード・科目名で検索..."
              onKeyDown={e => e.key === 'Escape' && (setIsOpen(false), setSearch(''))}
            />
          </div>
          <div className="acsel__list">
            {grouped.length === 0 ? (
              <div className="acsel__empty">該当する科目がありません</div>
            ) : (
              grouped.map(group => (
                <div key={group.key}>
                  <div className="acsel__group-header">{group.name}</div>
                  {group.items.map(account => (
                    <div
                      key={account.code}
                      className={`acsel__item ${account.code === value ? 'acsel__item--selected' : ''}`}
                      onClick={() => handleSelect(account.code)}
                      role="option"
                      aria-selected={account.code === value}
                    >
                      <span className="acsel__item-code">{account.code}</span>
                      <span className="acsel__item-name">{account.name}</span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
