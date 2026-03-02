'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Client = {
  id: string
  name: string
  industry: string | null
  website: string | null
  location: string | null
  notes: string | null
  created_at: string
}

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

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '9px 14px', fontSize: 13, color: '#374151',
  background: 'none', border: 'none', cursor: 'pointer',
}

function ClientModal({ workspaceId, client, onClose, onSaved }: {
  workspaceId: string
  client?: Client | null
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const isEdit = !!client

  const [name,     setName]     = useState(client?.name     || '')
  const [industry, setIndustry] = useState(client?.industry || '')
  const [website,  setWebsite]  = useState(client?.website  || '')
  const [location, setLocation] = useState(client?.location || '')
  const [notes,    setNotes]    = useState(client?.notes    || '')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      name,
      industry: industry || null,
      website:  website  || null,
      location: location || null,
      notes:    notes    || null,
    }

    const { error } = isEdit
      ? await supabase.from('clients').update(payload).eq('id', client!.id)
      : await supabase.from('clients').insert({ ...payload, workspace_id: workspaceId })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

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
        <div style={{
          padding: '24px 24px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>
              {isEdit ? 'Edit Client' : 'New Client'}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
              {isEdit ? 'Update client details' : 'Add a new client to your workspace'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }}
          >
            &#x2715;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={labelStyle}>Client Name *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Apex Creative Co."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Industry</label>
              <input
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="e.g. Technology, Healthcare, Retail"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Website</label>
                <input
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. New York, NY"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes about this client"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
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
                {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Client'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}

function ClientCard({ client, onEdit, onDelete, onClick }: {
  client: Client
  onEdit: (c: Client) => void
  onDelete: (id: string) => void
  onClick: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  const initials = client.name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const colors = ['#5046e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  const color  = colors[client.name.charCodeAt(0) % colors.length]

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
        padding: 20, position: 'relative', cursor: 'pointer',
      }}
    >
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: '1', padding: '0 4px' }}
        >
          &#x22EF;
        </button>
        {showMenu && (
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 130,
          }}>
            <button
              onClick={() => { setShowMenu(false); onEdit(client) }}
              style={menuItemStyle}
            >
              Edit client
            </button>
            <button
              onClick={() => { setShowMenu(false); onDelete(client.id) }}
              style={{ ...menuItemStyle, color: '#dc2626' }}
            >
              Delete client
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{client.name}</div>
          {client.industry && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{client.industry}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {client.location && (
          <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>&#128205;</span> {client.location}
          </div>
        )}
        {client.website && (
          <div style={{ fontSize: 12, color: '#5046e5', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>&#128279;</span>
            <a
            
              href={client.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#5046e5', textDecoration: 'none' }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {client.website!.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
        {client.notes && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, lineHeight: '1.5' }}>
            {client.notes}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const supabase = createClient()
const router = useRouter() 

  const [clients,    setClients]    = useState<Client[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [search,     setSearch]     = useState('')

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
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
      .from('clients')
      .select('*')
      .eq('workspace_id', member.workspace_id)
      .order('name', { ascending: true })

    setClients((data as Client[]) || [])
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this client? This cannot be undone.')) return
    await supabase.from('clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.industry || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>Clients</span>
        <button
          onClick={() => { setEditClient(null); setShowModal(true) }}
          style={primaryBtnStyle}
        >
          + New Client
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 900 }}>

          <div style={{ marginBottom: 24 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients…"
              style={{ ...inputStyle, maxWidth: 300 }}
            />
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 13 }}>
              Loading clients…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{
              background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
              padding: '60px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>&#9675;</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>
                {search ? 'No clients match your search' : 'No clients yet'}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                {search ? 'Try a different search term' : 'Add your first client to get started'}
              </div>
              {!search && (
                <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>
                  + New Client
                </button>
              )}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {filtered.map(client => (
  <ClientCard
    key={client.id}
    client={client}
    onEdit={c => { setEditClient(c); setShowModal(true) }}
    onDelete={handleDelete}
    onClick={() => router.push(`/clients/${client.id}`)}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {showModal && (
        <ClientModal
          workspaceId={workspaceId}
          client={editClient}
          onClose={() => { setShowModal(false); setEditClient(null) }}
          onSaved={() => { setShowModal(false); setEditClient(null); loadClients() }}
        />
      )}
    </AppLayout>
  )
}