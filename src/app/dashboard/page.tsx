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
  client_name?: string | null
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    on_track:    { label: 'On Track',    bg: '#dcfce7', color: '#16a34a', dot: '#16a34a' },
    at_risk:     { label: 'At Risk',     bg: '#fef9c3', color: '#b45309', dot: '#d97706' },
    over_budget: { label: 'Over Budget', bg: '#fee2e2', color: '#dc2626', dot: '#dc2626' },
    completed:   { label: 'Completed',   bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
  }
  const si = map[status] || map.on_track
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
      background: si.bg, color: si.color, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: si.dot, display: 'inline-block', flexShrink: 0 }} />
      {si.label}
    </span>
  )
}

function loeBarColor(pct: number) {
  if (pct >= 100) return '#dc2626'
  if (pct >= 75)  return '#d97706'
  return '#16a34a'
}

function timeAgo(timestamp: string) {
  const diff  = Date.now() - new Date(timestamp).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function activityIcon(type: ActivityItem['type']) {
  if (type === 'time_logged')    return { icon: '◷', bg: '#ede9fe', color: '#5046e5' }
  if (type === 'task_completed') return { icon: '✓', bg: '#dcfce7', color: '#16a34a' }
  return { icon: '·', bg: '#f3f4f6', color: '#6b7280' }
}

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [userName,       setUserName]       = useState('')
  const [activeProjects, setActiveProjects] = useState(0)
  const [openTasks,      setOpenTasks]      = useState(0)
  const [hoursThisWeek,  setHoursThisWeek]  = useState(0)
  const [teamMembers,    setTeamMembers]    = useState(0)
  const [atRiskCount,    setAtRiskCount]    = useState(0)
  const [overdueCount,   setOverdueCount]   = useState(0)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [activity,       setActivity]       = useState<ActivityItem[]>([])
  const [loading,        setLoading]        = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    setUserName(profile?.full_name?.split(' ')[0] || 'there')

    const { data: member } = await supabase
      .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
    if (!member) return
    const wsId = member.workspace_id

    // Active projects
    const { count: projectCount } = await supabase
      .from('projects').select('id', { count: 'exact', head: true })
      .eq('workspace_id', wsId).neq('status', 'completed')

    // At-risk + over-budget projects
    const { data: atRiskProjects } = await supabase
      .from('projects').select('id')
      .eq('workspace_id', wsId)
      .in('status', ['at_risk', 'over_budget'])
    setAtRiskCount(atRiskProjects?.length || 0)

    // Open tasks
    const { count: taskCount } = await supabase
      .from('tasks').select('id', { count: 'exact', head: true })
      .eq('workspace_id', wsId).neq('status', 'done')

    // Overdue tasks
    const today = new Date().toISOString().split('T')[0]
    const { count: overdueTaskCount } = await supabase
      .from('tasks').select('id', { count: 'exact', head: true })
      .eq('workspace_id', wsId)
      .neq('status', 'done')
      .lt('due_date', today)
    setOverdueCount(overdueTaskCount || 0)

    // Hours this week
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const { data: timeEntries } = await supabase
      .from('time_entries').select('hours')
      .eq('workspace_id', wsId).eq('user_id', user.id)
      .gte('entry_date', weekStart.toISOString().split('T')[0])
    const totalHours = (timeEntries || []).reduce((sum, e) => sum + e.hours, 0)

    // Team members
    const { count: memberCount } = await supabase
      .from('workspace_members').select('id', { count: 'exact', head: true })
      .eq('workspace_id', wsId)

    // Recent projects with client names
    const { data: projects } = await supabase
      .from('projects').select('id, name, status, due_date, loe_budget, clients(name)')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })
      .limit(5)

    const projectIds = (projects || []).map((p: any) => p.id)
    const { data: allProjectTime } = projectIds.length > 0
      ? await supabase.from('time_entries').select('project_id, hours').in('project_id', projectIds)
      : { data: [] }

    const hoursPerProject: Record<string, number> = {}
    ;(allProjectTime || []).forEach((e: any) => {
      hoursPerProject[e.project_id] = (hoursPerProject[e.project_id] || 0) + e.hours
    })

    const enrichedProjects: Project[] = (projects || []).map((p: any) => ({
      ...p,
      client_name:  Array.isArray(p.clients) ? p.clients[0]?.name : p.clients?.name || null,
      hours_logged: hoursPerProject[p.id] || 0,
    }))

    // Activity feed
    const { data: recentTime } = await supabase
      .from('time_entries').select('id, hours, description, entry_date, project_id, user_id, created_at')
      .eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(10)

    const { data: recentTasks } = await supabase
      .from('tasks').select('id, title, project_id, updated_at')
      .eq('workspace_id', wsId).eq('status', 'done')
      .order('updated_at', { ascending: false }).limit(10)

    const activityProjectIds = [...new Set([
      ...(recentTime  || []).map((t: any) => t.project_id),
      ...(recentTasks || []).map((t: any) => t.project_id),
    ])].filter(Boolean)

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
      return {
        id:           `time-${entry.id}`,
        type:         'time_logged',
        description:  entry.description || 'Logged time',
        project_name: proj?.name || null,
        hours:        entry.hours,
        user_name:    prof?.full_name?.split(' ')[0] || 'Someone',
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

  const statCards = [
    {
      label: 'Active Projects',
      value: loading ? '—' : `${activeProjects}`,
      icon: '◫', iconBg: '#ede9fe', iconColor: '#5046e5',
      sub: loading ? '' : `${atRiskCount} at risk`,
      subColor: atRiskCount > 0 ? '#d97706' : '#9ca3af',
    },
    {
      label: 'Open Tasks',
      value: loading ? '—' : `${openTasks}`,
      icon: '✓', iconBg: '#dcfce7', iconColor: '#16a34a',
      sub: loading ? '' : overdueCount > 0 ? `${overdueCount} overdue` : 'None overdue',
      subColor: overdueCount > 0 ? '#dc2626' : '#9ca3af',
    },
    {
      label: 'Hours This Week',
      value: loading ? '—' : `${hoursThisWeek.toFixed(1)}h`,
      icon: '◷', iconBg: '#fef9c3', iconColor: '#d97706',
      sub: 'your logged hours',
      subColor: '#9ca3af',
    },
    {
      label: 'Team Members',
      value: loading ? '—' : `${teamMembers}`,
      icon: '▦', iconBg: '#f3f4f6', iconColor: '#6b7280',
      sub: 'in workspace',
      subColor: '#9ca3af',
    },
  ]

  return (
    <AppLayout>
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', padding: '0 28px', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>Dashboard</span>
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
            {statCards.map(stat => (
              <div key={stat.label} style={{
                background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
                padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
              >
                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 9, marginBottom: 12,
                  background: stat.iconBg, color: stat.iconColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {stat.icon}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
                {stat.sub && (
                  <div style={{ fontSize: 11, color: stat.subColor, marginTop: 5, fontWeight: stat.subColor !== '#9ca3af' ? 600 : 400 }}>
                    {stat.sub}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Two column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

            {/* Recent projects */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{
                padding: '15px 20px', borderBottom: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Active Projects</span>
                <button
                  onClick={() => router.push('/projects')}
                  style={{ fontSize: 12, color: '#5046e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                >
                  View all →
                </button>
              </div>

              {loading && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</div>
              )}

              {!loading && recentProjects.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>No projects yet</div>
                  <button
                    onClick={() => router.push('/projects')}
                    style={{ background: '#5046e5', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Create your first project
                  </button>
                </div>
              )}

              {!loading && recentProjects.map((project, i) => {
                const logged   = project.hours_logged || 0
                const budget   = project.loe_budget   || 0
                const pct      = budget > 0 ? Math.min(Math.round((logged / budget) * 100), 100) : 0
                const barColor = loeBarColor(pct)

                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    style={{
                      padding: '12px 20px',
                      borderBottom: i < recentProjects.length - 1 ? '1px solid #f3f4f6' : 'none',
                      display: 'flex', alignItems: 'center', gap: 13,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f9fafb' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'white' }}
                  >
                    {/* Colour dot */}
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: barColor }} />

                    {/* Name + client */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.name}
                      </div>
                      {project.client_name && (
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{project.client_name}</div>
                      )}
                    </div>

                    {/* LOE bar */}
                    {budget > 0 ? (
                      <div style={{ width: 116, flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', textAlign: 'right', marginBottom: 3 }}>
                          {logged.toFixed(1)}h / {budget}h
                        </div>
                        <div style={{ height: 5, background: '#eaecef', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: 116, flexShrink: 0 }} />
                    )}

                    {/* Status badge */}
                    <StatusBadge status={project.status} />
                  </div>
                )
              })}
            </div>

            {/* Activity feed */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '15px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Recent Activity</span>
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
                <div style={{ padding: '4px 0' }}>
                  {activity.map((item, i) => {
                    const ic = activityIcon(item.type)
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', gap: 10, padding: '9px 20px',
                          borderBottom: i < activity.length - 1 ? '1px solid #f3f4f6' : 'none',
                        }}
                      >
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: ic.bg, color: ic.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, marginTop: 2,
                        }}>
                          {ic.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, color: '#3a3a4a', lineHeight: 1.5 }}>
                            {item.type === 'time_logged' && (
                              <>
                                <strong style={{ color: '#18181f' }}>{item.user_name}</strong> logged{' '}
                                <strong>{item.hours}h</strong>
                                {item.project_name && (
                                  <> on <span style={{ color: '#5046e5', fontWeight: 600 }}>{item.project_name}</span></>
                                )}
                                {item.description && item.description !== 'Logged time' && (
                                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{item.description}</div>
                                )}
                              </>
                            )}
                            {item.type === 'task_completed' && (
                              <>
                                <strong style={{ color: '#18181f' }}>Task completed</strong>
                                {item.project_name && (
                                  <> on <span style={{ color: '#5046e5', fontWeight: 600 }}>{item.project_name}</span></>
                                )}
                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{item.description}</div>
                              </>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#b5b5c8', marginTop: 1, fontFamily: 'monospace' }}>
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
