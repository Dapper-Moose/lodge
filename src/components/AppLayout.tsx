'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const navItems = [
  { label: 'Dashboard',     href: '/dashboard', icon: '▦' },
  { label: 'Projects',      href: '/projects',  icon: '◫' },
  { label: 'Time Tracking', href: '/time',      icon: '◷' },
  { label: 'Team',          href: '/team',      icon: '◉' },
  { label: 'Clients',       href: '/clients',   icon: '◌' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [user,      setUser]      = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, workspaces(id, name, slug)')
        .eq('user_id', user.id)
        .single()

      if (!member) { router.push('/onboarding'); return }
      setWorkspace(member.workspaces)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = (user?.user_metadata?.full_name || user?.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f9' }}>
        <div style={{ fontSize: '13px', color: '#9ca3af' }}>Loading…</div>
      </div>
    )
  }

  const sidebarW = 224

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f7f7f9' }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: sidebarW,
        minWidth: sidebarW,
        maxWidth: sidebarW,
        height: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}>

        {/* Workspace */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: '#5046e5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>L</div>
            <span style={{
              color: 'white', fontWeight: 600, fontSize: 13,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {workspace?.name}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  marginBottom: 2, cursor: 'pointer', border: 'none', textAlign: 'left',
                  background: active ? '#5046e5' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.55)',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' } }}
              >
                <span style={{ fontSize: 15, lineHeight: '1', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', marginBottom: 4 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: '#5046e5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.user_metadata?.full_name || 'You'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{ width: '100%', textAlign: 'left', padding: '5px 8px', fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            Sign out
          </button>
        </div>

      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {children}
      </div>

    </div>
  )
}