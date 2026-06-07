import { useState, useRef, useEffect } from 'react'
import { useJournals }      from './hooks/useJournals'
import { useMasters }       from './hooks/useMasters'
import { usePeriod }        from './hooks/usePeriod'
import { useBudget }        from './hooks/useBudget'
import { useUsers }         from './hooks/useUsers'
import { useApprovals }     from './hooks/useApprovals'
import { useAuth }          from './hooks/useAuth'
import { useAuditLog }      from './hooks/useAuditLog'
import { useOpLog }         from './hooks/useOpLog'
import { useSubsidiaries }  from './hooks/useSubsidiaries'
import { useConsolidation } from './hooks/useConsolidation'
import JournalList          from './components/JournalList'
import JournalEntry         from './components/JournalEntry'
import GeneralLedger        from './components/GeneralLedger'
import IncomeStatement      from './components/IncomeStatement'
import BalanceSheet         from './components/BalanceSheet'
import DeptPL               from './components/DeptPL'
import BudgetManagement     from './components/BudgetManagement'
import ApprovalInbox        from './components/ApprovalInbox'
import MyApprovals          from './components/MyApprovals'
import InvoiceSummary       from './components/InvoiceSummary'
import AuditHistory         from './components/AuditHistory'
import OpLog                from './components/OpLog'
import ICSoxDashboard       from './components/ICSoxDashboard'
import SubsidiaryMaster     from './components/consolidation/SubsidiaryMaster'
import FxRates              from './components/consolidation/FxRates'
import ConsolidationPackage from './components/consolidation/ConsolidationPackage'
import Eliminations         from './components/consolidation/Eliminations'
import ConsolidatedFS       from './components/consolidation/ConsolidatedFS'
import LoginScreen          from './components/LoginScreen'
import CompanyMaster        from './components/masters/CompanyMaster'
import AccountMaster        from './components/masters/AccountMaster'
import DepartmentMaster     from './components/masters/DepartmentMaster'
import UserManagement       from './components/masters/UserManagement'

// 役割ごとのアクセス可能ページ
const ALLOWED_PAGES = {
  USER:     new Set(['list', 'entry', 'ledger', 'pl', 'bs', 'myapprovals']),
  APPROVER: new Set(['list', 'entry', 'ledger', 'pl', 'bs', 'deptpl', 'budget', 'invoice', 'myapprovals', 'approvalinbox', 'audithistory']),
  ADMIN:    new Set(['list', 'entry', 'ledger', 'pl', 'bs', 'deptpl', 'budget', 'invoice', 'myapprovals', 'approvalinbox', 'company', 'acctmaster', 'deptmaster', 'usermgmt', 'audithistory', 'jsoxdash', 'oplog', 'conso-subs', 'conso-fx', 'conso-pkg', 'conso-elim', 'conso-fs']),
}

const ALL_MAIN_PAGES = [
  { id: 'list',    label: '仕訳一覧'    },
  { id: 'ledger',  label: '総勘定元帳'  },
  { id: 'pl',      label: '損益計算書'  },
  { id: 'bs',      label: '貸借対照表'  },
  { id: 'deptpl',  label: '部門別損益'  },
  { id: 'budget',  label: '予算管理'   },
  { id: 'invoice',      label: 'インボイス'   },
  { id: 'audithistory', label: '訂正削除履歴' },
]

const MASTER_PAGES = [
  { id: 'company',    label: '会社マスタ'     },
  { id: 'acctmaster', label: '勘定科目マスタ' },
  { id: 'deptmaster', label: '部門マスタ'     },
  { id: 'usermgmt',   label: 'ユーザー管理'  },
]

const SOX_PAGES = [
  { id: 'jsoxdash', label: '内部統制ダッシュボード' },
  { id: 'oplog',    label: '操作ログ照会'           },
]

const CONSO_PAGES = [
  { id: 'conso-subs', label: '子会社管理'     },
  { id: 'conso-fx',   label: '為替レート'     },
  { id: 'conso-pkg',  label: '連結パッケージ' },
  { id: 'conso-elim', label: '相殺消去'       },
  { id: 'conso-fs',   label: '連結財務諸表'   },
]

