'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type TimeEntry = {
  id: string
  hours: number
  entry_date: string
  description: string | null
  project_id: string
  task_id: string | null
  projects: { name: string } | null
  tasks: { title: string } | null
}

type Project = {
  id: string
  name: string
}

const primaryBtnStyle: React.CSSProperties = {
  background: '#5046e5', color: 'white', border: 'none',
  borderRadius: 8, padding: '8px 16px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer',
}

const ghostBtnStyle: React.CSSProperties = {
  background: 'white', color: '#374151', border: '1px solid #d1d5db',
  borderRadius: 8, padding: '8px 16px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 13, color: '#1a1a2e',
  outline: 'none', boxSizing: 'border-box', background: 'white',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#374151', marginBottom: 6,
}

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function LogTimeModal({ workspaceId, projects, initialProjectId, initialHours, onClose, onSaved }: {
  workspaceId: string
  projects: Project[]
  initialProjectId?: string
  initialHours?: number
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [projectId,   setProjectId]   = useState(initialProjectId || '')
  const [hours,       setHours]       = useState(initialHours ? initialHours.toFixed(2) : '')
  const [entryDate,   setEntryDate]   = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [tasks,       setTasks]       = useState<{id: string, title: string}[]>([])
  const [taskId,      setTaskId]      = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    if (!projectId) { setTasks([]); setTaskId(''); return }
    loadTasks(projectId)
  }, [projectId])

  async function loadTasks(pid: string) {
    const { data } = await supabase.from('tasks').select('id, title').eq('project_id', pid).neq('status', 'done').order('title')
    setTasks(data || [])
    setTaskId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('time_entries').insert({
      workspace_id: workspaceId,
      project_id:   projectId,
      task_id:      taskId || null,
      user_id:      user.id,
      hours:        parseFloat(hours),
      entry_date:   entryDate,
      description:  description || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    onSaved()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20,
    }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Log Time</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Record hours worked on a project</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }}>X</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Project *</label>
              <select required value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
                <option value="">Select a project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {tasks.length > 0 && (
              <div>
                <label style={labelStyle}>Task (optional)</label>
                <select value={taskId} onChange={e => setTaskId(e.target.value)} style={inputStyle}>
                  <option value="">No specific task</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Hours *</label>
                <input required type="number" min="0.25" max="24" step="0.25" value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 2.5" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date *</label>
                <input required type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What did you work on?" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            {error && (
              <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={ghostBtnStyle}>Cancel</button>
              <button type="submit" disabled={loading || !projectId || !hours} style={primaryBtnStyle}>{loading ? 'Saving...' : 'Log Time'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TimePage() {
  const supabase = createClient()

  const [entries,       setEntries]       = useState<TimeEntry[]>([])
  const [projects,      setProjects]      = useState<Project[]>([])
  const [workspaceId,   setWorkspaceId]   = useState('')
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [weekOffset,    setWeekOffset]    = useState(0)

  // Timer state
  const [timerRunning,   setTimerRunning]   = useState(false)
  const [timerSeconds,   setTimerSeconds]   = useState(0)
  const [timerProjectId, setTimerProjectId] = useState('')
  const [timerDesc,      setTimerDesc]      = useState('')
  const [timerSaving,    setTimerSaving]    = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<Date | null>(null)

  // Log modal pre-filled from timer
  const [timerModalHours,     setTimerModalHours]     = useState<number | undefined>()
  const [timerModalProjectId, setTimerModalProjectId] = useState<string | undefined>()

  useEffect(() => { loadData() }, [weekOffset])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function startTimer() {
    if (!timerProjectId) return
    startTimeRef.current = new Date()
    setTimerSeconds(0)
    setTimerRunning(true)
    intervalRef.current = setInterval(() => {
      setTimerSeconds(s => s + 1)
    }, 1000)
  }

  function stopTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimerRunning(false)

    const elapsed = timerSeconds
    if (elapsed < 60) {
      setTimerSeconds(0)
      return
    }

    const hours = parseFloat((elapsed / 3600).toFixed(2))
    setTimerModalHours(hours)
    setTimerModalProjectId(timerProjectId)
    setTimerSeconds(0)
    setShowModal(true)
  }

  function cancelTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimerRunning(false)
    setTimerSeconds(0)
  }

  function getWeekRange(offset: number) {
    const now = new Date()
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day + (offset * 7))
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  async function loadData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!member) return
    setWorkspaceId(member.workspace_id)

    const { start, end } = getWeekRange(weekOffset)

    const { data: entriesRaw } = await supabase
      .from('time_entries')
      .select('id, hours, entry_date, description, project_id, task_id')
      .eq('workspace_id', member.workspace_id)
      .eq('user_id', user.id)
      .gte('entry_date', start.toISOString().split('T')[0])
      .lte('entry_date', end.toISOString().split('T')[0])
      .order('entry_date', { ascending: false })

    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', member.workspace_id)
      .order('name')

    const projectIds = [...new Set((entriesRaw || []).map(e => e.project_id))]
    const taskIds    = (entriesRaw || []).filter(e => e.task_id).map(e => e.task_id!)

    const { data: projectNames } = projectIds.length > 0
      ? await supabase.from('projects').select('id, name').in('id', projectIds)
      : { data: [] }

    const { data: taskNames } = taskIds.length > 0
      ? await supabase.from('tasks').select('id, title').in('id', taskIds)
      : { data: [] }

    const combined = (entriesRaw || []).map(e => ({
      ...e,
      projects: projectNames?.find(p => p.id === e.project_id) || null,
      tasks:    taskNames?.find(t => t.id === e.task_id)       || null,
    }))

    setEntries(combined as unknown as TimeEntry[])
    setProjects((projectsData as Project[]) || [])
    setLoading(false)
  }

  const { start, end } = getWeekRange(weekOffset)
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)

  function formatWeekRange() {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const timerProject = projects.find(p => p.id === timerProjectId)

  return (
    <AppLayout>
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>Time Tracking</span>
        <button onClick={() => { setTimerModalHours(undefined); setTimerModalProjectId(undefined); setShowModal(true) }} style={primaryBtnStyle}>
          + Log Time
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 800 }}>

          {/* ── TIMER CARD ── */}
          <div style={{
            background: timerRunning ? '#1a1a2e' : 'white',
            borderRadius: 16, border: '1px solid #e5e7eb',
            padding: '24px 28px', marginBottom: 24,
            transition: 'background 0.3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>

              {/* Left: project picker + description */}
              <div style={{ flex: 1, minWidth: 200 }}>
                {timerRunning ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 4 }}>
                      Tracking time on
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
                      {timerProject?.name || 'Unknown Project'}
                    </div>
                    {timerDesc && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{timerDesc}</div>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Project</label>
                      <select
                        value={timerProjectId}
                        onChange={e => setTimerProjectId(e.target.value)}
                        style={{ ...inputStyle, maxWidth: 280 }}
                      >
                        <option value="">Select a project...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>What are you working on? (optional)</label>
                      <input
                        value={timerDesc}
                        onChange={e => setTimerDesc(e.target.value)}
                        placeholder="e.g. Writing homepage copy"
                        style={{ ...inputStyle, maxWidth: 280 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Center: timer display */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 42, fontWeight: 500,
                  letterSpacing: '-2px',
                  color: timerRunning ? 'white' : '#1a1a2e',
                  marginBottom: 12,
                }}>
                  {formatSeconds(timerSeconds)}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {!timerRunning ? (
                    <button
                      onClick={startTimer}
                      disabled={!timerProjectId}
                      style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: timerProjectId ? '#5046e5' : '#e5e7eb',
                        border: 'none', cursor: timerProjectId ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: 'white',
                        boxShadow: timerProjectId ? '0 2px 8px rgba(80,70,229,0.35)' : 'none',
                      }}
                    >
                      ▶
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={stopTimer}
                        style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: '#16a34a', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, color: 'white',
                          boxShadow: '0 2px 8px rgba(22,163,74,0.35)',
                        }}
                      >
                        ■
                      </button>
                      <button
                        onClick={cancelTimer}
                        style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, color: 'white',
                        }}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ── WEEK NAVIGATOR ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setWeekOffset(w => w - 1)} style={{ ...ghostBtnStyle, padding: '6px 12px' }}>
                &lt;
              </button>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{formatWeekRange()}</span>
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                disabled={weekOffset >= 0}
                style={{ ...ghostBtnStyle, padding: '6px 12px', opacity: weekOffset >= 0 ? 0.4 : 1 }}
              >
                &gt;
              </button>
            </div>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} style={{ fontSize: 12, color: '#5046e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Back to this week
              </button>
            )}
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Hours', value: `${totalHours.toFixed(1)}h` },
              { label: 'Entries',     value: `${entries.length}` },
              { label: 'Projects',    value: `${new Set(entries.map(e => e.project_id)).size}` },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ── ENTRIES ── */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>
              Time Entries
            </div>

            {loading && (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</div>
            )}

            {!loading && entries.length === 0 && (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>No time logged this week</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Use the timer above or log time manually</div>
                <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>+ Log Time</button>
              </div>
            )}

            {!loading && entries.length > 0 && entries.map((entry, i) => (
              <div key={entry.id} style={{
                padding: '16px 24px',
                borderBottom: i < entries.length - 1 ? '1px solid #f3f4f6' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>
                      {entry.projects?.name || 'Unknown Project'}
                    </span>
                    {entry.tasks && (
                      <>
                        <span style={{ color: '#d1d5db' }}>·</span>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{(entry.tasks as any).title}</span>
                      </>
                    )}
                  </div>
                  {entry.description && <div style={{ fontSize: 12, color: '#9ca3af' }}>{entry.description}</div>}
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{formatDate(entry.entry_date)}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#5046e5', marginLeft: 16, whiteSpace: 'nowrap' }}>
                  {entry.hours}h
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {showModal && (
        <LogTimeModal
          workspaceId={workspaceId}
          projects={projects}
          initialProjectId={timerModalProjectId}
          initialHours={timerModalHours}
          onClose={() => { setShowModal(false); setTimerModalHours(undefined); setTimerModalProjectId(undefined) }}
          onSaved={() => { setShowModal(false); setTimerModalHours(undefined); setTimerModalProjectId(undefined); setTimerDesc(''); loadData() }}
        />
      )}
    </AppLayout>
  )
}