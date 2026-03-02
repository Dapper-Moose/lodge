'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Task = {
  id: string
  title: string
  status: string
  priority: string | null
  due_date: string | null
  estimated_hours: number | null
  project_id: string
  project_name?: string
}

type GroupMode = 'due_date' | 'status' | 'project' | 'priority'
type ShowMode  = 'active' | 'all'

function priorityInfo(priority: string | null) {
  const map: Record<string, { label: string; color: string; order: number }> = {
    high:   { label: 'High',   color: '#dc2626', order: 0 },
    medium: { label: 'Medium', color: '#d97706', order: 1 },
    low:    { label: 'Low',    color: '#6b7280', order: 2 },
  }
  return map[priority || 'medium'] || map.medium
}

function statusInfo(status: string) {
  const map: Record<string, { label: string; bg: string; color: string; order: number }> = {
    in_progress: { label: 'In Progress', bg: '#ede9fe', color: '#5046e5', order: 0 },
    review:      { label: 'Review',      bg: '#fef9c3', color: '#b45309', order: 1 },
    todo:        { label: 'To Do',       bg: '#f3f4f6', color: '#374151', order: 2 },
    done:        { label: 'Done',        bg: '#dcfce7', color: '#16a34a', order: 3 },
  }
  return map[status] || map.todo
}

function dueDateGroup(dueDate: string | null): { key: string; label: string; order: number } {
  if (!dueDate) return { key: 'no_date', label: 'No Due Date', order: 99 }
  const due  = new Date(dueDate + 'T12:00:00')
  const now  = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0)  return { key: 'overdue',    label: 'Overdue',       order: 0 }
  if (diffDays === 0) return { key: 'today',      label: 'Due Today',     order: 1 }
  if (diffDays === 1) return { key: 'tomorrow',   label: 'Due Tomorrow',  order: 2 }
  if (diffDays <= 7)  return { key: 'this_week',  label: 'This Week',     order: 3 }
  if (diffDays <= 14) return { key: 'next_week',  label: 'Next Week',     order: 4 }
  return { key: 'later', label: 'Later', order: 5 }
}

function formatDueDate(dueDate: string | null) {
  if (!dueDate) return null
  return new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === 'done') return false
  return new Date(dueDate + 'T12:00:00') < new Date()
}