const MASTER_IDS   = new Set(MASTER_PAGES.map(p => p.id))
const APPROVAL_IDS = new Set(['approvalinbox', 'myapprovals'])
const SOX_IDS      = new Set(SOX_PAGES.map(p => p.id))
const CONSO_IDS    = new Set(CONSO_PAGES.map(p => p.id))

const ROLE_LABELS = { USER: '一般', APPROVER: '承認者', ADMIN: '管理者' }

export default function App() {
  const [page,           setPage]           = useState('list')
  const [editingJournal, setEditingJournal] = useState(null)
  const [masterOpen,     setMasterOpen]     = useState(false)
  const [approvalOpen,   setApprovalOpen]   = useState(false)
  const [soxOpen,        setSoxOpen]        = useState(false)
  const [consoOpen,      setConsoOpen]      = useState(false)
  const dropdownRef = useRef(null)
  const apvDropRef  = useRef(null)
  const soxDropRef  = useRef(null)
  const consoDropRef = useRef(null)

  const { journals, saveJournal, deleteJournal, resetToSample } = useJournals()
  const {
    companies,   saveCompany,   deleteCompany,
    accounts,    saveAccount,   deleteAccount,
    departments, saveDepartment, deleteDepartment,
  } = useMasters()
  const { budgets, getBudget, saveBudgetBulk, deleteBudget } = useBudget()
  const { users, saveUser, deleteUser }                        = useUsers()
  const { approvals, requestApproval, approveJournal, rejectJournal, withdrawApproval } = useApprovals()
  const { isLoggedIn, currentUser, login, logout }            = useAuth(users)
  const { logs: auditLogs, addLog, getLogsForJournal }        = useAuditLog()
  const { logs: opLogs, addOpLog }                            = useOpLog()
  const { subsidiaries, saveSubsidiary, deleteSubsidiary }    = useSubsidiaries()
  const {
    fxRates, saveFxRate, deleteFxRate, getFxRate,
    packages, savePackage, deletePackage, getPackage,
    eliminations, saveElimination, deleteElimination,
  } = useConsolidation()

  function logOp(entry) {
    addOpLog({
      ...entry,
      userId:   entry.userId   ?? currentUser?.id   ?? '',
      userName: entry.userName ?? currentUser?.name ?? '',
    })
  }

  const role       = currentUser?.role || 'USER'
  const allowed    = ALLOWED_PAGES[role] || ALLOWED_PAGES.USER
  const canApprove = role === 'APPROVER' || role === 'ADMIN'
  const isAdmin    = role === 'ADMIN'

  const periodCtx      = usePeriod(journals, companies)
  const activeAccounts = accounts.filter(a => a.isActive !== false)
  const pendingCount   = approvals.filter(a => a.status === 'PENDING').length

  // ページが許可外になったら list にリダイレクト
  useEffect(() => {
    if (isLoggedIn && !allowed.has(page)) {
      setPage('list')
      setEditingJournal(null)
    }
  }, [isLoggedIn, role, page, allowed])

  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setMasterOpen(false)
      if (apvDropRef.current  && !apvDropRef.current.contains(e.target))  setApprovalOpen(false)
      if (soxDropRef.current   && !soxDropRef.current.contains(e.target))   setSoxOpen(false)
      if (consoDropRef.current && !consoDropRef.current.contains(e.target)) setConsoOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function goTo(p) {
    if (!allowed.has(p)) return
    setPage(p)
    setEditingJournal(null)
    setMasterOpen(false)
    setApprovalOpen(false)
    setSoxOpen(false)
    setConsoOpen(false)
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
    const existing = journals.find(j => j.id === journal.id)
    addLog({
      type:      existing ? 'EDIT' : 'CREATE',
      journalId: journal.id,
      userId:    currentUser?.id   || '',
      userName:  currentUser?.name || '',
      before:    existing || null,
      after:     journal,
    })
    addOpLog({
      type:     existing ? 'UPDATE' : 'CREATE',
      userId:   currentUser?.id   || '',
      userName: currentUser?.name || '',
      target:   `journal:${journal.id}`,
      detail:   `仕訳${existing ? '更新' : '登録'}: ${journal.description || journal.id}`,
    })
    saveJournal(journal)
    setPage('list')
    setEditingJournal(null)
  }

  function handleDelete(id) {
    const journal = journals.find(j => j.id === id)
    if (journal) {
      addLog({
        type:      'DELETE',
        journalId: id,
        userId:    currentUser?.id   || '',
        userName:  currentUser?.name || '',
        before:    journal,
        after:     null,
      })
      addOpLog({
        type:     'DELETE',
        userId:   currentUser?.id   || '',
        userName: currentUser?.name || '',
        target:   `journal:${id}`,
        detail:   `仕訳削除: ${journal.description || id}`,
      })
    }
    deleteJournal(id)
  }

  function handleApproveJournal(approvalId, userId, comment) {
    approveJournal(approvalId, userId, comment)
    const apv = approvals.find(a => a.id === approvalId)
    addOpLog({
      type:     'APPROVE',
      userId:   currentUser?.id   || '',
      userName: currentUser?.name || '',
      target:   `approval:${approvalId}`,
      detail:   `承認: 伝票 ${apv?.journalId || approvalId}${comment ? ` / コメント: ${comment}` : ''}`,
    })
  }

  function handleRejectJournal(approvalId, userId, comment) {
    rejectJournal(approvalId, userId, comment)
    const apv = approvals.find(a => a.id === approvalId)
    addOpLog({
      type:     'REJECT',
      userId:   currentUser?.id   || '',
      userName: currentUser?.name || '',
      target:   `approval:${approvalId}`,
      detail:   `却下: 伝票 ${apv?.journalId || approvalId} / コメント: ${comment}`,
    })
  }

  function handleLogin(email, password) {
    const result = login(email, password)
    if (result.ok) {
      const u = users.find(u => u.email?.trim().toLowerCase() === email.trim().toLowerCase())
      addOpLog({
        type:     'LOGIN',
        userId:   u?.id   || '',
        userName: u?.name || '',
        target:   'auth',
        detail:   `ログイン: ${email}`,
      })
    }
    return result
  }

  function handleLogout() {
    if (window.confirm('ログアウトしますか？')) {
      addOpLog({
        type:     'LOGOUT',
        userId:   currentUser?.id   || '',
        userName: currentUser?.name || '',
        target:   'auth',
        detail:   `ログアウト: ${currentUser?.email || ''}`,
      })
      logout()
      setPage('list')
      setEditingJournal(null)
    }
  }

  // 未ログインはログイン画面を表示
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const isMasterPage   = MASTER_IDS.has(page)
  const isApprovalPage = APPROVAL_IDS.has(page)
  const isSoxPage      = SOX_IDS.has(page)
  const isConsoPage    = CONSO_IDS.has(page)
  const visibleMain    = ALL_MAIN_PAGES.filter(p => allowed.has(p.id))

  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <div className="app-header-inner">
          <span className="app-logo" onClick={() => goTo('list')} style={{ cursor: 'pointer' }}>
            会計システム
          </span>

          <nav className="app-nav">
            {visibleMain.map(p => (
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

            {/* J-SOX内部統制（管理者のみ） */}
            {isAdmin && (
              <div className="app-dropdown" ref={soxDropRef}>
                <button
                  className={`app-nav-btn app-nav-btn--dropdown ${isSoxPage || soxOpen ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setSoxOpen(v => !v)}
                >
                  内部統制 <span className="app-dropdown-chevron">{soxOpen ? '▲' : '▼'}</span>
                </button>
                {soxOpen && (
                  <div className="app-dropdown-menu">
                    {SOX_PAGES.map(p => (
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
            )}

            {/* 連結会計（管理者のみ） */}
            {isAdmin && (
              <div className="app-dropdown" ref={consoDropRef}>
                <button
                  className={`app-nav-btn app-nav-btn--dropdown ${isConsoPage || consoOpen ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setConsoOpen(v => !v)}
                >
                  連結会計 <span className="app-dropdown-chevron">{consoOpen ? '▲' : '▼'}</span>
                </button>
                {consoOpen && (
                  <div className="app-dropdown-menu">
                    {CONSO_PAGES.map(p => (
                      <button key={p.id}
                        className={`app-dropdown-item ${page === p.id ? 'app-dropdown-item--active' : ''}`}
                        onClick={() => goTo(p.id)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* マスタ管理（管理者のみ） */}
            {isAdmin && (
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
            )}
          </nav>

          {/* ログインユーザー情報＋ログアウト */}
          <div className="app-user-info">
            <span className={`apv-role apv-role--${role.toLowerCase()} app-user-role`}>
              {ROLE_LABELS[role] || role}
            </span>
            <span className="app-user-name">{currentUser?.name}</span>
            <button className="app-logout-btn" onClick={handleLogout}>ログアウト</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {page === 'list' && (
          <JournalList
            journals={journals}
            onNew={handleNew}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReset={resetToSample}
            accounts={activeAccounts}
            periodCtx={periodCtx}
            approvals={approvals}
            currentUser={currentUser}
            onRequestApproval={requestApproval}
          />
        )}
        {page === 'entry' && (
          <JournalEntry
            initialData={editingJournal}
            onSave={handleSave}
            onCancel={() => setPage('list')}
            accounts={activeAccounts}
            departments={departments}
            auditLogs={editingJournal ? getLogsForJournal(editingJournal.id) : []}
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
        {page === 'invoice' && (
          <InvoiceSummary
            journals={journals}
            periodCtx={periodCtx}
          />
        )}
        {page === 'audithistory' && (
          <AuditHistory logs={auditLogs} />
        )}
        {page === 'approvalinbox' && (
          <ApprovalInbox
            approvals={approvals}
            journals={journals}
            users={users}
            currentUser={currentUser}
            onApprove={handleApproveJournal}
            onReject={handleRejectJournal}
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
        {page === 'company' && (
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
            logOp={logOp}
          />
        )}
        {page === 'deptmaster' && (
          <DepartmentMaster
            departments={departments}
            saveDepartment={saveDepartment}
            deleteDepartment={deleteDepartment}
            logOp={logOp}
          />
        )}
        {page === 'usermgmt' && (
          <UserManagement
            users={users}
            saveUser={saveUser}
            deleteUser={deleteUser}
            currentUser={currentUser}
            logOp={logOp}
          />
        )}
        {page === 'jsoxdash' && (
          <ICSoxDashboard
            approvals={approvals}
            journals={journals}
            opLogs={opLogs}
            onNavigate={goTo}
          />
        )}
        {page === 'oplog' && (
          <OpLog logs={opLogs} users={users} />
        )}
        {page === 'conso-subs' && (
          <SubsidiaryMaster
            subsidiaries={subsidiaries}
            saveSubsidiary={saveSubsidiary}
            deleteSubsidiary={deleteSubsidiary}
          />
        )}
        {page === 'conso-fx' && (
          <FxRates
            fxRates={fxRates}
            saveFxRate={saveFxRate}
            deleteFxRate={deleteFxRate}
          />
        )}
        {page === 'conso-pkg' && (
          <ConsolidationPackage
            subsidiaries={subsidiaries}
            packages={packages}
            savePackage={savePackage}
            deletePackage={deletePackage}
            getPackage={getPackage}
            fxRates={fxRates}
            getFxRate={getFxRate}
            currentUser={currentUser}
          />
        )}
        {page === 'conso-elim' && (
          <Eliminations
            eliminations={eliminations}
            saveElimination={saveElimination}
            deleteElimination={deleteElimination}
            subsidiaries={subsidiaries}
          />
        )}
        {page === 'conso-fs' && (
          <ConsolidatedFS
            journals={journals}
            accounts={activeAccounts}
            subsidiaries={subsidiaries}
            packages={packages}
            eliminations={eliminations}
            periodCtx={periodCtx}
          />
        )}
      </main>

      <footer className="app-footer no-print">
        <span className="app-footer-ebadge">電子帳簿保存法対応</span>
        <span className="app-footer-ebadge app-footer-ebadge--sox">J-SOX内部統制対応</span>
        <span className="app-footer-copy">会計システム &copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
