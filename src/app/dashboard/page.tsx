'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'
import { useRouter } from 'next/navigation'

type Project = {
  id: string
  name: string
  status: string
  due_date: string | null
  loe_budget: number | null
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const [userName,       setUserName]       = useState('')
  const [activeProjects, setActiveProjects] = useState(0)
  const [openTasks,      setOpenTasks]      = useState(0)
  const [hoursThisWeek,  setHoursThisWeek]  = useState(0)
  const [teamMembers,    setTeamMembers]    = useState(0)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [loading,        setLoading]        = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    setUserName(profile?.full_name?.split(' ')[0] || 'there')

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!member) return
    const wsId = member.workspace_id

    // Active projects
    const { count: projectCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', wsId)
      .neq('status', 'completed')

    // Open tasks
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', wsId)
      .neq('status', 'done')

    // Hours this week
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('hours')
      .eq('workspace_id', wsId)
      .eq('user_id', user.id)
      .gte('entry_date', weekStart.toISOString().split('T')[0])

    const totalHours = (timeEntries || []).reduce((sum, e) => sum + e.hours, 0)

    // Team members
    const { count: memberCount } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', wsId)

    // Recent projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, due_date, loe_budget')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })
      .limit(4)

    setActiveProjects(projectCount || 0)
    setOpenTasks(taskCount || 0)
    setHoursThisWeek(totalHours)
    setTeamMembers(memberCount || 0)
    setRecentProjects((projects as Project[]) || [])
    setLoading(false)
  }

  function greeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  function statusStyle(status: string): React.CSSProperties {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      on_track:    { bg: '#dcfce7', color: '#16a34a', label: 'On Track' },
      at_risk:     { bg: '#fef9c3', color: '#b45309', label: 'At Risk' },
      over_budget: { bg: '#fee2e2', color: '#dc2626', label: 'Over Budget' },
      completed:   { bg: '#f3f4f6', color: '#6b7280', label: 'Completed' },
    }
    const s = map[status] || map.on_track
    return { background: s.bg, color: s.color }
  }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      on_track: 'On Track', at_risk: 'At Risk',
      over_budget: 'Over Budget', completed: 'Completed',
    }
    return map[status] || status
  }

  const stats = [
    { label: 'Active Projects', value: loading ? '—' : `${activeProjects}` },
    { label: 'Open Tasks',      value: loading ? '—' : `${openTasks}` },
    { label: 'Hours This Week', value: loading ? '—' : `${hoursThisWeek.toFixed(1)}h` },
    { label: 'Team Members',    value: loading ? '—' : `${teamMembers}` },
  ]

  return (
    <AppLayout>
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', padding: '0 28px', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>Dashboard</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 900 }}>

          {/* Greeting */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>
              {greeting()}, {userName} 👋
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              Here is what is happening with your projects this week.
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {stats.map(stat => (
              <div key={stat.label} style={{
                background: 'white', borderRadius: 12,
                border: '1px solid #e5e7eb', padding: '20px 24px',
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#1a1a2e' }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Recent projects */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>Recent Projects</span>
              <button
                onClick={() => router.push('/projects')}
                style={{ fontSize: 12, color: '#5046e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                View all
              </button>
            </div>

            {loading && (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                Loading...
              </div>
            )}

            {!loading && recentProjects.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>No projects yet</div>
                <button
                  onClick={() => router.push('/projects')}
                  style={{
                    background: '#5046e5', color: 'white', border: 'none',
                    borderRadius: 8, padding: '8px 16px', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Create your first project
                </button>
              </div>
            )}

            {!loading && recentProjects.length > 0 && (
              <div>
                {recentProjects.map((project, i) => (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    style={{
                      padding: '14px 24px',
                      borderBottom: i < recentProjects.length - 1 ? '1px solid #f3f4f6' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{project.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {project.due_date && (
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>
                          Due {new Date(project.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <span style={{
                        ...statusStyle(project.status),
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                      }}>
                        {statusLabel(project.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  )
}