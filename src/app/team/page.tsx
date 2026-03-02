'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Member = {
  id: string
  role: string
  created_at: string
  user_id: string
  profiles: {
    full_name: string | null
  } | null
  email?: string
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

function roleBadge(role: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    owner:  { label: 'Owner',  color: '#5046e5', bg: '#ede9fe' },
    admin:  { label: 'Admin',  color: '#0369a1', bg: '#e0f2fe' },
    member: { label: 'Member', color: '#374151', bg: '#f3f4f6' },
  }
  const s = map[role] || map.member
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 20,
    }}>
      {s.label}
    </span>
  )
}

function InviteModal({ workspaceId, onClose, onInvited }: {
  workspaceId: string
  onClose: () => void
  onInvited: () => void
}) {
  const supabase = createClient()
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState('member')
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const { error: inviteError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/onboarding`,
      }
    })

    if (inviteError) {
      setError(inviteError.message)
      setLoading(false)
      return
    }

    setSuccess(`Invitation sent to ${email}. They will receive an email to join your workspace.`)
    setLoading(false)
    setEmail('')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 460,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Invite Team Member</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Send an invitation to join your workspace</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }}>X</button>
        </div>
        <form onSubmit={handleInvite} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@agency.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && (
              <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>{error}</div>
            )}
            {success && (
              <div style={{ fontSize: 13, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>{success}</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={ghostBtnStyle}>{success ? 'Close' : 'Cancel'}</button>
              {!success && (
                <button type="submit" disabled={loading} style={primaryBtnStyle}>{loading ? 'Sending...' : 'Send Invitation'}</button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const supabase = createClient()

  const [members,     setMembers]     = useState<Member[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [currentRole, setCurrentRole] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [menuOpenId,  setMenuOpenId]  = useState<string | null>(null)
  const [updatingId,  setUpdatingId]  = useState<string | null>(null)

  useEffect(() => { loadTeam() }, [])

  // Close menu on outside click
  useEffect(() => {
    function handleClick() { setMenuOpenId(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  async function loadTeam() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .single()

    if (!member) return
    setWorkspaceId(member.workspace_id)
    setCurrentRole(member.role)

    const { data: members } = await supabase
      .from('workspace_members')
      .select('id, role, created_at, user_id')
      .eq('workspace_id', member.workspace_id)
      .order('created_at', { ascending: true })

    if (!members) { setLoading(false); return }

    const userIds = members.map(m => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    const combined = members.map(m => ({
      ...m,
      profiles: profiles?.find(p => p.id === m.user_id) || null
    }))

    setMembers(combined as unknown as Member[])
    setLoading(false)
  }

  async function changeRole(memberId: string, newRole: string) {
    setUpdatingId(memberId)
    await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId)
    await loadTeam()
    setUpdatingId(null)
    setMenuOpenId(null)
  }

  async function removeMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return
    setUpdatingId(memberId)
    await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
    await loadTeam()
    setUpdatingId(null)
    setMenuOpenId(null)
  }

  function getInitials(member: Member) {
    const profiles = member.profiles
    const name = Array.isArray(profiles)
      ? profiles[0]?.full_name || 'U'
      : profiles?.full_name || 'U'
    return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  }

  function getDisplayName(member: Member) {
    const profiles = member.profiles
    if (Array.isArray(profiles)) return profiles[0]?.full_name || 'Unknown User'
    return profiles?.full_name || 'Unknown User'
  }

  const canManage = currentRole === 'owner' || currentRole === 'admin'
  const colors = ['#5046e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <AppLayout>
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>Team</span>
        {canManage && (
          <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>+ Invite Member</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 700 }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 13 }}>Loading team...</div>
          )}

          {!loading && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{
                padding: '12px 20px', borderBottom: '1px solid #e5e7eb',
                fontSize: 11, fontWeight: 700, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                display: 'grid', gridTemplateColumns: `1fr 160px 140px${canManage ? ' 48px' : ''}`,
              }}>
                <div>Member</div>
                <div>Role</div>
                <div>Joined</div>
                {canManage && <div />}
              </div>

              {members.map((member, i) => {
                const color   = colors[getDisplayName(member).charCodeAt(0) % colors.length]
                const isMe    = member.user_id === currentUserId
                const isOwner = member.role === 'owner'
                const canEdit = canManage && !isOwner && !isMe

                return (
                  <div
                    key={member.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `1fr 160px 140px${canManage ? ' 48px' : ''}`,
                      padding: '16px 20px', alignItems: 'center',
                      borderBottom: i < members.length - 1 ? '1px solid #f3f4f6' : 'none',
                      opacity: updatingId === member.id ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {/* Member */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
                      }}>
                        {getInitials(member)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>
                          {getDisplayName(member)}
                          {isMe && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>(you)</span>}
                        </div>
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      {canEdit ? (
                        <select
                          value={member.role}
                          onChange={e => changeRole(member.id, e.target.value)}
                          style={{
                            fontSize: 12, fontWeight: 600, borderRadius: 20,
                            border: '1px solid #e5e7eb', padding: '3px 8px',
                            background: 'white', cursor: 'pointer', color: '#374151',
                            outline: 'none',
                          }}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        roleBadge(member.role)
                      )}
                    </div>

                    {/* Joined */}
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {new Date(member.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div style={{ position: 'relative' }}>
                        {canEdit && (
                          <button
                            onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === member.id ? null : member.id) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
                          >
                            &#x22EF;
                          </button>
                        )}
                        {menuOpenId === member.id && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: 'absolute', right: 0, top: '100%', marginTop: 4,
                              background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                              boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 160,
                            }}
                          >
                            <div style={{ padding: '6px 4px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', padding: '4px 12px 6px' }}>
                                Change Role
                              </div>
                              {['member', 'admin'].map(r => (
                                <button
                                  key={r}
                                  onClick={() => changeRole(member.id, r)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    width: '100%', padding: '8px 12px',
                                    background: member.role === r ? '#f3f4f6' : 'none',
                                    border: 'none', cursor: 'pointer', fontSize: 13,
                                    color: '#1a1a2e', textAlign: 'left', borderRadius: 4,
                                  }}
                                >
                                  {member.role === r && <span style={{ color: '#5046e5' }}>✓</span>}
                                  {member.role !== r && <span style={{ width: 14 }} />}
                                  {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                              ))}
                              <div style={{ height: 1, background: '#f3f4f6', margin: '6px 0' }} />
                              <button
                                onClick={() => removeMember(member.id)}
                                style={{
                                  display: 'block', width: '100%', padding: '8px 12px',
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  fontSize: 13, color: '#dc2626', textAlign: 'left', borderRadius: 4,
                                }}
                              >
                                Remove from workspace
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{
            marginTop: 16, padding: '14px 18px', background: '#f8f7ff',
            borderRadius: 10, border: '1px solid #ede9fe',
            fontSize: 12, color: '#5046e5', lineHeight: 1.6,
          }}>
            <strong>Note:</strong> Full invitation flow with email delivery will be configured before launch.
            For now, new team members can sign up at your Lodge URL and you can assign their roles directly in Supabase.
          </div>

        </div>
      </div>

      {showModal && (
        <InviteModal
          workspaceId={workspaceId}
          onClose={() => setShowModal(false)}
          onInvited={() => { setShowModal(false); loadTeam() }}
        />
      )}
    </AppLayout>
  )
}