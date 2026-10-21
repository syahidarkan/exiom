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

export default function OfficeMeterPanel({
  onOpenChat,
  onOpenApproval,
  onOpenMeeting,
}: {
  onOpenChat: () => void
  onOpenApproval: () => void
  onOpenMeeting: () => void
}) {
  const agents = useOffice((s) => s.agents)
  const tasks  = useOffice((s) => s.tasks)
  const error  = useOffice((s) => s.error)
  const select = useOffice((s) => s.select)

  const live    = tasks.filter((t) => t.status !== 'archived')
  const running = live.filter((t) => t.status === 'running').length
  const review  = live.filter((t) => t.status === 'review').length
  const done    = live.filter((t) => t.status === 'done').length
  const pct     = live.length ? Math.round((done / live.length) * 100) : 0

  const active = agents.filter((a) => a.status === 'working' || a.status === 'meeting').length

  return (
    <aside className="px-side right" aria-label="Office meters">
      <div className="px-sh">
        <span className="px-sh-title">OFFICE METERS</span>
        <span className="px-dot-sm" style={{ background: error ? '#e85555' : '#4ec94e', boxShadow: `0 0 6px ${error ? '#e85555' : '#4ec94e'}` }} />
      </div>
      <div className="px-scroll">
        {/* Metric grid */}
        <div className="px-meters">
          <div className="px-meter-cell">
            <div className="px-mv" style={{ color: '#4ec94e' }}>{active}</div>
            <div className="px-ml">ACTIVE</div>
          </div>
          <div className="px-meter-cell">
            <div className="px-mv" style={{ color: '#e8a555' }}>{running}</div>
            <div className="px-ml">RUNNING</div>
          </div>
          <div className="px-meter-cell">
            <div className="px-mv" style={{ color: '#5b9fe8' }}>{review}</div>
            <div className="px-ml">REVIEW</div>
          </div>
          <div className="px-meter-cell">
            <div className="px-mv">{pct}%</div>
            <div className="px-ml">RELEASE</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-bar-wrap">
          <div className="px-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="px-bar-label">{done} / {live.length} tasks complete</div>

        {/* Per-agent table */}
        <div className="px-sect">AGENTS</div>
        {agents.map((a) => {
          const task = a.currentTaskId ? tasks.find((t) => t.id === a.currentTaskId) : null
          return (
            <button key={a.name} className="px-ameter-row" onClick={() => select(a.name)}>
              <span className="px-dot-sm" style={{ background: STATUS_COLOR[a.status] ?? '#3a3b48' }} />
              <span className="px-am-name">{a.displayName}</span>
              {a.model && <span className="px-am-model">{a.model.split('-').slice(-2).join('-')}</span>}
              {task && <span className="px-am-task">{task.title.slice(0, 18)}{task.title.length > 18 ? '…' : ''}</span>}
            </button>
          )
        })}
        {!agents.length && <div className="px-empty">no agents loaded</div>}

        {/* Quick action buttons */}
        <div className="px-sect">ACTIONS</div>
        <div className="px-qactions">
          <button className="px-qbtn" onClick={onOpenChat}># chat</button>
          <button className="px-qbtn" onClick={onOpenApproval}>✓ approve</button>
          <button className="px-qbtn" onClick={onOpenMeeting}>⊞ meeting</button>
        </div>
      </div>
    </aside>
  )
}
