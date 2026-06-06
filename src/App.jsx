import { useState, useRef, useEffect } from 'react'
import { useJournals }      from './hooks/useJournals'
import { useMasters }       from './hooks/useMasters'
import { usePeriod }        from './hooks/usePeriod'
import { useBudget }        from './hooks/useBudget'
import JournalList          from './components/JournalList'
import JournalEntry         from './components/JournalEntry'
import GeneralLedger        from './components/GeneralLedger'
import IncomeStatement      from './components/IncomeStatement'
import BalanceSheet         from './components/BalanceSheet'
import DeptPL               from './components/DeptPL'
import BudgetManagement     from './components/BudgetManagement'
import CompanyMaster        from './components/masters/CompanyMaster'
import AccountMaster        from './components/masters/AccountMaster'
import DepartmentMaster     from './components/masters/DepartmentMaster'

const MAIN_PAGES = [
  { id: 'list',   label: '仕訳一覧'   },
  { id: 'ledger', label: '総勘定元帳'  },
  { id: 'pl',     label: '損益計算書'  },
  { id: 'bs',     label: '貸借対照表'  },
  { id: 'deptpl', label: '部門別損益'  },
  { id: 'budget', label: '予算管理'   },
]

const MASTER_PAGES = [
  { id: 'company',   label: '会社マスタ'      },
  { id: 'acctmaster', label: '勘定科目マスタ'  },
  { id: 'deptmaster', label: '部門マスタ'      },
]

const MASTER_IDS = new Set(MASTER_PAGES.map(p => p.id))

export default function App() {
  const [page,           setPage]           = useState('list')
  const [editingJournal, setEditingJournal] = useState(null)
  const [masterOpen,     setMasterOpen]     = useState(false)
  const dropdownRef = useRef(null)

  const { journals, saveJournal, deleteJournal, resetToSample } = useJournals()
  const {
    companies,   saveCompany,   deleteCompany,
    accounts,    saveAccount,   deleteAccount,
    departments, saveDepartment, deleteDepartment,
  } = useMasters()
  const { budgets, getBudget, saveBudgetEntry, saveBudgetBulk, deleteBudget } = useBudget()

  const periodCtx = usePeriod(journals, companies)

  const activeAccounts = accounts.filter(a => a.isActive !== false)

  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMasterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function goTo(p) {
    setPage(p)
    setEditingJournal(null)
    setMasterOpen(false)
  }

  function handleNew() {
    setEditingJournal(null)
    setPage('entry')
  }

  function handleEdit(journal) {
    setEditingJournal(journal)
    setPage('entry')
  }

  function handleSave(journal) {
    saveJournal(journal)
    setPage('list')
  }

  const isMasterPage = MASTER_IDS.has(page)

  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <div className="app-header-inner">
          <span className="app-logo" onClick={() => goTo('list')} style={{ cursor: 'pointer' }}>
            会計システム
          </span>

          <nav className="app-nav">
            {MAIN_PAGES.map(p => (
              <button
                key={p.id}
                className={`app-nav-btn ${page === p.id ? 'app-nav-btn--active' : ''}`}
                onClick={() => goTo(p.id)}
              >
                {p.label}
              </button>
            ))}

            {/* マスタ管理ドロップダウン */}
            <div className="app-dropdown" ref={dropdownRef}>
              <button
                className={`app-nav-btn app-nav-btn--dropdown ${isMasterPage || masterOpen ? 'app-nav-btn--active' : ''}`}
                onClick={() => setMasterOpen(v => !v)}
              >
                マスタ管理 <span className="app-dropdown-chevron">{masterOpen ? '▲' : '▼'}</span>
              </button>
              {masterOpen && (
                <div className="app-dropdown-menu">
                  {MASTER_PAGES.map(p => (
                    <button
                      key={p.id}
                      className={`app-dropdown-item ${page === p.id ? 'app-dropdown-item--active' : ''}`}
                      onClick={() => goTo(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {page === 'list'   && (
          <JournalList
            journals={journals}
            onNew={handleNew}
            onEdit={handleEdit}
            onDelete={deleteJournal}
            onReset={resetToSample}
            accounts={activeAccounts}
            periodCtx={periodCtx}
          />
        )}
        {page === 'entry'  && (
          <JournalEntry
            initialData={editingJournal}
            onSave={handleSave}
            onCancel={() => setPage('list')}
            accounts={activeAccounts}
            departments={departments}
          />
        )}
        {page === 'ledger' && (
          <GeneralLedger
            journals={journals}
            accounts={activeAccounts}
            periodCtx={periodCtx}
          />
        )}
        {page === 'pl' && (
          <IncomeStatement
            journals={journals}
            accounts={activeAccounts}
            periodCtx={periodCtx}
          />
        )}
        {page === 'bs' && (
          <BalanceSheet
            journals={journals}
            accounts={activeAccounts}
            periodCtx={periodCtx}
          />
        )}

        {page === 'deptpl' && (
          <DeptPL
            journals={journals}
            accounts={activeAccounts}
            departments={departments}
            periodCtx={periodCtx}
            budgets={budgets}
          />
        )}
        {page === 'budget' && (
          <BudgetManagement
            journals={journals}
            accounts={activeAccounts}
            departments={departments}
            budgets={budgets}
            getBudget={getBudget}
            saveBudgetBulk={saveBudgetBulk}
            deleteBudget={deleteBudget}
            periodCtx={periodCtx}
          />
        )}

        {page === 'company'    && (
          <CompanyMaster
            companies={companies}
            saveCompany={saveCompany}
            deleteCompany={deleteCompany}
          />
        )}
        {page === 'acctmaster' && (
          <AccountMaster
            accounts={accounts}
            saveAccount={saveAccount}
            deleteAccount={deleteAccount}
          />
        )}
        {page === 'deptmaster' && (
          <DepartmentMaster
            departments={departments}
            saveDepartment={saveDepartment}
            deleteDepartment={deleteDepartment}
          />
        )}
      </main>
    </div>
  )
}