export default function MyTasksPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [tasks,     setTasks]     = useState<Task[]>([])
  const [loading,   setLoading]   = useState(true)
  const [groupMode, setGroupMode] = useState<GroupMode>('due_date')
  const [showMode,  setShowMode]  = useState<ShowMode>('active')

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get tasks assigned to this user
    const { data: assigned } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', user.id)

    const taskIds = (assigned || []).map((a: any) => a.task_id)

    if (taskIds.length === 0) { setTasks([]); setLoading(false); return }

    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, estimated_hours, project_id')
      .in('id', taskIds)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (!taskData || taskData.length === 0) { setTasks([]); setLoading(false); return }

    // Load project names
    const projectIds = [...new Set(taskData.map((t: any) => t.project_id))]
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds)

    const getProjectName = (id: string) =>
      projects?.find((p: any) => p.id === id)?.name || 'Unknown Project'

    setTasks(taskData.map((t: any) => ({ ...t, project_name: getProjectName(t.project_id) })))
    setLoading(false)
  }

  async function toggleTask(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  // Filter by show mode
  const visibleTasks = showMode === 'active'
    ? tasks.filter(t => t.status !== 'done')
    : tasks

  // Build groups based on groupMode
  function buildGroups(): { key: string; label: string; order: number; items: Task[] }[] {
    const groupMap = new Map<string, { key: string; label: string; order: number; items: Task[] }>()

    visibleTasks.forEach(task => {
      let key: string, label: string, order: number

      if (groupMode === 'due_date') {
        const g = dueDateGroup(task.due_date)
        key = g.key; label = g.label; order = g.order
      } else if (groupMode === 'status') {
        const s = statusInfo(task.status)
        key = task.status; label = s.label; order = s.order
      } else if (groupMode === 'project') {
        key = task.project_id; label = task.project_name || 'Unknown'; order = 0
      } else {
        const p = priorityInfo(task.priority)
        key = task.priority || 'medium'; label = p.label; order = p.order
      }

      if (!groupMap.has(key)) groupMap.set(key, { key, label, order, items: [] })
      groupMap.get(key)!.items.push(task)
    })

    return Array.from(groupMap.values()).sort((a, b) => a.order - b.order)
  }

  const groups = buildGroups()

  const groupModeOptions: { value: GroupMode; label: string }[] = [
    { value: 'due_date',  label: 'By Due Date' },
    { value: 'status',    label: 'By Status'   },
    { value: 'project',   label: 'By Project'  },
    { value: 'priority',  label: 'By Priority' },
  ]

  function groupHeaderColor(key: string): string {
    if (groupMode === 'due_date') {
      if (key === 'overdue')   return '#dc2626'
      if (key === 'today')     return '#d97706'
      if (key === 'tomorrow')  return '#5046e5'
    }
    if (groupMode === 'status') return statusInfo(key).color
    if (groupMode === 'priority') return priorityInfo(key).color
    return '#9ca3af'
  }

  return (
    <AppLayout>
      {/* Top bar */}
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>My Tasks</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
            {visibleTasks.length} {showMode === 'active' ? 'active' : ''} task{visibleTasks.length !== 1 ? 's' : ''} assigned to you
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Active / All toggle */}
          <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['active', 'all'] as const).map(m => (
              <button
                key={m}
                onClick={() => setShowMode(m)}
                style={{
                  padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  background: showMode === m ? 'white' : 'transparent',
                  color: showMode === m ? '#1a1a2e' : '#9ca3af',
                  boxShadow: showMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.12s',
                }}
              >
                {m === 'active' ? 'Active' : 'All'}
              </button>
            ))}
          </div>

          {/* Group mode selector */}
          <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: 3, gap: 2 }}>
            {groupModeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGroupMode(opt.value)}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  background: groupMode === opt.value ? 'white' : 'transparent',
                  color: groupMode === opt.value ? '#5046e5' : '#9ca3af',
                  boxShadow: groupMode === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.12s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9ca3af', fontSize: 13 }}>
            Loading...
          </div>
        ) : visibleTasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <div style={{ fontSize: 32 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>
              {showMode === 'active' ? 'No active tasks' : 'No tasks assigned to you'}
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>
              {showMode === 'active' ? 'All caught up! Switch to "All" to see completed tasks.' : 'Tasks assigned to you on any project will appear here.'}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {groups.map(group => (
              <div key={group.key}>
                {/* Group header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: groupHeaderColor(group.key),
                  }}>
                    {group.label}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'white',
                    background: groupHeaderColor(group.key),
                    padding: '1px 7px', borderRadius: 20,
                    opacity: 0.85,
                  }}>
                    {group.items.length}
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                </div>

                {/* Task rows */}
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  {group.items.map((task, i) => {
                    const pi      = priorityInfo(task.priority)
                    const si      = statusInfo(task.status)
                    const isDone  = task.status === 'done'
                    const overdue = isOverdue(task.due_date, task.status)
                    const dueStr  = formatDueDate(task.due_date)

                    return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '13px 20px',
                          borderBottom: i < group.items.length - 1 ? '1px solid #f3f4f6' : 'none',
                          background: 'white', cursor: 'pointer',
                          opacity: isDone ? 0.6 : 1,
                          transition: 'background 0.1s',
                        }}
                        onClick={() => router.push(`/projects/${task.project_id}/tasks/${task.id}`)}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >
                        {/* Checkbox */}
                        <div
                          onClick={e => { e.stopPropagation(); toggleTask(task) }}
                          style={{
                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                            border: isDone ? 'none' : '1.5px solid #d1d5db',
                            background: isDone ? '#16a34a' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: 10, color: 'white',
                          }}
                        >
                          {isDone && '✓'}
                        </div>

                        {/* Title + project */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 500,
                            color: isDone ? '#9ca3af' : '#1a1a2e',
                            textDecoration: isDone ? 'line-through' : 'none',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                            {task.project_name}
                          </div>
                        </div>

                        {/* Meta */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {/* Status badge — only show if not grouping by status */}
                          {groupMode !== 'status' && (
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                              background: si.bg, color: si.color,
                            }}>
                              {si.label}
                            </span>
                          )}

                          {/* Due date */}
                          {dueStr && (
                            <span style={{
                              fontSize: 11, fontWeight: overdue ? 600 : 400,
                              color: overdue ? '#dc2626' : '#9ca3af',
                              display: 'flex', alignItems: 'center', gap: 3,
                            }}>
                              {overdue && '⚠'} {dueStr}
                            </span>
                          )}

                          {/* Estimated hours */}
                          {task.estimated_hours && (
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>
                              {task.estimated_hours}h est.
                            </span>
                          )}

                          {/* Priority badge — only show if not grouping by priority */}
                          {groupMode !== 'priority' && (
                            <span style={{
                              fontSize: 11, fontWeight: 600, color: pi.color,
                              background: '#f3f4f6', padding: '2px 8px', borderRadius: 20,
                            }}>
                              {pi.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
