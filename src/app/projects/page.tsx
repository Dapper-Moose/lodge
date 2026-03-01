'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'
import { useRouter } from 'next/navigation'

type Client = { name: string }
type Project = {
  id: string
  name: string
  description: string | null
  status: string
  start_date: string | null
  due_date: string | null
  loe_budget: number | null
  client_id: string | null
  clients: Client | Client[] | null
  task_count?: number
  done_count?: number
  hours_logged?: number
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

function getClientName(clients: Project['clients']): string | null {
  if (!clients) return null
  if (Array.isArray(clients)) return clients[0]?.name || null
  return clients.name || null
}

function statusInfo(status: string) {
  const map: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    on_track:    { label: 'On Track',    bg: '#dcfce7', color: '#16a34a', dot: '#16a34a' },
    at_risk:     { label: 'At Risk',     bg: '#fef9c3', color: '#b45309', dot: '#d97706' },
    over_budget: { label: 'Over Budget', bg: '#fee2e2', color: '#dc2626', dot: '#dc2626' },
    completed:   { label: 'Completed',   bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
  }
  return map[status] || map.on_track
}

function CreateProjectModal({ workspaceId, clients, onClose, onSaved }: {
  workspaceId: string
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [name,      setName]      = useState('')
  const [desc,      setDesc]      = useState('')
  const [status,    setStatus]    = useState('on_track')
  const [clientId,  setClientId]  = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate,   setDueDate]   = useState('')
  const [budget,    setBudget]    = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('projects').insert({
      workspace_id: workspaceId,
      name,
      description:  desc      || null,
      status,
      client_id:    clientId  || null,
      start_date:   startDate || null,
      due_date:     dueDate   || null,
      loe_budget:   budget    ? parseFloat(budget) : null,
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
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 500,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>New Project</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Create a new project in your workspace</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }}>X</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Project Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Brand Refresh" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="What is this project about?" style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                  <option value="on_track">On Track</option>
                  <option value="at_risk">At Risk</option>
                  <option value="over_budget">Over Budget</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Client</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} style={inputStyle}>
                  <option value="">No client</option>
                  {(clients as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
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
            {error && (
              <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={ghostBtnStyle}>Cancel</button>
              <button type="submit" disabled={loading} style={primaryBtnStyle}>{loading ? 'Creating...' : 'Create Project'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const si          = statusInfo(project.status)
  const clientName  = getClientName(project.clients)
  const budget      = project.loe_budget || 0
  const logged      = project.hours_logged || 0
  const budgetPct   = budget > 0 ? Math.min(Math.round((logged / budget) * 100), 100) : 0
  const budgetColor = budgetPct >= 90 ? '#dc2626' : budgetPct >= 70 ? '#d97706' : '#5046e5'
  const totalTasks  = project.task_count || 0
  const doneTasks   = project.done_count || 0
  const taskPct     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const colors = ['#5046e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  const color  = colors[project.name.charCodeAt(0) % colors.length]

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: 14, border: '1px solid #e5e7eb',
        padding: 20, cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      }}
    >
      {/* Card top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: color + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {project.name.charAt(0)}
        </div>
        <span style={{ ...si, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>
          {si.label}
        </span>
      </div>

      {/* Name + client */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{project.name}</div>
        {clientName && <div style={{ fontSize: 12, color: '#9ca3af' }}>{clientName}</div>}
        {project.description && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
          }}>
            {project.description}
          </div>
        )}
      </div>

      {/* LOE progress */}
      {budget > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 4, fontFamily: 'monospace' }}>
            <span>LOE Budget</span>
            <span style={{ color: budgetColor, fontWeight: 600 }}>{logged}h / {budget}h</span>
          </div>
          <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${budgetPct}%`, background: budgetColor, borderRadius: 3 }} />
          </div>
        </div>
      )}

      {/* Footer meta */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {project.due_date && (
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Due</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
              {new Date(project.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        )}
        {totalTasks > 0 && (
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Tasks</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{doneTasks} / {totalTasks}</div>
          </div>
        )}
        {budget > 0 && (
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Budget</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{budget}h</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [projects,    setProjects]    = useState<Project[]>([])
  const [allClients,  setAllClients]  = useState<any[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [search,      setSearch]      = useState('')

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
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

    const { data: projectData } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .eq('workspace_id', member.workspace_id)
      .order('created_at', { ascending: false })

    const { data: clientData } = await supabase
      .from('clients')
      .select('id, name')
      .eq('workspace_id', member.workspace_id)
      .order('name')

    if (!projectData) { setLoading(false); return }

    // Load task counts and hours per project
    const projectIds = projectData.map(p => p.id)

    const { data: tasks } = projectIds.length > 0
      ? await supabase.from('tasks').select('id, project_id, status').in('project_id', projectIds)
      : { data: [] }

    const { data: timeEntries } = projectIds.length > 0
      ? await supabase.from('time_entries').select('project_id, hours').in('project_id', projectIds)
      : { data: [] }

    const enriched = projectData.map(p => ({
      ...p,
      task_count:   (tasks || []).filter(t => t.project_id === p.id).length,
      done_count:   (tasks || []).filter(t => t.project_id === p.id && t.status === 'done').length,
      hours_logged: (timeEntries || []).filter(t => t.project_id === p.id).reduce((sum, t) => sum + t.hours, 0),
    }))

    setProjects(enriched as unknown as Project[])
    setAllClients(clientData || [])
    setLoading(false)
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (getClientName(p.clients) || '').toLowerCase().includes(search.toLowerCase())
  )

  const activeProjects    = filtered.filter(p => p.status !== 'completed')
  const completedProjects = filtered.filter(p => p.status === 'completed')

  return (
    <AppLayout>
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>Projects</span>
        <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>+ New Project</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{ ...inputStyle, maxWidth: 300 }}
          />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 13 }}>Loading projects...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{
            background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
            padding: '60px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>
              {search ? 'No projects match your search' : 'No projects yet'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              {search ? 'Try a different search term' : 'Create your first project to get started'}
            </div>
            {!search && (
              <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>+ New Project</button>
            )}
          </div>
        )}

        {!loading && activeProjects.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 14 }}>
              Active — {activeProjects.length}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {activeProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => router.push(`/projects/${project.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && completedProjects.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 14 }}>
              Completed — {completedProjects.length}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {completedProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => router.push(`/projects/${project.id}`)}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {showModal && (
        <CreateProjectModal
          workspaceId={workspaceId}
          clients={allClients}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadProjects() }}
        />
      )}
    </AppLayout>
  )
}