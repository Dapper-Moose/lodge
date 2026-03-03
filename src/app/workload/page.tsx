'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Member = {
  user_id: string
  full_name: string
  role: string
}

type TaskAssignment = {
  task_id: string
  task_title: string
  project_id: string
  project_name: string
  estimated_hours: number
  start_date: string
  due_date: string
  hours_in_week: number
}

type MemberWorkload = {
  member: Member
  tasks: TaskAssignment[]
  total_hours: number
}

const WEEKLY_CAPACITY = 40

// Count working days (Mon–Fri) between two dates, inclusive
function countWorkingDays(from: Date, to: Date): number {
  let count = 0
  const cur = new Date(from)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// How many of a task's estimated hours fall within the given week
function hoursInWeek(
  taskStart: Date,
  taskEnd: Date,
  weekStart: Date,
  weekEnd: Date,
  estimatedHours: number
): number {
  const totalDays = countWorkingDays(taskStart, taskEnd)
  if (totalDays === 0) return 0

  // Clamp task range to the week
  const overlapStart = taskStart > weekStart ? taskStart : weekStart
  const overlapEnd   = taskEnd   < weekEnd   ? taskEnd   : weekEnd
  if (overlapStart > overlapEnd) return 0

  const daysInWeek = countWorkingDays(overlapStart, overlapEnd)
  if (daysInWeek === 0) return 0

  return (daysInWeek / totalDays) * estimatedHours
}

// Mon–Fri bounds for a given week offset from today
function getWeekBounds(offset: number): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)
  return { start: monday, end: friday }
}

