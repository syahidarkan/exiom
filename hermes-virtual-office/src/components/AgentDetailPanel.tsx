'use client'

import { useOffice } from '@/lib/store'

const STATUS_COLOR: Record<string, string> = {
  working: '#4ec94e',
  review:  '#e8a555',
  blocked: '#e85555',
  meeting: '#9d86e8',
  done:    '#4ec9a0',
  idle:    '#3a3b48',
}

const DIV_COLOR: Record<string, string> = {
  exec:    '#e8a555',
  tech:    '#5b9fe8',
  growth:  '#9d6de8',
  content: '#4ec9a0',
}

export default function AgentDetailPanel() {
  const agents  = useOffice((s) => s.agents)
  const tasks   = useOffice((s) => s.tasks)
  const selected = useOffice((s) => s.selectedAgent)
  const select  = useOffice((s) => s.select)

  const agent = agents.find((a) => a.name === selected)
  const currentTask = agent?.currentTaskId
    ? tasks.find((t) => t.id === agent.currentTaskId)
    : null
  const recentTasks = agent
    ? tasks.filter((t) => t.assignee === agent.name).slice(0, 6)
    : []

  return (
    <aside className="px-side left" aria-label="Agent detail">
      {!agent ? (
        <>
          <div className="px-sh">
            <span className="px-sh-title">AGENTS</span>
            <span className="px-sh-count">{agents.length}</span>
          </div>
          <div className="px-scroll">
            {agents.map((a) => {
              const t = a.currentTaskId ? tasks.find((x) => x.id === a.currentTaskId) : null
              return (
                <button key={a.name} className="px-agent-row" onClick={() => select(a.name)}>
                  <div className="px-ar-top">
                    <span className="px-dot-sm" style={{ background: STATUS_COLOR[a.status] ?? '#3a3b48' }} />
                    <span className="px-ar-name">{a.displayName}</span>
                    <span className="px-ar-role">{a.role}</span>
                  </div>
                  {t && <div className="px-ar-task">{t.title}</div>}
                </button>
              )
            })}
            {!agents.length && <div className="px-empty">loading agents…</div>}
          </div>
        </>
      ) : (
        <>
          <div className="px-sh">
            <button className="px-back" onClick={() => select(null)}>←</button>
            <span className="px-sh-title">{agent.displayName.toUpperCase()}</span>
          </div>
          <div className="px-scroll">
            <div className="px-detail-badges">
              <span className="px-dot-sm" style={{ background: STATUS_COLOR[agent.status] ?? '#3a3b48' }} />
              <span className="px-badge">{agent.role}</span>
              {agent.division && (
                <span className="px-badge" style={{ borderColor: DIV_COLOR[agent.division], color: DIV_COLOR[agent.division] }}>
                  {agent.division}
                </span>
              )}
            </div>

            {agent.model && (
              <div className="px-kv">
                <span>MODEL</span>
                <b>{agent.model}</b>
              </div>
            )}
            <div className="px-kv">
              <span>STATUS</span>
              <b style={{ color: STATUS_COLOR[agent.status] }}>{agent.status.toUpperCase()}</b>
            </div>

            <div className="px-sect">TASK</div>
            {currentTask ? (
              <div className="px-task-card">
                <div className="px-tc-title">{currentTask.title}</div>
                <span className="px-tc-badge" data-status={currentTask.status}>
                  {currentTask.status}
                </span>
              </div>
            ) : (
              <div className="px-empty">idle — no active task</div>
            )}

            {recentTasks.length > 0 && (
              <>
                <div className="px-sect">RECENT</div>
                {recentTasks.map((t) => (
                  <div key={t.id} className="px-recent-row">
                    <span className="px-recent-dot" data-status={t.status} />
                    <span className="px-recent-title">{t.title}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
