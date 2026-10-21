'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import AgentDetailPanel from './AgentDetailPanel'
import OfficeActivityPanel from './OfficeActivityPanel'
import TaskPanel from './TaskPanel'
import PeekPanel from './PeekPanel'
import MeetingPanel from './MeetingPanel'
import AgentSpawnPanel from './AgentSpawnPanel'
import CronPanel from './CronPanel'
import SystemPanel from './SystemPanel'
import BoardPanel from './BoardPanel'
import ChatPanel from './ChatPanel'
import ExiomApprovalPanel from './ExiomApprovalPanel'
import FullPanel from './FullPanel'
import SendPromptPanel from './SendPromptPanel'
import NewTaskDialog from './NewTaskDialog'
import KanbanModal from './KanbanModal'
import OfficeNameDialog from './OfficeNameDialog'
import { startPolling, useOffice } from '@/lib/store'

const VirtualOfficeGame = dynamic(() => import('./VirtualOfficeGame'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', color: '#3a3b48', fontFamily: 'ui-monospace,monospace', fontSize: 13 }}>
      loading office…
    </div>
  ),
})


export default function PixelDashboard() {
  const tasks         = useOffice((s) => s.tasks)
  const agents        = useOffice((s) => s.agents)
  const error         = useOffice((s) => s.error)
  const meeting       = useOffice((s) => s.meeting)
  const loadTasks     = useOffice((s) => s.load)
  const setNewTaskOpen = useOffice((s) => s.setNewTaskOpen)

  const [meetOpen,     setMeetOpen]     = useState(false)
  const [agentOpen,    setAgentOpen]    = useState(false)
  const [cronOpen,     setCronOpen]     = useState(false)
  const [systemOpen,   setSystemOpen]   = useState(false)
  const [panelOpen,    setPanelOpen]    = useState(false)
  const [chatOpen,     setChatOpen]     = useState(false)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [sendOpen,     setSendOpen]     = useState(false)
  const [boardOpen,    setBoardOpen]    = useState(false)
  const [nameOpen,     setNameOpen]     = useState(false)
  // gameOpen removed — VirtualOfficeGame is now the permanent center view

  useEffect(() => startPolling(), [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (e.key === 'm' || e.key === 'M') setMeetOpen((v) => !v)
      if (e.key === 'n' || e.key === 'N') setNewTaskOpen(true)
      if (e.key === 'c' || e.key === 'C') setChatOpen((v) => !v)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [setNewTaskOpen])

  const live    = tasks.filter((t) => t.status !== 'archived')
  const running = live.filter((t) => t.status === 'running').length
  const done    = live.filter((t) => t.status === 'done').length
  const pct     = live.length ? Math.round((done / live.length) * 100) : 0

  return (
    <div className="px-root">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="px-topbar">
        <div className="px-tb-brand">
          <span className="px-logo">EXIOM</span>
          <span className="px-tb-sep">—</span>
          <span className="px-tb-sub">AGENT OFFICE</span>
        </div>

        <div className="px-tb-status">
          <span className="px-dot-sm" style={{
            background: error ? '#e85555' : '#4ec94e',
            boxShadow: `0 0 5px ${error ? '#e85555' : '#4ec94e'}`,
          }} />
          <span>{agents.length} agent</span>
          <span className="px-tb-sep">·</span>
          <span>{running} running</span>
          <span className="px-tb-sep">·</span>
          <span>{pct}% release</span>
        </div>

        <nav className="px-tb-nav">
          <button className="px-nb" onClick={() => setNewTaskOpen(true)}>+ TASK</button>
          <button className="px-nb" onClick={() => setMeetOpen(true)}>
            MEETING{meeting?.state === 'running' ? ' ●' : ''}
          </button>
          <button className="px-nb" onClick={() => setAgentOpen(true)}>AGENTS</button>
          <button className="px-nb" onClick={() => setCronOpen(true)}>CRON</button>
          <button className="px-nb" onClick={() => setPanelOpen(true)}>BOARD</button>
          <button className="px-nb" onClick={() => setApprovalOpen(true)}>APPROVE</button>
          <button className="px-nb" onClick={() => setSendOpen(true)}>SEND</button>
          <button className="px-nb" onClick={() => setChatOpen(true)}>CHAT</button>
          <button className="px-nb" onClick={() => setSystemOpen(true)}>SYS</button>
        </nav>
      </header>

      {/* ── 3-panel body ────────────────────────────────────── */}
      <div className="px-body">

        {/* Left: agent list / detail */}
        <AgentDetailPanel />

        {/* Center: virtual office map */}
        <main className="px-center" style={{ position: 'relative', overflow: 'hidden' }}>
          <VirtualOfficeGame onKanbanOpen={() => setBoardOpen(true)} />
          <button className="px-rename-btn" onClick={() => setNameOpen(true)}>✎ rename</button>
        </main>

        {/* Right: live chat panel */}
        <OfficeActivityPanel />
      </div>

      {/* ── Overlay panels ──────────────────────────────────── */}
      <TaskPanel />
      <PeekPanel />
      <MeetingPanel open={meetOpen} onClose={() => setMeetOpen(false)} />
      <AgentSpawnPanel
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        onChanged={() => void loadTasks()}
      />
      <CronPanel open={cronOpen} onClose={() => setCronOpen(false)} />
      <BoardPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      <SystemPanel open={systemOpen} onClose={() => setSystemOpen(false)} />
      <ExiomApprovalPanel open={approvalOpen} onClose={() => setApprovalOpen(false)} />
      {sendOpen && (
        <FullPanel onClose={() => setSendOpen(false)} label="kirim prompt" title="Kirim Prompt ke Agent">
          <SendPromptPanel />
        </FullPanel>
      )}
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onAgentCreated={() => void loadTasks()}
      />
      <NewTaskDialog />
      {boardOpen && <KanbanModal onClose={() => setBoardOpen(false)} />}
      {nameOpen  && <OfficeNameDialog onClose={() => setNameOpen(false)} />}

      {error && <div className="vp-banner" role="alert">{error}</div>}

    </div>
  )
}
