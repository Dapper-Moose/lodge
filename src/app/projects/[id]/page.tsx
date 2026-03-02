'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Project = {
  id: string
  name: string
  description: string | null
  status: string
  start_date: string | null
  due_date: string | null
  loe_budget: number | null
  client_id: string | null
  clients: { name: string } | { name: string }[] | null
}

type Task = {
  id: string
  title: string
  status: string
  priority: string | null
  due_date: string | null
  estimated_hours: number | null
  notes: string | null
}

type TimeEntry = {
  id: string
  hours: number
  entry_date: string
  description: string | null
  user_id: string
  user_name?: string
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

const dangerBtnStyle: React.CSSProperties = {
  background: 'white', color: '#dc2626', border: '1px solid #fca5a5',
  borderRadius: 8, padding: '8px 16px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer',
}

function getClientName(clients: Project['clients']): string | null {
  if (!clients) return null
  if (Array.isArray(clients)) return clients[0]?.name || null
  return clients.name || null
}

function statusInfo(status: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    on_track:    { label: 'On Track',    bg: '#dcfce7', color: '#16a34a' },
    at_risk:     { label: 'At Risk',     bg: '#fef9c3', color: '#b45309' },
    over_budget: { label: 'Over Budget', bg: '#fee2e2', color: '#dc2626' },
    completed:   { label: 'Completed',   bg: '#f3f4f6', color: '#6b7280' },
  }
  return map[status] || map.on_track
}

function priorityInfo(priority: string | null) {
  const map: Record<string, { label: string; color: string }> = {
    high:   { label: 'High',   color: '#dc2626' },
    medium: { label: 'Medium', color: '#d97706' },
    low:    { label: 'Low',    color: '#6b7280' },
  }
  return map[priority || 'medium'] || map.medium
}

