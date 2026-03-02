'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Client = {
  id: string
  name: string
  industry: string | null
  website: string | null
  location: string | null
  notes: string | null
  contact_name: string | null
  contact_title: string | null
  contact_email: string | null
  contact_phone: string | null
  contact2_name: string | null
  contact2_title: string | null
  contact2_email: string | null
  created_at: string
}

type Project = {
  id: string
  name: string
  status: string
  due_date: string | null
  loe_budget: number | null
  hours_logged: number
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

function statusInfo(status: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    on_track:    { label: 'On Track',    bg: '#dcfce7', color: '#16a34a' },
    at_risk:     { label: 'At Risk',     bg: '#fef9c3', color: '#b45309' },
    over_budget: { label: 'Over Budget', bg: '#fee2e2', color: '#dc2626' },
    completed:   { label: 'Completed',   bg: '#f3f4f6', color: '#6b7280' },
  }
  return map[status] || map.on_track
}

function avatarInitials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

function clientColor(name: string) {
  const colors = ['#5046e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  return colors[name.charCodeAt(0) % colors.length]
}

// ─── EDIT CLIENT MODAL ────────────────────────────────────
function EditClientModal({ client, onClose, onSaved }: {
  client: Client
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [name,          setName]          = useState(client.name)
  const [industry,      setIndustry]      = useState(client.industry || '')
  const [website,       setWebsite]       = useState(client.website || '')
  const [location,      setLocation]      = useState(client.location || '')
  const [notes,         setNotes]         = useState(client.notes || '')
  const [contactName,   setContactName]   = useState(client.contact_name || '')
  const [contactTitle,  setContactTitle]  = useState(client.contact_title || '')
  const [contactEmail,  setContactEmail]  = useState(client.contact_email || '')
  const [contactPhone,  setContactPhone]  = useState(client.contact_phone || '')
  const [contact2Name,  setContact2Name]  = useState(client.contact2_name || '')
  const [contact2Title, setContact2Title] = useState(client.contact2_title || '')
  const [contact2Email, setContact2Email] = useState(client.contact2_email || '')
  const [error,         setError]         = useState('')
  const [loading,       setLoading]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('clients').update({
      name,
      industry:       industry      || null,
      website:        website       || null,
      location:       location      || null,
      notes:          notes         || null,
      contact_name:   contactName   || null,
      contact_title:  contactTitle  || null,
      contact_email:  contactEmail  || null,
      contact_phone:  contactPhone  || null,
      contact2_name:  contact2Name  || null,
      contact2_title: contact2Title || null,
      contact2_email: contact2Email || null,
    }).eq('id', client.id)

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
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Edit Client</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Update client information and contacts</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }}>X</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>Company</div>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Industry</label>
                <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Website</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Internal notes about this client..." style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginTop: 4, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>Primary Contact</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Title / Role</label>
                <input value={contactTitle} onChange={e => setContactTitle(e.target.value)} placeholder="e.g. VP Marketing" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@company.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={inputStyle} />
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginTop: 4, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>Secondary Contact (optional)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={contact2Name} onChange={e => setContact2Name(e.target.value)} placeholder="Full name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Title / Role</label>
                <input value={contact2Title} onChange={e => setContact2Title(e.target.value)} placeholder="e.g. CTO" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={contact2Email} onChange={e => setContact2Email(e.target.value)} placeholder="contact@company.com" style={inputStyle} />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>{error}</div>
            )}
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