function formatWeekLabel(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

function projectColor(projectId: string) {
  const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
  let hash = 0
  for (let i = 0; i < projectId.length; i++) hash = projectId.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function avatarColor(name: string) {
  const colors = ['#5046e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  return colors[(name || '').charCodeAt(0) % colors.length]
}

function avatarInitials(name: string) {
  return (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function capacityColor(hours: number) {
  const pct = (hours / WEEKLY_CAPACITY) * 100
  if (pct > 100) return '#dc2626'
  if (pct >= 80)  return '#d97706'
  return '#16a34a'
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export default function WorkloadPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [weekOffset, setWeekOffset] = useState(0)
  const [workload,   setWorkload]   = useState<MemberWorkload[]>([])
  const [loading,    setLoading]    = useState(true)

  const { start: weekStart, end: weekEnd } = getWeekBounds(weekOffset)

  useEffect(() => { loadWorkload() }, [weekOffset])

  async function loadWorkload() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: memberRow } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()
    if (!memberRow) return
    const wsId = memberRow.workspace_id

    // All workspace members + profiles
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', wsId)

    const userIds = (members || []).map((m: any) => m.user_id)

    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] }

    const enrichedMembers: Member[] = (members || []).map((m: any) => ({
      user_id:   m.user_id,
      full_name: profiles?.find((p: any) => p.id === m.user_id)?.full_name || 'Unknown',
      role:      m.role || 'Member',
    }))

    // Task assignees for all workspace members
    const { data: assignees } = userIds.length > 0
      ? await supabase
          .from('task_assignees')
          .select('task_id, user_id')
          .in('user_id', userIds)
      : { data: [] }

    const taskIds = [...new Set((assignees || []).map((a: any) => a.task_id))]

    // Tasks that have start_date, due_date, estimated_hours and aren't done
    const { data: tasks } = taskIds.length > 0
      ? await supabase
          .from('tasks')
          .select('id, title, project_id, estimated_hours, start_date, due_date, status')
          .in('id', taskIds)
          .not('start_date',      'is', null)
          .not('due_date',        'is', null)
          .not('estimated_hours', 'is', null)
          .neq('status', 'done')
      : { data: [] }

    // Project names
    const projectIds = [...new Set((tasks || []).map((t: any) => t.project_id))].filter(Boolean)
    const { data: projects } = projectIds.length > 0
      ? await supabase.from('projects').select('id, name').in('id', projectIds)
      : { data: [] }

    const getProjectName = (id: string) =>
      projects?.find((p: any) => p.id === id)?.name || 'Unknown Project'

    // Build per-member workload
    const result: MemberWorkload[] = enrichedMembers.map(member => {
      const memberTaskIds = (assignees || [])
        .filter((a: any) => a.user_id === member.user_id)
        .map((a: any) => a.task_id)

      const memberTasks = (tasks || []).filter((t: any) => memberTaskIds.includes(t.id))

      const taskAssignments: TaskAssignment[] = memberTasks
        .map((task: any) => {
          const taskStart = new Date(task.start_date + 'T00:00:00')
          const taskEnd   = new Date(task.due_date   + 'T00:00:00')
          const hrs = hoursInWeek(taskStart, taskEnd, weekStart, weekEnd, task.estimated_hours)
          return {
            task_id:         task.id,
            task_title:      task.title,
            project_id:      task.project_id,
            project_name:    getProjectName(task.project_id),
            estimated_hours: task.estimated_hours,
            start_date:      task.start_date,
            due_date:        task.due_date,
            hours_in_week:   round1(hrs),
          }
        })
        .filter(t => t.hours_in_week > 0)
        .sort((a, b) => b.hours_in_week - a.hours_in_week)

      const total_hours = round1(taskAssignments.reduce((sum, t) => sum + t.hours_in_week, 0))

      return { member, tasks: taskAssignments, total_hours }
    }).sort((a, b) => b.total_hours - a.total_hours)

    setWorkload(result)
    setLoading(false)
  }

  const totalPlanned  = round1(workload.reduce((sum, w) => sum + w.total_hours, 0))
  const totalCapacity = workload.length * WEEKLY_CAPACITY
  const teamUtilPct   = totalCapacity > 0 ? Math.round((totalPlanned / totalCapacity) * 100) : 0
  const activeMembers = workload.filter(w => w.total_hours > 0).length

  return (
    <AppLayout>
      {/* Top bar */}
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>Team Workload</span>
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
            {formatWeekLabel(weekStart, weekEnd)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', marginRight: 6 }}>
            {totalCapacity}h capacity
          </span>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <button
            onClick={() => setWeekOffset(0)}
            style={{
              padding: '5px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: weekOffset === 0 ? '#ede9fe' : 'white',
              color: weekOffset === 0 ? '#5046e5' : '#374151',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >This Week</button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >›</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1000 }}>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Planned Hours',  value: loading ? '—' : `${totalPlanned}h` },
              { label: 'Team Capacity',  value: `${totalCapacity}h` },
              { label: 'Utilization',    value: loading ? '—' : `${teamUtilPct}%` },
              { label: 'Active Members', value: loading ? '—' : `${activeMembers} / ${workload.length}` },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Workload card */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>Team Utilization</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                Planned hours from task assignments · {WEEKLY_CAPACITY}h capacity per person
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                Loading...
              </div>
            ) : workload.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No team members found.
              </div>
            ) : (
              workload.map((row, i) => {
                const pct      = Math.min((row.total_hours / WEEKLY_CAPACITY) * 100, 100)
                const capColor = capacityColor(row.total_hours)
                const isLast   = i === workload.length - 1
                const isOver   = row.total_hours > WEEKLY_CAPACITY

                return (
                  <div
                    key={row.member.user_id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 20,
                      padding: '20px 24px',
                      borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                    }}
                  >
                    {/* Person */}
                    <div style={{ width: 160, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: avatarColor(row.member.full_name),
                        color: 'white', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {avatarInitials(row.member.full_name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{row.member.full_name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1, textTransform: 'capitalize' }}>{row.member.role}</div>
                      </div>
                    </div>

                    {/* Task bars */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {row.tasks.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic', paddingTop: 6 }}>
                          No tasks scheduled this week
                        </div>
                      ) : (
                        <>
                          {row.tasks.map(task => {
                            const barPct   = Math.min((task.hours_in_week / WEEKLY_CAPACITY) * 100, 100)
                            const barColor = projectColor(task.project_id)
                            const showHrsInBar = barPct > 10

                            return (
                              <div key={task.task_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {/* Project name */}
                                <div
                                  onClick={() => router.push(`/projects/${task.project_id}`)}
                                  title={task.project_name}
                                  style={{
                                    width: 90, flexShrink: 0,
                                    fontSize: 11, color: '#6b7280', fontFamily: 'monospace',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#5046e5')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                                >
                                  {task.project_name}
                                </div>

                                {/* Bar */}
                                <div style={{ flex: 1, height: 14, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${Math.max(barPct, 2)}%`, height: '100%',
                                    background: barColor, borderRadius: 4,
                                    display: 'flex', alignItems: 'center', paddingLeft: 6,
                                  }}>
                                    {showHrsInBar && (
                                      <span style={{ fontSize: 10, color: 'white', fontFamily: 'monospace', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                        {task.hours_in_week}h
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Hours outside bar when bar is too narrow */}
                                {!showHrsInBar && (
                                  <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', flexShrink: 0, width: 28 }}>
                                    {task.hours_in_week}h
                                  </span>
                                )}

                                {/* Task title */}
                                <div
                                  onClick={() => router.push(`/projects/${task.project_id}/tasks/${task.task_id}`)}
                                  title={task.task_title}
                                  style={{
                                    width: 150, flexShrink: 0,
                                    fontSize: 11, color: '#9ca3af',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#5046e5')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                                >
                                  {task.task_title}
                                </div>
                              </div>
                            )
                          })}

                          {/* Thin total utilisation bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <div style={{ width: 90, flexShrink: 0, fontSize: 10, color: '#d1d5db', fontFamily: 'monospace', textAlign: 'right' }}>
                              total
                            </div>
                            <div style={{ flex: 1, height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                width: `${pct}%`, height: '100%',
                                background: capColor, borderRadius: 2,
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            <div style={{ width: showHrsInBarSpacer(row.tasks) ? 28 : 0, flexShrink: 0 }} />
                            <div style={{ width: 150, flexShrink: 0 }} />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Total hours */}
                    <div style={{ width: 70, flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: capColor, fontFamily: 'monospace' }}>
                        {row.total_hours}h{isOver ? ' ⚠' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>of {WEEKLY_CAPACITY}h</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            Hours are estimated from task assignments, evenly distributed across working days between each task's start and due date.
            Only tasks with a start date, due date, estimated hours, and at least one assignee are included.
          </div>

        </div>
      </div>
    </AppLayout>
  )
}

// Helper to align the total bar's spacer with task bars above it
function showHrsInBarSpacer(tasks: TaskAssignment[]) {
  return tasks.some(t => (t.hours_in_week / WEEKLY_CAPACITY) * 100 <= 10)
}
