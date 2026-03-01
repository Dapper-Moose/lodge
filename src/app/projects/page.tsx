'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

// ─── TYPES ───────────────────────────────────────
type Client = { name: string }

type Project = {
  id: string
  name: string
  status: string
  due_date: string | null
  loe_budget: number
  client_id: string | null
  clients: Client | Client[] | null
}

// ─── HELPERS ─────────────────────────────────────
function getClientName(clients: Client | Client[] | null): string | null {
  if (!clients) return null
  if (Array.isArray(clients)) return clients[0]?.name || null
  return clients.name || null
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── STATUS BADGE ────────────────────────────────
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
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ─── CREATE PROJECT MODAL ────────────────────────
function CreateProjectModal({ workspaceId, onClose, onCreated }: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const supabase = createClient()
  const [name,        setName]        = useState('')
  const [status,      setStatus]      = useState('on_track')
  const [startDate,   setStartDate]   = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [loeBudget,   setLoeBudget]   = useState('')
  const [description, setDescription] = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('projects').insert({
      workspace_id: workspaceId,
      name,
      status,
      start_date:  startDate   || null,
      due_date:    dueDate     || null,
      loe_budget:  loeBudget   ? parseFloat(loeBudget) : 0,
      description: description || null,
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
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>New Project</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
              Add a new project to your workspace
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }}
          >✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={labelStyle}>Project Name *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Apex Brand Refresh"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="over_budget">Over Budget</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>LOE Budget (hours)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={loeBudget}
                onChange={e => setLoeBudget(e.target.value)}
                placeholder="e.g. 120"
                style={inputStyle}
              />
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
                {loading ? 'Creating…' : 'Create Project'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PROJECTS PAGE ───────────────────────────────
export default function ProjectsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [projects,    setProjects]    = useState<Project[]>([])
  const [workspaceId, setWorkspaceId] = useState<string>('')
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

    const { data } = await supabase
      .from('projects')
      .select('id, name, status, due_date, loe_budget, client_id, clients(name)')
      .eq('workspace_id', member.workspace_id)
      .order('created_at', { ascending: false })

    setProjects((data as Project[]) || [])
    setLoading(false)
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>

      {/* Top bar */}
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>Projects</span>
        <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>
          + New Project
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 900 }}>

          {/* Search */}
          <div style={{ marginBottom: 20 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              style={{ ...inputStyle, maxWidth: 300 }}
            />
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 13 }}>
              Loading projects…
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div style={{
              background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
              padding: '60px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>◫</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>
                {search ? 'No projects match your search' : 'No projects yet'}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                {search ? 'Try a different search term' : 'Create your first project to get started'}
              </div>
              {!search && (
                <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>
                  + New Project
                </button>
              )}
            </div>
          )}

          {/* Projects list */}
          {!loading && filtered.length > 0 && (
            <div style={{
              background: 'white', borderRadius: 12,
              border: '1px solid #e5e7eb', overflow: 'hidden',
            }}>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 140px 100px 40px',
                padding: '10px 20px', borderBottom: '1px solid #e5e7eb',
                fontSize: 11, fontWeight: 700, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <div>Project</div>
                <div>Status</div>
                <div>Due Date</div>
                <div>LOE</div>
                <div></div>
              </div>

              {/* Project rows */}
              {filtered.map((project, i) => {
                const clientName = getClientName(project.clients)
                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 140px 100px 40px',
                      padding: '16px 20px', cursor: 'pointer',
                      borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                      alignItems: 'center', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', marginBottom: 2 }}>
                        {project.name}
                      </div>
                      {clientName && (
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{clientName}</div>
                      )}
                    </div>
                    <div><StatusBadge status={project.status} /></div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{formatDate(project.due_date)}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {project.loe_budget ? `${project.loe_budget}h` : '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>→</div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <CreateProjectModal
          workspaceId={workspaceId}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadProjects() }}
        />
      )}

    </AppLayout>
  )
}

// ─── SHARED STYLES ───────────────────────────────
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