// ─── MAIN PAGE ────────────────────────────────────────────
export default function ClientDetailPage() {
  const supabase = createClient()
  const params   = useParams()
  const router   = useRouter()
  const clientId = params.id as string

  const [client,      setClient]      = useState<Client | null>(null)
  const [projects,    setProjects]    = useState<Project[]>([])
  const [showEdit,    setShowEdit]    = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [notes,       setNotes]       = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  useEffect(() => { loadClient() }, [clientId])

  async function loadClient() {
    setLoading(true)

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (!clientData) { setLoading(false); return }
    setClient(clientData as Client)
    setNotes(clientData.notes || '')

    const { data: projectsRaw } = await supabase
      .from('projects')
      .select('id, name, status, due_date, loe_budget')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (projectsRaw && projectsRaw.length > 0) {
      const projectIds = projectsRaw.map(p => p.id)
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('project_id, hours')
        .in('project_id', projectIds)

      const enriched = projectsRaw.map(p => ({
        ...p,
        hours_logged: (timeEntries || [])
          .filter(t => t.project_id === p.id)
          .reduce((sum, t) => sum + t.hours, 0),
      }))
      setProjects(enriched as Project[])
    } else {
      setProjects([])
    }

    setLoading(false)
  }

  async function saveNotes() {
    if (!client) return
    setNotesSaving(true)
    await supabase.from('clients').update({ notes }).eq('id', client.id)
    setNotesSaving(false)
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

  if (!client) {
    return (
      <AppLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
          Client not found.
        </div>
      </AppLayout>
    )
  }

  const color          = clientColor(client.name)
  const initials       = avatarInitials(client.name)
  const activeProjects = projects.filter(p => p.status !== 'completed')
  const totalBudget    = projects.reduce((sum, p) => sum + (p.loe_budget || 0), 0)
  const totalLogged    = projects.reduce((sum, p) => sum + p.hours_logged, 0)
  const clientSince    = new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
    <AppLayout>
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            onClick={() => router.push('/clients')}
            style={{ fontSize: 13, color: '#9ca3af', cursor: 'pointer', fontWeight: 500 }}
          >
            Clients
          </span>
          <span style={{ color: '#d1d5db' }}>{'>'}</span>
          <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 600 }}>{client.name}</span>
        </div>
        <button onClick={() => setShowEdit(true)} style={ghostBtnStyle}>Edit Client</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, maxWidth: 1100, alignItems: 'start' }}>

          {/* LEFT COLUMN */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: color + '20', color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>{client.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  {[client.industry, client.location].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Active Projects', value: String(activeProjects.length), color: '#5046e5' },
                { label: 'Hours Logged',    value: `${totalLogged.toFixed(1)}h` },
                { label: 'Total Budget',    value: totalBudget > 0 ? `${totalBudget}h` : '—' },
                { label: 'Client Since',    value: clientSince },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: stat.color || '#1a1a2e' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>Projects</span>
                <button
                  onClick={() => router.push('/projects')}
                  style={{ ...ghostBtnStyle, fontSize: 12, padding: '5px 12px' }}
                >
                  + New Project
                </button>
              </div>

              {projects.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                  No projects yet for this client.
                </div>
              ) : (
                projects.map((project, i) => {
                  const si       = statusInfo(project.status)
                  const budget   = project.loe_budget || 0
                  const pct      = budget > 0 ? Math.min(Math.round((project.hours_logged / budget) * 100), 100) : 0
                  const barColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#5046e5'

                  return (
                    <div
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      style={{
                        padding: '14px 20px',
                        borderBottom: i < projects.length - 1 ? '1px solid #f3f4f6' : 'none',
                        display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f9fafb' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'white' }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: si.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{project.name}</div>
                        {project.due_date && (
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            Due {new Date(project.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                      {budget > 0 && (
                        <div style={{ width: 120 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 4, fontFamily: 'monospace' }}>
                            <span>{project.hours_logged}h</span>
                            <span>{budget}h</span>
                          </div>
                          <div style={{ height: 4, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3 }} />
                          </div>
                        </div>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: si.bg, color: si.color, flexShrink: 0 }}>
                        {si.label}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>
                Client Notes
              </div>
              <div style={{ padding: 20 }}>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add internal notes about this client — preferred contacts, communication preferences, billing notes..."
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button onClick={saveNotes} disabled={notesSaving} style={primaryBtnStyle}>
                    {notesSaving ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 14 }}>
                Primary Contact
              </div>
              {client.contact_name ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: color + '20', color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {avatarInitials(client.contact_name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{client.contact_name}</div>
                      {client.contact_title && (
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{client.contact_title}</div>
                      )}
                    </div>
                  </div>
                  {client.contact_email && (
                    <a href={`mailto:${client.contact_email}`} style={{ display: 'block', fontSize: 12, color: '#5046e5', marginBottom: 4, textDecoration: 'none' }}>
                      {client.contact_email}
                    </a>
                  )}
                  {client.contact_phone && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{client.contact_phone}</div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  No contact added.{' '}
                  <span onClick={() => setShowEdit(true)} style={{ color: '#5046e5', cursor: 'pointer', fontWeight: 600 }}>
                    Edit client
                  </span>
                  {' '}to add one.
                </div>
              )}
            </div>

            {client.contact2_name && (
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 14 }}>
                  Secondary Contact
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#e5e7eb', color: '#6b7280',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {avatarInitials(client.contact2_name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{client.contact2_name}</div>
                    {client.contact2_title && (
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{client.contact2_title}</div>
                    )}
                  </div>
                </div>
                {client.contact2_email && (
                  <a href={`mailto:${client.contact2_email}`} style={{ display: 'block', fontSize: 12, color: '#5046e5', textDecoration: 'none' }}>
                    {client.contact2_email}
                  </a>
                )}
              </div>
            )}

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 14 }}>
                Client Info
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {client.industry && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>Industry</span>
                    <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{client.industry}</span>
                  </div>
                )}
                {client.location && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>Location</span>
                    <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{client.location}</span>
                  </div>
                )}
                {client.website && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>Website</span>
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontWeight: 600, color: '#5046e5', textDecoration: 'none' }}
                    >
                      {client.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#6b7280' }}>Client Since</span>
                  <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{clientSince}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showEdit && client && (
        <EditClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); loadClient() }}
        />
      )}
    </AppLayout>
  )
}
