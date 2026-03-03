'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Section = 'profile' | 'workspace' | 'team' | 'billing'

type Member = {
  id: string
  user_id: string
  full_name: string
  email: string
  role: string
}

// ── Shared styles ─────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 13, color: '#1a1a2e',
  outline: 'none', boxSizing: 'border-box', background: 'white',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
}

const primaryBtn: React.CSSProperties = {
  background: '#5046e5', color: 'white', border: 'none',
  borderRadius: 8, padding: '8px 18px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

const ghostBtn: React.CSSProperties = {
  background: 'white', color: '#374151', border: '1px solid #d1d5db',
  borderRadius: 8, padding: '8px 18px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

const dangerBtn: React.CSSProperties = {
  background: 'white', color: '#dc2626', border: '1px solid #fca5a5',
  borderRadius: 8, padding: '8px 18px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

const card: React.CSSProperties = {
  background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
  padding: '28px 32px', marginBottom: 20,
}

const cardTitle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 4,
}

const cardSubtitle: React.CSSProperties = {
  fontSize: 13, color: '#9ca3af', marginBottom: 24,
}

const divider: React.CSSProperties = {
  borderTop: '1px solid #f3f4f6', marginTop: 24, paddingTop: 24,
}

function avatarColor(name: string) {
  const colors = ['#5046e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  return colors[(name || '').charCodeAt(0) % colors.length]
}

function avatarInitials(name: string) {
  return (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function SaveBanner({ message }: { message: string }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 32,
      background: '#1a1a2e', color: 'white',
      padding: '12px 20px', borderRadius: 10,
      fontSize: 13, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      zIndex: 50, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ color: '#16a34a' }}>✓</span> {message}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = createClient()

  const [section,      setSection]      = useState<Section>('profile')
  const [saving,       setSaving]       = useState(false)
  const [banner,       setBanner]       = useState('')
  const [currentUser,  setCurrentUser]  = useState<any>(null)
  const [workspaceId,  setWorkspaceId]  = useState('')
  const [userRole,     setUserRole]     = useState('')

  // Profile
  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')

  // Workspace
  const [wsName, setWsName] = useState('')
  const [wsSlug, setWsSlug] = useState('')

  // Team
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => { loadAll() }, [])

  function showBanner(msg: string) {
    setBanner(msg)
    setTimeout(() => setBanner(''), 3000)
  }

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUser(user)
    setEmail(user.email || '')

    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    setFullName(profile?.full_name || '')

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(id, name, slug)')
      .eq('user_id', user.id).single()
    if (!member) return

    setWorkspaceId(member.workspace_id)
    setUserRole(member.role)

    const ws = member.workspaces as any
    setWsName(ws?.name || '')
    setWsSlug(ws?.slug || '')

    await loadTeam(member.workspace_id)
  }

  async function loadTeam(wsId: string) {
    const { data: wsMembers } = await supabase
      .from('workspace_members')
      .select('id, user_id, role')
      .eq('workspace_id', wsId)

    const userIds = (wsMembers || []).map((m: any) => m.user_id)
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] }

    const { data: authUsers } = userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] }

    setMembers((wsMembers || []).map((m: any) => {
      const prof = (profiles || []).find((p: any) => p.id === m.user_id)
      return {
        id:        m.id,
        user_id:   m.user_id,
        full_name: prof?.full_name || 'Unknown',
        email:     '',
        role:      m.role,
      }
    }))
  }

  // ── Save handlers ─────────────────────────────────────

  async function saveProfile() {
    setSaving(true)
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', currentUser.id)
    setSaving(false)
    showBanner('Profile saved')
  }

  async function saveWorkspace() {
    if (!workspaceId) return
    setSaving(true)
    await supabase.from('workspaces').update({ name: wsName, slug: wsSlug }).eq('id', workspaceId)
    setSaving(false)
    showBanner('Workspace saved')
  }

  async function updateMemberRole(memberId: string, newRole: string) {
    await supabase.from('workspace_members').update({ role: newRole }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    showBanner('Role updated')
  }

  async function removeMember(memberId: string, userId: string) {
    if (!confirm('Remove this member from the workspace?')) return
    await supabase.from('workspace_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
    showBanner('Member removed')
  }

  const isAdmin = userRole === 'admin' || userRole === 'owner'

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: 'profile',   label: 'Profile',    icon: '◉' },
    { key: 'workspace', label: 'Workspace',  icon: '◫' },
    { key: 'team',      label: 'Team',       icon: '▦' },
    { key: 'billing',   label: 'Billing',    icon: '◌' },
  ]

  return (
    <AppLayout>
      {/* Top bar */}
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', padding: '0 28px', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>Settings</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 900, display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Sidebar nav */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', position: 'sticky', top: 0 }}>
            {navItems.map((item, i) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', fontSize: 13,
                  cursor: 'pointer', border: 'none', textAlign: 'left',
                  fontFamily: 'inherit',
                  borderBottom: i < navItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                  background: section === item.key ? '#f5f3ff' : 'white',
                  color: section === item.key ? '#5046e5' : '#374151',
                  fontWeight: section === item.key ? 600 : 500,
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div>

            {/* ── PROFILE ── */}
            {section === 'profile' && (
              <>
                <div style={card}>
                  <div style={cardTitle}>Personal Profile</div>
                  <div style={cardSubtitle}>Update your name and account information.</div>

                  {/* Avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: avatarColor(fullName),
                      color: 'white', fontSize: 22, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {avatarInitials(fullName)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{fullName || 'Your Name'}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{email}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                        Avatar is auto-generated from your initials
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Your full name"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email Address</label>
                      <input
                        value={email}
                        readOnly
                        style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af', cursor: 'default' }}
                      />
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>
                        Email cannot be changed here. Contact support if needed.
                      </div>
                    </div>
                  </div>

                  <div style={{ ...divider, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={saveProfile} disabled={saving} style={primaryBtn}>
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>

                <div style={{ ...card, borderColor: '#fecaca' }}>
                  <div style={cardTitle}>Danger Zone</div>
                  <div style={cardSubtitle}>Permanently delete your account and all associated data.</div>
                  <button
                    onClick={() => alert('Please contact support to delete your account.')}
                    style={dangerBtn}
                  >
                    Delete Account
                  </button>
                </div>
              </>
            )}

            {/* ── WORKSPACE ── */}
            {section === 'workspace' && (
              <div style={card}>
                <div style={cardTitle}>Workspace Settings</div>
                <div style={cardSubtitle}>Manage your workspace name and URL slug.</div>

                {/* Workspace icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12, background: '#5046e5',
                    color: 'white', fontSize: 20, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    L
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{wsName || 'Your Workspace'}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' }}>
                      lodge.app/{wsSlug || 'your-slug'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Workspace Name</label>
                    <input
                      value={wsName}
                      onChange={e => isAdmin && setWsName(e.target.value)}
                      readOnly={!isAdmin}
                      placeholder="Your agency name"
                      style={{ ...inputStyle, ...(isAdmin ? {} : { background: '#f9fafb', color: '#9ca3af', cursor: 'default' }) }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>URL Slug</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <span style={{
                        padding: '9px 12px', background: '#f3f4f6', border: '1px solid #d1d5db',
                        borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: 13, color: '#9ca3af',
                        fontFamily: 'monospace', whiteSpace: 'nowrap',
                      }}>
                        lodge.app/
                      </span>
                      <input
                        value={wsSlug}
                        onChange={e => isAdmin && setWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        readOnly={!isAdmin}
                        placeholder="your-agency"
                        style={{ ...inputStyle, borderRadius: '0 8px 8px 0', fontFamily: 'monospace', ...(isAdmin ? {} : { background: '#f9fafb', color: '#9ca3af', cursor: 'default' }) }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>
                      Lowercase letters, numbers, and hyphens only.
                    </div>
                  </div>
                </div>

                {!isAdmin && (
                  <div style={{ marginTop: 16, padding: '10px 14px', background: '#fef9c3', borderRadius: 8, fontSize: 12, color: '#b45309' }}>
                    Only workspace admins can edit these settings.
                  </div>
                )}

                {isAdmin && (
                  <div style={{ ...divider, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={saveWorkspace} disabled={saving} style={primaryBtn}>
                      {saving ? 'Saving...' : 'Save Workspace'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── TEAM ── */}
            {section === 'team' && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <div style={cardTitle}>Team Members</div>
                    <div style={{ ...cardSubtitle, marginBottom: 0 }}>
                      {members.length} member{members.length !== 1 ? 's' : ''} in this workspace
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {members.map((member, i) => {
                    const isMe   = member.user_id === currentUser?.id
                    const color  = avatarColor(member.full_name)

                    return (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 0',
                          borderBottom: i < members.length - 1 ? '1px solid #f3f4f6' : 'none',
                        }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          background: color, color: 'white', fontSize: 13, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {avatarInitials(member.full_name)}
                        </div>

                        {/* Name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {member.full_name}
                            {isMe && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#5046e5', background: '#ede9fe', padding: '1px 6px', borderRadius: 10 }}>
                                You
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                            {member.email || 'Team member'}
                          </div>
                        </div>

                        {/* Role selector */}
                        {isAdmin && !isMe ? (
                          <select
                            value={member.role}
                            onChange={e => updateMemberRole(member.id, e.target.value)}
                            style={{
                              ...inputStyle, width: 'auto', padding: '6px 10px',
                              fontSize: 12, cursor: 'pointer',
                            }}
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span style={{
                            fontSize: 12, fontWeight: 600,
                            padding: '4px 10px', borderRadius: 20,
                            background: member.role === 'owner' || member.role === 'admin' ? '#ede9fe' : '#f3f4f6',
                            color: member.role === 'owner' || member.role === 'admin' ? '#5046e5' : '#6b7280',
                            textTransform: 'capitalize',
                          }}>
                            {member.role}
                          </span>
                        )}

                        {/* Remove button */}
                        {isAdmin && !isMe && (
                          <button
                            onClick={() => removeMember(member.id, member.user_id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#d1d5db', fontSize: 16, padding: 4, lineHeight: 1,
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                            title="Remove member"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div style={{ ...divider }}>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    To invite new members, share your workspace slug with them during onboarding.
                  </div>
                </div>
              </div>
            )}

            {/* ── BILLING ── */}
            {section === 'billing' && (
              <>
                <div style={card}>
                  <div style={cardTitle}>Current Plan</div>
                  <div style={cardSubtitle}>You are on the free plan during development.</div>

                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px', background: '#f5f3ff', borderRadius: 10,
                    border: '1px solid #ddd6fe', marginBottom: 20,
                  }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#5046e5' }}>Free Plan</div>
                      <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 3 }}>
                        Unlimited projects · Up to 5 team members
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#5046e5' }}>$0<span style={{ fontSize: 13, fontWeight: 500 }}>/mo</span></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                    {[
                      { label: 'Projects',     value: 'Unlimited' },
                      { label: 'Team members', value: 'Up to 5' },
                      { label: 'Time tracking', value: '✓ Included' },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#6b7280' }}>{row.label}</span>
                        <span style={{ fontWeight: 600, color: row.value.startsWith('✗') ? '#d1d5db' : '#1a1a2e' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => alert('Billing plans coming soon.')}
                    style={primaryBtn}
                  >
                    Upgrade Plan
                  </button>
                </div>

                <div style={card}>
                  <div style={cardTitle}>Payment Method</div>
                  <div style={cardSubtitle}>No payment method on file.</div>
                  <button onClick={() => alert('Billing coming soon.')} style={ghostBtn}>
                    Add Payment Method
                  </button>
                </div>

                <div style={card}>
                  <div style={cardTitle}>Billing History</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>No invoices yet.</div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {banner && <SaveBanner message={banner} />}
    </AppLayout>
  )
}
