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
  hours_logged?: number
}

type ActivityItem = {
  id: string
  type: 'time_logged' | 'task_completed'
  description: string
  project_name: string | null
  hours?: number
  user_name: string
  timestamp: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [userName,       setUserName]       = useState('')
  const [activeProjects, setActiveProjects] = useState(0)
  const [openTasks,      setOpenTasks]      = useState(0)
  const [hoursThisWeek,  setHoursThisWeek]  = useState(0)
  const [teamMembers,    setTeamMembers]    = useState(0)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [activity,       setActivity]       = useState<ActivityItem[]>([])
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
      .limit(5)

    // Fetch time logged per project for LOE bars
    const projectIds = (projects || []).map((p: any) => p.id)
    const { data: allProjectTime } = projectIds.length > 0
      ? await supabase
          .from('time_entries')
          .select('project_id, hours')
          .in('project_id', projectIds)
      : { data: [] }

    // Sum hours per project
    const hoursPerProject: Record<string, number> = {}
    ;(allProjectTime || []).forEach((e: any) => {
      hoursPerProject[e.project_id] = (hoursPerProject[e.project_id] || 0) + e.hours
    })

    const enrichedProjects: Project[] = (projects || []).map((p: any) => ({
      ...p,
      hours_logged: hoursPerProject[p.id] || 0,
    }))

    // ── ACTIVITY FEED ──
    const { data: recentTime } = await supabase
      .from('time_entries')
      .select('id, hours, description, entry_date, project_id, user_id, created_at')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, title, project_id, updated_at')
      .eq('workspace_id', wsId)
      .eq('status', 'done')
      .order('updated_at', { ascending: false })
      .limit(10)

    const activityProjectIds = [
      ...new Set([
        ...(recentTime  || []).map((t: any) => t.project_id),
        ...(recentTasks || []).map((t: any) => t.project_id),
      ])
    ].filter(Boolean)

    const { data: activityProjects } = activityProjectIds.length > 0
      ? await supabase.from('projects').select('id, name').in('id', activityProjectIds)
      : { data: [] }

    const activityUserIds = [...new Set((recentTime || []).map((t: any) => t.user_id))].filter(Boolean)
    const { data: activityProfiles } = activityUserIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', activityUserIds)
      : { data: [] }

    const timeItems: ActivityItem[] = (recentTime || []).map((entry: any) => {
      const proj      = (activityProjects || []).find((p: any) => p.id === entry.project_id)
      const prof      = (activityProfiles || []).find((p: any) => p.id === entry.user_id)
      const firstName = prof?.full_name?.split(' ')[0] || 'Someone'
      return {
        id:           `time-${entry.id}`,
        type:         'time_logged',
        description:  entry.description || 'Logged time',
        project_name: proj?.name || null,
        hours:        entry.hours,
        user_name:    firstName,
        timestamp:    entry.created_at,
      }
    })

    const taskItems: ActivityItem[] = (recentTasks || []).map((task: any) => {
      const proj = (activityProjects || []).find((p: any) => p.id === task.project_id)
      return {
        id:           `task-${task.id}`,
        type:         'task_completed',
        description:  task.title,
        project_name: proj?.name || null,
        user_name:    'Team',
        timestamp:    task.updated_at,
      }
    })

    const allActivity = [...timeItems, ...taskItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12)

    setActiveProjects(projectCount || 0)
    setOpenTasks(taskCount || 0)
    setHoursThisWeek(totalHours)
    setTeamMembers(memberCount || 0)
    setRecentProjects(enrichedProjects)
    setActivity(allActivity)
    setLoading(false)
  }

  function greeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  function statusStyle(status: string): React.CSSProperties {
    const map: Record<string, { bg: string; color: string }> = {
      on_track:    { bg: '#dcfce7', color: '#16a34a' },
      at_risk:     { bg: '#fef9c3', color: '#b45309' },
      over_budget: { bg: '#fee2e2', color: '#dc2626' },
      completed:   { bg: '#f3f4f6', color: '#6b7280' },
    }
    return map[status] || map.on_track
  }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      on_track: 'On Track', at_risk: 'At Risk',
      over_budget: 'Over Budget', completed: 'Completed',
    }
    return map[status] || status
  }

  function loeBarColor(pct: number) {
    if (pct >= 100) return '#dc2626'
    if (pct >= 75)  return '#d97706'
    return '#16a34a'
  }

  function timeAgo(timestamp: string) {
    const diff = Date.now() - new Date(timestamp).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 60)  return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  function activityIcon(type: ActivityItem['type']) {
    if (type === 'time_logged')    return { icon: '◷', bg: '#ede9fe', color: '#5046e5' }
    if (type === 'task_completed') return { icon: '✓', bg: '#dcfce7', color: '#16a34a' }
    return { icon: '·', bg: '#f3f4f6', color: '#6b7280' }
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
        <div style={{ maxWidth: 1100 }}>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
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

          {/* Two column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

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
                <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</div>
              )}

              {!loading && recentProjects.length === 0 && (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>No projects yet</div>
                  <button
                    onClick={() => router.push('/projects')}
                    style={{ background: '#5046e5', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Create your first project
                  </button>
                </div>
              )}

              {!loading && recentProjects.map((project, i) => {
                const logged  = project.hours_logged || 0
                const budget  = project.loe_budget   || 0
                const pct     = budget > 0 ? Math.min(Math.round((logged / budget) * 100), 100) : 0
                const barColor = loeBarColor(pct)
                const ss      = statusStyle(project.status)

                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    style={{
                      padding: '14px 24px',
                      borderBottom: i < recentProjects.length - 1 ? '1px solid #f3f4f6' : 'none',
                      display: 'flex', alignItems: 'center', gap: 16,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f9fafb' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'white' }}
                  >
                    {/* Colour dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: barColor,
                    }} />

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.name}
                      </div>
                      {project.due_date && (
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          Due {new Date(project.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>

                    {/* LOE bar */}
                    {budget > 0 ? (
                      <div style={{ width: 120, flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 4, fontFamily: 'monospace' }}>
                          <span style={{ color: pct >= 100 ? '#dc2626' : '#6b7280', fontWeight: pct >= 100 ? 700 : 400 }}>
                            {logged.toFixed(1)}h
                          </span>
                          <span>{budget}h</span>
                        </div>
                        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.3s ease' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: 120, flexShrink: 0, fontSize: 11, color: '#d1d5db', textAlign: 'right' }}>
                        No budget set
                      </div>
                    )}

                    {/* Status badge */}
                    <span style={{
                      ...ss, fontSize: 11, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 20, flexShrink: 0,
                    }}>
                      {statusLabel(project.status)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Activity feed */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>Recent Activity</span>
              </div>

              {loading && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</div>
              )}

              {!loading && activity.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  No activity yet. Start logging time or completing tasks.
                </div>
              )}

              {!loading && activity.length > 0 && (
                <div style={{ padding: '8px 0' }}>
                  {activity.map((item, i) => {
                    const ic = activityIcon(item.type)
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', gap: 12, padding: '10px 20px',
                          borderBottom: i < activity.length - 1 ? '1px solid #f9fafb' : 'none',
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: ic.bg, color: ic.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, marginTop: 1,
                        }}>
                          {ic.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#1a1a2e', lineHeight: 1.5 }}>
                            {item.type === 'time_logged' && (
                              <>
                                <strong>{item.user_name}</strong> logged{' '}
                                <strong>{item.hours}h</strong>
                                {item.project_name && (
                                  <> on <span style={{ color: '#5046e5', fontWeight: 600 }}>{item.project_name}</span></>
                                )}
                                {item.description && item.description !== 'Logged time' && (
                                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.description}</div>
                                )}
                              </>
                            )}
                            {item.type === 'task_completed' && (
                              <>
                                <strong>Task completed</strong>
                                {item.project_name && (
                                  <> on <span style={{ color: '#5046e5', fontWeight: 600 }}>{item.project_name}</span></>
                                )}
                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.description}</div>
                              </>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                            {timeAgo(item.timestamp)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
