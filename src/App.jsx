import { useState, useRef, useEffect } from 'react'
import { useJournals }      from './hooks/useJournals'
import { useMasters }       from './hooks/useMasters'
import { usePeriod }        from './hooks/usePeriod'
import { useBudget }        from './hooks/useBudget'
import { useUsers }         from './hooks/useUsers'
import { useApprovals }     from './hooks/useApprovals'
import JournalList          from './components/JournalList'
import JournalEntry         from './components/JournalEntry'
import GeneralLedger        from './components/GeneralLedger'
import IncomeStatement      from './components/IncomeStatement'
import BalanceSheet         from './components/BalanceSheet'
import DeptPL               from './components/DeptPL'
import BudgetManagement     from './components/BudgetManagement'
import ApprovalInbox        from './components/ApprovalInbox'
import MyApprovals          from './components/MyApprovals'
import CompanyMaster        from './components/masters/CompanyMaster'
import AccountMaster        from './components/masters/AccountMaster'
import DepartmentMaster     from './components/masters/DepartmentMaster'
import UserManagement       from './components/masters/UserManagement'

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
  { id: 'usermgmt',  label: 'ユーザー管理'    },
]

const APPROVAL_PAGES = [
  { id: 'approvalinbox', label: '承認受付' },
  { id: 'myapprovals',   label: '自分の申請' },
]

const MASTER_IDS   = new Set(MASTER_PAGES.map(p => p.id))
const APPROVAL_IDS = new Set(APPROVAL_PAGES.map(p => p.id))

export default function App() {
  const [page,           setPage]           = useState('list')
  const [editingJournal, setEditingJournal] = useState(null)
  const [masterOpen,     setMasterOpen]     = useState(false)
  const [approvalOpen,   setApprovalOpen]   = useState(false)
  const dropdownRef  = useRef(null)
  const apvDropRef   = useRef(null)

  const { journals, saveJournal, deleteJournal, resetToSample } = useJournals()
  const {
    companies,   saveCompany,   deleteCompany,
    accounts,    saveAccount,   deleteAccount,
    departments, saveDepartment, deleteDepartment,
  } = useMasters()
  const { budgets, getBudget, saveBudgetEntry, saveBudgetBulk, deleteBudget } = useBudget()
  const { users, currentUser, currentUserId, setCurrentUserId, saveUser, deleteUser } = useUsers()
  const { approvals, getApproval, requestApproval, approveJournal, rejectJournal, withdrawApproval } = useApprovals()

  const periodCtx = usePeriod(journals, companies)

  const activeAccounts = accounts.filter(a => a.isActive !== false)

  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setMasterOpen(false)
      if (apvDropRef.current && !apvDropRef.current.contains(e.target)) setApprovalOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function goTo(p) {
    setPage(p)
    setEditingJournal(null)
    setMasterOpen(false)
    setApprovalOpen(false)
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

  const isMasterPage   = MASTER_IDS.has(page)
  const isApprovalPage = APPROVAL_IDS.has(page)
  const pendingCount   = approvals.filter(a => a.status === 'PENDING').length
  const canApprove     = currentUser?.role === 'APPROVER' || currentUser?.role === 'ADMIN'

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

            {/* 承認ドロップダウン */}
            <div className="app-dropdown" ref={apvDropRef}>
              <button
                className={`app-nav-btn app-nav-btn--dropdown ${isApprovalPage || approvalOpen ? 'app-nav-btn--active' : ''}`}
                onClick={() => setApprovalOpen(v => !v)}
              >
                承認
                {pendingCount > 0 && canApprove && (
                  <span className="app-badge-count">{pendingCount}</span>
                )}
                <span className="app-dropdown-chevron">{approvalOpen ? '▲' : '▼'}</span>
              </button>
              {approvalOpen && (
                <div className="app-dropdown-menu">
                  {canApprove && (
                    <button
                      className={`app-dropdown-item ${page === 'approvalinbox' ? 'app-dropdown-item--active' : ''}`}
                      onClick={() => goTo('approvalinbox')}
                    >
                      承認受付
                      {pendingCount > 0 && <span className="app-badge-count app-badge-count--menu">{pendingCount}</span>}
                    </button>
                  )}
                  <button
                    className={`app-dropdown-item ${page === 'myapprovals' ? 'app-dropdown-item--active' : ''}`}
                    onClick={() => goTo('myapprovals')}
                  >
                    自分の申請
                  </button>
                </div>
              )}
            </div>

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

          {/* ユーザー切替 */}
          <div className="app-user-switcher">
            <select
              className="app-user-select"
              value={currentUserId || ''}
              onChange={e => setCurrentUserId(e.target.value)}
              title="操作ユーザーを切り替える"
            >
              {users.filter(u => u.isActive !== false).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
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
            approvals={approvals}
            currentUser={currentUser}
            onRequestApproval={requestApproval}
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

        {page === 'approvalinbox' && (
          <ApprovalInbox
            approvals={approvals}
            journals={journals}
            users={users}
            currentUser={currentUser}
            onApprove={approveJournal}
            onReject={rejectJournal}
          />
        )}
        {page === 'myapprovals' && (
          <MyApprovals
            approvals={approvals}
            journals={journals}
            users={users}
            currentUser={currentUser}
            onEditJournal={handleEdit}
            onReapply={requestApproval}
            onWithdraw={withdrawApproval}
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
        {page === 'usermgmt' && (
          <UserManagement
            users={users}
            saveUser={saveUser}
            deleteUser={deleteUser}
            currentUser={currentUser}
          />
        )}
      </main>
    </div>
  )
}
