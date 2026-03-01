'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Project = {
  id: string
  name: string
  description: string | null
  status: string
  start_date: string | null
  due_date: string | null
  loe_budget: number
  created_at: string
  clients: { name: string } | null
}

type Task = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  estimated_hours: number | null
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    on_track:    { label: 'On Track',    color: '#16a34a', bg: '#dcfce7' },
    at_risk:     { label: 'At Risk',     color: '#d97706', bg: '#fef3c7' },
    over_budget: { label: 'Over Budget', color: '#dc2626', bg: '#fee2e2' },
    completed:   { label: 'Completed',   color: '#6b7280', bg: '#f3f4f6' },
  }
  const s = map[status] || map.on_track
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: 12, fontWeight: 600,
      padding: '4px 10px', borderRadius: 20,
    }}>
      {s.label}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ─── ADD TASK MODAL ──────────────────────────────
function AddTaskModal({ projectId, workspaceId, onClose, onCreated }: {
  projectId: string
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const supabase = createClient()
  const [title,          setTitle]          = useState('')
  const [status,         setStatus]         = useState('todo')
  const [priority,       setPriority]       = useState('medium')
  const [dueDate,        setDueDate]        = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [description,    setDescription]    = useState('')
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('tasks').insert({
      project_id:      projectId,
      workspace_id:    workspaceId,
      title,
      status,
      priority,
      due_date:        dueDate || null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      description:     description || null,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    onCreated()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 500,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Add Task</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Add a task to this project</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={labelStyle}>Task Title *</label>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Design homepage mockup"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional details about this task"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Estimated Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={e => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 4"
                  style={inputStyle}
                />
              </div>
            </div>

            {error && (
              <div style={{
                fontSize: 13, color: '#dc2626', background: '#fef2f2',
                border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={ghostBtnStyle}>Cancel</button>
              <button type="submit" disabled={loading} style={primaryBtnStyle}>
                {loading ? 'Adding…' : 'Add Task'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PROJECT DETAIL PAGE ─────────────────────────
export default function ProjectDetailPage() {
  const router    = useRouter()
  const params    = useParams()
  const supabase  = createClient()
  const projectId = params.id as string

  const [project,     setProject]     = useState<Project | null>(null)
  const [tasks,       setTasks]       = useState<Task[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)

  useEffect(() => { loadProject() }, [projectId])

  async function loadProject() {
    setLoading(true)

    const { data: project } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .eq('id', projectId)
      .single()

    if (!project) { router.push('/projects'); return }
    setProject(project)
    setWorkspaceId(project.workspace_id)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    setTasks((tasks as Task[]) || [])
    setLoading(false)
  }

  async function toggleTaskDone(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  if (loading) {
    return (
      <AppLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>Loading…</div>
        </div>
      </AppLayout>
    )
  }

  if (!project) return null

  const clientName = Array.isArray(project.clients)
    ? (project.clients as any[])[0]?.name
    : project.clients?.name

  const totalTasks     = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const progress       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <AppLayout>

      {/* Top bar */}
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => router.push('/projects')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, padding: 0 }}
          >
            Projects
          </button>
          <span style={{ color: '#d1d5db' }}>›</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{project.name}</span>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px' }}>
        <div style={{ maxWidth: 900 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>
              {project.name}
            </h1>
            {clientName && (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                Client: {clientName}
              </div>
            )}
            {project.description && (
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, maxWidth: 600 }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Start Date', value: formatDate(project.start_date) },
              { label: 'Due Date',   value: formatDate(project.due_date) },
              { label: 'LOE Budget', value: project.loe_budget ? `${project.loe_budget}h` : '—' },
              { label: 'Tasks',      value: `${completedTasks}/${totalTasks}` },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'white', borderRadius: 12,
                border: '1px solid #e5e7eb', padding: '16px 20px',
              }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Progress */}
          {totalTasks > 0 && (
            <div style={{
              background: 'white', borderRadius: 12,
              border: '1px solid #e5e7eb', padding: '20px 24px', marginBottom: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>Overall Progress</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#5046e5' }}>{progress}%</span>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`, height: '100%',
                  background: '#5046e5', borderRadius: 99,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}

          {/* Tasks */}
          <div style={{
            background: 'white', borderRadius: 12,
            border: '1px solid #e5e7eb', overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>Tasks</span>
              <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>
                + Add Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>No tasks yet</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
                  Break this project down into manageable tasks
                </div>
                <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>
                  + Add Task
                </button>
              </div>
            ) : (
              <div>
                {tasks.map((task, i) => (
                  <div
                    key={task.id}
                    style={{
                      padding: '14px 24px',
                      borderBottom: i < tasks.length - 1 ? '1px solid #f3f4f6' : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTaskDone(task)}
                      style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: task.status === 'done' ? '2px solid #5046e5' : '2px solid #d1d5db',
                        background: task.status === 'done' ? '#5046e5' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0,
                      }}
                    >
                      {task.status === 'done' && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Title & date */}
                    <div style={{ flex: 1 }}>
                      <div style={{
  fontSize: 13, fontWeight: 500,
  textDecoration: task.status === 'done' ? 'line-through' : 'none',
  color: task.status === 'done' ? '#9ca3af' : '#1a1a2e',
}}>
                        {task.title}
                      </div>
                      {task.due_date && (
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          Due {formatDate(task.due_date)}
                        </div>
                      )}
                    </div>

                    {/* Est. hours */}
                    {task.estimated_hours && (
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        {task.estimated_hours}h
                      </div>
                    )}

                    {/* Priority */}
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: task.priority === 'high' ? '#fee2e2' : task.priority === 'low' ? '#f3f4f6' : '#fef3c7',
                      color: task.priority === 'high' ? '#dc2626' : task.priority === 'low' ? '#6b7280' : '#d97706',
                    }}>
                      {task.priority}
                    </span>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <AddTaskModal
          projectId={projectId}
          workspaceId={workspaceId}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadProject() }}
        />
      )}

    </AppLayout>
  )
}

// ─── STYLES ──────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#374151', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 13, color: '#1a1a2e',
  outline: 'none', boxSizing: 'border-box', background: 'white',
  fontFamily: 'inherit',
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