// ─── EDIT PROJECT MODAL ───────────────────────────────────
function EditProjectModal({ project, onClose, onSaved }: {
  project: Project
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [name,       setName]       = useState(project.name)
  const [desc,       setDesc]       = useState(project.description || '')
  const [projStatus, setProjStatus] = useState(project.status)
  const [startDate,  setStartDate]  = useState(project.start_date || '')
  const [dueDate,    setDueDate]    = useState(project.due_date || '')
  const [budget,     setBudget]     = useState(project.loe_budget?.toString() || '')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('projects').update({
      name,
      description: desc      || null,
      status:      projStatus,
      start_date:  startDate || null,
      due_date:    dueDate   || null,
      loe_budget:  budget    ? parseFloat(budget) : null,
    }).eq('id', project.id)
    if (error) { setError(error.message); setLoading(false); return }
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Edit Project</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Update project details</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }}>X</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Project Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={projStatus} onChange={e => setProjStatus(e.target.value)} style={inputStyle}>
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="over_budget">Over Budget</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>LOE Budget (hours)</label>
              <input type="number" min="0" step="0.5" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 100" style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={ghostBtnStyle}>Cancel</button>
              <button type="submit" disabled={loading} style={primaryBtnStyle}>{loading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ADD TASK MODAL ───────────────────────────────────────
function AddTaskModal({ projectId, workspaceId, onClose, onSaved }: {
  projectId: string
  workspaceId: string
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [title,      setTitle]      = useState('')
  const [priority,   setPriority]   = useState('medium')
  const [taskStatus, setTaskStatus] = useState('todo')
  const [dueDate,    setDueDate]    = useState('')
  const [estHours,   setEstHours]   = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('tasks').insert({
      workspace_id:    workspaceId,
      project_id:      projectId,
      title,
      priority,
      status:          taskStatus,
      due_date:        dueDate  || null,
      estimated_hours: estHours ? parseFloat(estHours) : null,
    })
    if (error) { setError(error.message); setLoading(false); return }
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Add Task</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Add a new task to this project</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }}>X</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Task Title *</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Write copy for homepage" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)} style={inputStyle}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Estimated Hours</label>
                <input type="number" min="0" step="0.5" value={estHours} onChange={e => setEstHours(e.target.value)} placeholder="e.g. 4" style={inputStyle} />
              </div>
            </div>
            {error && <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={ghostBtnStyle}>Cancel</button>
              <button type="submit" disabled={loading} style={primaryBtnStyle}>{loading ? 'Saving...' : 'Add Task'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}


// ─── MAIN PAGE ────────────────────────────────────────────
export default function ProjectDetailPage() {
  const supabase  = createClient()
  const params    = useParams()
  const router    = useRouter()
  const projectId = params.id as string

  const [project,      setProject]      = useState<Project | null>(null)
  const [tasks,        setTasks]        = useState<Task[]>([])
  const [timeEntries,  setTimeEntries]  = useState<TimeEntry[]>([])
  const [allEntries,   setAllEntries]   = useState<TimeEntry[]>([])
  const [workspaceId,  setWorkspaceId]  = useState('')
  const [loading,      setLoading]      = useState(true)
  const [showEdit,     setShowEdit]     = useState(false)
  const [showAddTask,  setShowAddTask]  = useState(false)
  const [editingTask,  setEditingTask]  = useState<Task | null>(null)
  const [groupTasks,   setGroupTasks]   = useState(true)
  const [activeTab,    setActiveTab]    = useState<'tasks' | 'timelog'>('tasks')

  useEffect(() => { loadProject() }, [projectId])

  async function loadProject() {
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

    const { data: proj } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .eq('id', projectId)
      .single()

    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, estimated_hours, notes')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    const { data: recentTimeData } = await supabase
      .from('time_entries')
      .select('id, hours, entry_date, description, user_id')
      .eq('project_id', projectId)
      .order('entry_date', { ascending: false })
      .limit(5)

    const { data: allTimeData } = await supabase
      .from('time_entries')
      .select('id, hours, entry_date, description, user_id')
      .eq('project_id', projectId)
      .order('entry_date', { ascending: false })

    const allUserIds = [...new Set((allTimeData || []).map(e => e.user_id))].filter(Boolean)
    const { data: profiles } = allUserIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', allUserIds)
      : { data: [] }

    const enrichEntries = (entries: any[]) => entries.map(e => ({
      ...e,
      user_name: profiles?.find((p: any) => p.id === e.user_id)?.full_name || 'Unknown',
    }))

    setProject(proj as unknown as Project)
    setTasks((taskData as Task[]) || [])
    setTimeEntries(enrichEntries(recentTimeData || []))
    setAllEntries(enrichEntries(allTimeData || []))
    setLoading(false)
  }

  async function toggleTask(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  function renderTask(task: Task, i: number, total: number) {
    const pi = priorityInfo(task.priority)
    const isDone = task.status === 'done'
    const isOverdue = task.due_date && !isDone &&
      new Date(task.due_date + 'T12:00:00') < new Date()

    return (
      <div
        key={task.id}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 20px',
          borderBottom: i < total - 1 ? '1px solid #f3f4f6' : '1px solid #e5e7eb',
          opacity: isDone ? 0.6 : 1,
          cursor: 'pointer',
        }}
        onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}`)}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f9fafb' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'white' }}
      >
        {/* Checkbox — stop propagation so clicking it doesn't open the modal */}
        <div
          onClick={e => { e.stopPropagation(); toggleTask(task) }}
          style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
            border: isDone ? 'none' : '1.5px solid #d1d5db',
            background: isDone ? '#16a34a' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 10, color: 'white',
          }}
        >
          {isDone && '✓'}
        </div>

        {/* Title */}
        <div style={{
          flex: 1, fontSize: 13, fontWeight: 500,
          color: isDone ? '#9ca3af' : '#1a1a2e',
          textDecoration: isDone ? 'line-through' : 'none',
        }}>
          {task.title}
          {task.notes && (
            <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af' }}>· has notes</span>
          )}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {task.due_date && (
            <span style={{
              fontSize: 11,
              color: isOverdue ? '#dc2626' : '#9ca3af',
              fontWeight: isOverdue ? 600 : 400,
            }}>
              {isOverdue ? '⚠ ' : ''}
              {new Date(task.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.estimated_hours && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{task.estimated_hours}h est.</span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 600, color: pi.color,
            background: '#f3f4f6', padding: '2px 7px', borderRadius: 20,
          }}>
            {pi.label}
          </span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
          Loading...
        </div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
          Project not found.
        </div>
      </AppLayout>
    )
  }

  const clientName  = getClientName(project.clients)
  const si          = statusInfo(project.status)
  const doneTasks   = tasks.filter(t => t.status === 'done').length
  const totalTasks  = tasks.length
  const taskPct     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const totalLogged = allEntries.reduce((sum, e) => sum + e.hours, 0)
  const budget      = project.loe_budget || 0
  const budgetPct   = budget > 0 ? Math.min(Math.round((totalLogged / budget) * 100), 100) : 0
  const budgetColor = budgetPct >= 90 ? '#dc2626' : budgetPct >= 70 ? '#d97706' : '#16a34a'

  const taskGroups = [
    { label: 'In Progress', items: tasks.filter(t => t.status === 'in_progress') },
    { label: 'To Do',       items: tasks.filter(t => t.status === 'todo') },
    { label: 'Completed',   items: tasks.filter(t => t.status === 'done') },
  ].filter(g => g.items.length > 0)

  const sortedByDueDate = [...tasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  const entriesByDate: Record<string, TimeEntry[]> = {}
  allEntries.forEach(entry => {
    if (!entriesByDate[entry.entry_date]) entriesByDate[entry.entry_date] = []
    entriesByDate[entry.entry_date].push(entry)
  })
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => b.localeCompare(a))

  return (
    <AppLayout>
      {/* Top bar */}
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span onClick={() => router.push('/projects')} style={{ fontSize: 13, color: '#9ca3af', cursor: 'pointer', fontWeight: 500 }}>
            Projects
          </span>
          <span style={{ color: '#d1d5db' }}>{'>'}</span>
          <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 600 }}>{project.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: si.bg, color: si.color }}>
            {si.label}
          </span>
          <button onClick={() => setShowEdit(true)} style={ghostBtnStyle}>Edit Project</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, maxWidth: 1100, alignItems: 'start' }}>

          {/* LEFT COLUMN */}
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>{project.name}</div>
              {clientName && <div style={{ fontSize: 13, color: '#6b7280' }}>{clientName}</div>}
              {project.description && (
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>{project.description}</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Start Date', value: project.start_date ? new Date(project.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                { label: 'Due Date',   value: project.due_date   ? new Date(project.due_date   + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                { label: 'LOE Budget', value: budget ? `${budget}h` : '—' },
                { label: 'Tasks',      value: `${doneTasks} / ${totalTasks}` },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {totalTasks > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                  <span>Task completion</span>
                  <span>{taskPct}%</span>
                </div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${taskPct}%`, background: '#5046e5', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div style={{
              display: 'flex', gap: 4,
              background: 'white', borderRadius: '12px 12px 0 0',
              border: '1px solid #e5e7eb', borderBottom: 'none',
              padding: '12px 16px 0',
            }}>
              {(['tasks', 'timelog'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: 'none', border: 'none', padding: '6px 14px',
                    borderBottom: activeTab === tab ? '2px solid #5046e5' : '2px solid transparent',
                    color: activeTab === tab ? '#5046e5' : '#6b7280',
                    marginBottom: -1,
                  }}
                >
                  {tab === 'tasks' ? `Tasks (${totalTasks})` : `Time Log (${allEntries.length})`}
                </button>
              ))}
            </div>

            {/* ── TASKS TAB ── */}
            {activeTab === 'tasks' && (
              <div style={{ background: 'white', borderRadius: '0 0 12px 12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{
                  padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#6b7280' }}>
                    {doneTasks} of {totalTasks} complete
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => setGroupTasks(g => !g)}
                      style={{
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: groupTasks ? '#ede9fe' : '#f3f4f6',
                        color: groupTasks ? '#5046e5' : '#6b7280',
                        border: 'none', borderRadius: 6, padding: '5px 10px',
                      }}
                    >
                      {groupTasks ? 'Grouped' : 'By Due Date'}
                    </button>
                    <button onClick={() => setShowAddTask(true)} style={primaryBtnStyle}>+ Add Task</button>
                  </div>
                </div>

                {tasks.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                    No tasks yet. Add your first task to get started.
                  </div>
                )}

                {groupTasks && taskGroups.map(group => (
                  <div key={group.label}>
                    <div style={{
                      padding: '8px 20px', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: '#9ca3af', background: '#f9fafb',
                      borderBottom: '1px solid #f3f4f6',
                    }}>
                      {group.label} — {group.items.length}
                    </div>
                    {group.items.map((task, i) => renderTask(task, i, group.items.length))}
                  </div>
                ))}

                {!groupTasks && sortedByDueDate.map((task, i) => renderTask(task, i, sortedByDueDate.length))}
              </div>
            )}

            {/* ── TIME LOG TAB ── */}
            {activeTab === 'timelog' && (
              <div style={{ background: 'white', borderRadius: '0 0 12px 12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{
                  padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
                  display: 'flex', alignItems: 'center', gap: 24,
                }}>
                  {[
                    { label: 'Total Logged', value: `${totalLogged.toFixed(1)}h`, color: budgetColor },
                    ...(budget > 0 ? [
                      { label: 'Budget',    value: `${budget}h`,                         color: '#1a1a2e' },
                      { label: 'Remaining', value: `${(budget - totalLogged).toFixed(1)}h`, color: (budget - totalLogged) < 0 ? '#dc2626' : '#1a1a2e' },
                    ] : []),
                    { label: 'Entries', value: `${allEntries.length}`, color: '#1a1a2e' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {allEntries.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                    No time logged yet on this project.
                  </div>
                )}

                {sortedDates.map(dateKey => {
                  const dayEntries = entriesByDate[dateKey]
                  const dayTotal   = dayEntries.reduce((sum, e) => sum + e.hours, 0)
                  const displayDate = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  })
                  return (
                    <div key={dateKey}>
                      <div style={{
                        padding: '8px 20px', fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: '#9ca3af', background: '#f9fafb',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span>{displayDate}</span>
                        <span style={{ color: '#5046e5' }}>{dayTotal.toFixed(1)}h</span>
                      </div>
                      {dayEntries.map((entry, i) => {
                        const initials = (entry.user_name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                        const colors = ['#5046e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']
                        const avatarColor = colors[(entry.user_name || '').charCodeAt(0) % colors.length]
                        return (
                          <div key={entry.id} style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '12px 20px',
                            borderBottom: i < dayEntries.length - 1 ? '1px solid #f9fafb' : '1px solid #e5e7eb',
                          }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: avatarColor, color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, flexShrink: 0,
                            }}>
                              {initials}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{entry.user_name || 'Unknown'}</div>
                              {entry.description && (
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{entry.description}</div>
                              )}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#5046e5', flexShrink: 0 }}>
                              {entry.hours}h
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 14 }}>
                Hours Budget
              </div>
              {budget > 0 ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: budgetColor }}>{totalLogged.toFixed(1)}h</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>of {budget}h</span>
                  </div>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${budgetPct}%`, background: budgetColor, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
                    <span style={{ color: budgetColor, fontWeight: 600 }}>{budgetPct}% used</span>
                    <span>{(budget - totalLogged).toFixed(1)}h remaining</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>No budget set. Edit the project to add an LOE budget.</div>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>Recent Time</span>
                {allEntries.length > 5 && (
                  <button onClick={() => setActiveTab('timelog')} style={{ fontSize: 11, color: '#5046e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    View all
                  </button>
                )}
              </div>
              {timeEntries.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>No time logged yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {timeEntries.map(entry => (
                    <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#1a1a2e', fontWeight: 500 }}>
                          {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        {entry.description && (
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, lineHeight: 1.4 }}>{entry.description}</div>
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#5046e5', marginLeft: 8, flexShrink: 0 }}>{entry.hours}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 14 }}>
                Project Info
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Client', value: clientName || '—', color: '#1a1a2e' },
                  { label: 'Status', value: si.label,          color: si.color },
                  { label: 'Start',  value: project.start_date ? new Date(project.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', color: '#1a1a2e' },
                  { label: 'Due',    value: project.due_date   ? new Date(project.due_date   + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', color: '#1a1a2e' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); loadProject() }}
        />
      )}

      {showAddTask && (
        <AddTaskModal
          projectId={projectId}
          workspaceId={workspaceId}
          onClose={() => setShowAddTask(false)}
          onSaved={() => { setShowAddTask(false); loadProject() }}
        />
      )}

      
    </AppLayout>
  )
}
