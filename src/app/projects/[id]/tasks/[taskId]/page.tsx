'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Task = {
  id: string
  title: string
  description: string | null
  notes: string | null
  status: string
  priority: string | null
  start_date: string | null
  due_date: string | null
  estimated_hours: number | null
  project_id: string
  workspace_id: string
  created_at: string
}

type Project = {
  id: string
  name: string
  status: string
  loe_budget: number | null
  clients: { name: string } | { name: string }[] | null
}

type TimeEntry = {
  id: string
  hours: number
  entry_date: string
  description: string | null
  user_id: string
  user_name?: string
}

type ChecklistItem = {
  id: string
  title: string
  is_done: boolean
  position: number
}

type Comment = {
  id: string
  body: string
  user_id: string
  user_name: string
  created_at: string
}

type Assignee = {
  id: string
  user_id: string
  user_name: string
}

type Tag = {
  id: string
  label: string
}

type Member = {
  user_id: string
  user_name: string
}

// ── Styles ────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  fontSize: 13, color: '#1a1a2e', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
}
const inputEdit: React.CSSProperties = { ...inputBase, border: '1px solid #d1d5db', background: 'white' }
const inputView: React.CSSProperties = { ...inputBase, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'default', color: '#374151' }

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
}
const primaryBtn: React.CSSProperties = {
  background: '#5046e5', color: 'white', border: 'none',
  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const ghostBtn: React.CSSProperties = {
  background: 'white', color: '#374151', border: '1px solid #d1d5db',
  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const dangerBtn: React.CSSProperties = {
  background: 'white', color: '#dc2626', border: '1px solid #fca5a5',
  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const sectionCard: React.CSSProperties = {
  background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 16,
}
const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 16,
}

// ── Helpers ───────────────────────────────────────────────

function getClientName(clients: Project['clients']): string | null {
  if (!clients) return null
  if (Array.isArray(clients)) return clients[0]?.name || null
  return clients.name || null
}

function timeAgo(ts: string) {
  const diff  = Date.now() - new Date(ts).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function avatarColor(name: string) {
  const colors = ['#5046e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  return colors[(name || '').charCodeAt(0) % colors.length]
}

function avatarInitials(name: string) {
  return (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDuration(h: number, m: number) {
  const total = h + m / 60
  if (total <= 0) return ''
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const statusOptions = [
  { value: 'todo',        label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review',      label: 'Review' },
  { value: 'done',        label: 'Done' },
]

const priorityOptions = [
  { value: 'low',    label: '↓ Low',    color: '#6b7280' },
  { value: 'medium', label: '→ Medium', color: '#d97706' },
  { value: 'high',   label: '↑ High',   color: '#dc2626' },
]

function statusBadgeStyle(s: string): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    todo:        { bg: '#f3f4f6', color: '#374151' },
    in_progress: { bg: '#ede9fe', color: '#5046e5' },
    review:      { bg: '#fef9c3', color: '#b45309' },
    done:        { bg: '#dcfce7', color: '#16a34a' },
  }
  const c = map[s] || map.todo
  return { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color }
}

// ── Log Time Modal ────────────────────────────────────────

function LogTimeModal({ taskId, projectId, workspaceId, taskTitle, onClose, onSaved }: {
  taskId: string
  projectId: string
  workspaceId: string
  taskTitle: string
  onClose: () => void
  onSaved: (entry: TimeEntry) => void
}) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [hours,   setHours]   = useState(0)
  const [mins,    setMins]    = useState(30)
  const [date,    setDate]    = useState(today)
  const [desc,    setDesc]    = useState('')
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [userName, setUserName] = useState('')
  const [userId,   setUserId]   = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('full_name').eq('id', user.id).single().then(({ data }) => {
        setUserName(data?.full_name || 'You')
      })
    })
  }, [])

  const total = hours + mins / 60
  const preview = formatDuration(hours, mins)

  function setQuick(h: number, m: number) { setHours(h); setMins(m) }

  async function handleSubmit() {
    setError('')
    if (total <= 0) { setError('Please enter a time greater than 0.'); return }
    if (!desc.trim()) { setError('Please describe the work done.'); return }
    setSaving(true)
    const { data, error: err } = await supabase.from('time_entries').insert({
      project_id:   projectId,
      workspace_id: workspaceId,
      user_id:      userId,
      hours:        Math.round(total * 4) / 4, // round to nearest 0.25
      entry_date:   date,
      description:  desc.trim(),
    }).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    onSaved({ ...data, user_name: userName })
  }

  const quickBtnStyle: React.CSSProperties = {
    padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: '1px solid #e5e7eb', background: 'white',
    color: '#374151', fontFamily: 'inherit',
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Log Time</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{taskTitle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hours + Mins inputs */}
          <div>
            <label style={labelStyle}>Time Spent This Session</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <input
                  type="number" min="0" max="23" value={hours}
                  onChange={e => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  autoFocus
                  style={{ ...inputEdit, textAlign: 'center', fontSize: 20, fontWeight: 700, padding: '10px 8px' }}
                />
                <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>hrs</span>
              </div>
              <span style={{ fontSize: 20, color: '#d1d5db', fontWeight: 300 }}>:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <input
                  type="number" min="0" max="59" step="15" value={mins}
                  onChange={e => setMins(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ ...inputEdit, textAlign: 'center', fontSize: 20, fontWeight: 700, padding: '10px 8px' }}
                />
                <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>min</span>
              </div>
              {preview && (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#5046e5', minWidth: 50, textAlign: 'right' }}>= {preview}</span>
              )}
            </div>
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: '15m', h: 0, m: 15 }, { label: '30m', h: 0, m: 30 },
              { label: '1h',  h: 1, m: 0  }, { label: '1h 30m', h: 1, m: 30 },
              { label: '2h',  h: 2, m: 0  }, { label: '3h', h: 3, m: 0 },
              { label: '4h',  h: 4, m: 0  },
            ].map(p => (
              <button key={p.label} onClick={() => setQuick(p.h, p.m)} style={{
                ...quickBtnStyle,
                background: hours === p.h && mins === p.m ? '#ede9fe' : 'white',
                borderColor: hours === p.h && mins === p.m ? '#5046e5' : '#e5e7eb',
                color: hours === p.h && mins === p.m ? '#5046e5' : '#374151',
              }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputEdit} />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>What did you work on?</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder="Brief description of work completed this session..."
              style={{ ...inputEdit, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={handleSubmit} disabled={saving} style={primaryBtn}>
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          {preview && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#5046e5' }}>{preview}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────

export default function TaskDetailPage() {
  const supabase  = createClient()
  const params    = useParams()
  const router    = useRouter()
  const projectId = params.id as string
  const taskId    = params.taskId as string

  const [task,            setTask]            = useState<Task | null>(null)
  const [project,         setProject]         = useState<Project | null>(null)
  const [timeEntries,     setTimeEntries]     = useState<TimeEntry[]>([])
  const [checklist,       setChecklist]       = useState<ChecklistItem[]>([])
  const [comments,        setComments]        = useState<Comment[]>([])
  const [assignees,       setAssignees]       = useState<Assignee[]>([])
  const [tags,            setTags]            = useState<Tag[]>([])
  const [members,         setMembers]         = useState<Member[]>([])
  const [workspaceId,     setWorkspaceId]     = useState('')
  const [currentUserId,   setCurrentUserId]   = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [loading,         setLoading]         = useState(true)
  const [showLogTime,     setShowLogTime]     = useState(false)

  // View / Edit mode
  const [mode, setMode] = useState<'view' | 'edit'>('edit')

  // Editable fields
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [notes,       setNotes]       = useState('')
  const [status,      setStatus]      = useState('')
  const [priority,    setPriority]    = useState('')
  const [startDate,   setStartDate]   = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [estHours,    setEstHours]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  // Checklist
  const [newCheckItem,     setNewCheckItem]     = useState('')
  const [editingCheckId,   setEditingCheckId]   = useState<string | null>(null)
  const [editingCheckText, setEditingCheckText] = useState('')

  // Comments
  const [commentBody,    setCommentBody]    = useState('')
  const [postingComment, setPostingComment] = useState(false)

  // Tags
  const [newTag,       setNewTag]       = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadAll() }, [taskId])
  useEffect(() => { if (showTagInput && tagInputRef.current) tagInputRef.current.focus() }, [showTagInput])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data: member } = await supabase
      .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
    if (!member) return
    setWorkspaceId(member.workspace_id)

    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    setCurrentUserName(profile?.full_name || 'You')

    const { data: taskData } = await supabase
      .from('tasks').select('*').eq('id', taskId).single()
    if (!taskData) { setLoading(false); return }
    setTask(taskData as Task)
    resetFields(taskData as Task)

    const { data: projData } = await supabase
      .from('projects').select('id, name, status, loe_budget, clients(name)').eq('id', projectId).single()
    setProject(projData as unknown as Project)

    const { data: wsMembers } = await supabase
      .from('workspace_members').select('user_id').eq('workspace_id', member.workspace_id)
    const userIds = (wsMembers || []).map((m: any) => m.user_id)
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] }
    const getName = (uid: string) => profiles?.find((p: any) => p.id === uid)?.full_name || 'Unknown'

    setMembers((wsMembers || []).map((m: any) => ({ user_id: m.user_id, user_name: getName(m.user_id) })))

    const { data: timeData } = await supabase
      .from('time_entries').select('id, hours, entry_date, description, user_id')
      .eq('project_id', projectId).order('entry_date', { ascending: false })
    setTimeEntries((timeData || []).map((e: any) => ({ ...e, user_name: getName(e.user_id) })))

    const { data: clData } = await supabase
      .from('task_checklist_items').select('id, title, is_done, position')
      .eq('task_id', taskId).order('position', { ascending: true })
    setChecklist((clData as ChecklistItem[]) || [])

    const { data: cmData } = await supabase
      .from('task_comments').select('id, body, user_id, created_at')
      .eq('task_id', taskId).order('created_at', { ascending: true })
    setComments((cmData || []).map((c: any) => ({ ...c, user_name: getName(c.user_id) })))

    const { data: asnData } = await supabase
      .from('task_assignees').select('id, user_id').eq('task_id', taskId)
    setAssignees((asnData || []).map((a: any) => ({ ...a, user_name: getName(a.user_id) })))

    const { data: tagData } = await supabase
      .from('task_tags').select('id, label').eq('task_id', taskId).order('created_at', { ascending: true })
    setTags((tagData as Tag[]) || [])

    setLoading(false)
  }

  function resetFields(t: Task) {
    setTitle(t.title)
    setDescription(t.description || '')
    setNotes(t.notes || '')
    setStatus(t.status)
    setPriority(t.priority || 'medium')
    setStartDate(t.start_date || '')
    setDueDate(t.due_date || '')
    setEstHours(t.estimated_hours?.toString() || '')
  }

  function cancelEdit() {
    if (task) resetFields(task)
    setMode('view')
  }

  async function saveTask() {
    if (!task) return
    setSaving(true)
    const { data: updated } = await supabase.from('tasks').update({
      title, description: description || null, notes: notes || null,
      status, priority,
      start_date: startDate || null, due_date: dueDate || null,
      estimated_hours: estHours ? parseFloat(estHours) : null,
    }).eq('id', task.id).select().single()
    setSaving(false)
    if (updated) { setTask(updated as Task); resetFields(updated as Task) }
    setMode('view')
  }

  async function deleteTask() {
    if (!confirm('Delete this task? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', taskId)
    router.push(`/projects/${projectId}`)
  }

  // ── Checklist ──
  async function addCheckItem() {
    if (!newCheckItem.trim()) return
    const { data } = await supabase.from('task_checklist_items').insert({
      task_id: taskId, workspace_id: workspaceId,
      title: newCheckItem.trim(), is_done: false, position: checklist.length,
    }).select().single()
    if (data) setChecklist(prev => [...prev, data as ChecklistItem])
    setNewCheckItem('')
  }

  async function toggleCheckItem(item: ChecklistItem) {
    await supabase.from('task_checklist_items').update({ is_done: !item.is_done }).eq('id', item.id)
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, is_done: !c.is_done } : c))
  }

  async function deleteCheckItem(id: string) {
    await supabase.from('task_checklist_items').delete().eq('id', id)
    setChecklist(prev => prev.filter(c => c.id !== id))
  }

  async function saveCheckItemEdit(item: ChecklistItem) {
    if (!editingCheckText.trim()) { setEditingCheckId(null); return }
    await supabase.from('task_checklist_items').update({ title: editingCheckText.trim() }).eq('id', item.id)
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, title: editingCheckText.trim() } : c))
    setEditingCheckId(null)
  }

  // ── Comments ──
  async function postComment() {
    if (!commentBody.trim()) return
    setPostingComment(true)
    const { data } = await supabase.from('task_comments').insert({
      task_id: taskId, workspace_id: workspaceId,
      user_id: currentUserId, body: commentBody.trim(),
    }).select().single()
    if (data) setComments(prev => [...prev, { ...data, user_name: currentUserName }])
    setCommentBody('')
    setPostingComment(false)
  }

  async function deleteComment(id: string) {
    await supabase.from('task_comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  // ── Assignees ──
  async function toggleAssignee(member: Member) {
    const existing = assignees.find(a => a.user_id === member.user_id)
    if (existing) {
      await supabase.from('task_assignees').delete().eq('id', existing.id)
      setAssignees(prev => prev.filter(a => a.user_id !== member.user_id))
    } else {
      const { data } = await supabase.from('task_assignees').insert({
        task_id: taskId, workspace_id: workspaceId, user_id: member.user_id,
      }).select().single()
      if (data) setAssignees(prev => [...prev, { ...data, user_name: member.user_name }])
    }
  }

  // ── Tags ──
  async function addTag() {
    const label = newTag.trim()
    if (!label || tags.find(t => t.label === label)) { setNewTag(''); setShowTagInput(false); return }
    const { data } = await supabase.from('task_tags').insert({
      task_id: taskId, workspace_id: workspaceId, label,
    }).select().single()
    if (data) setTags(prev => [...prev, data as Tag])
    setNewTag('')
    setShowTagInput(false)
  }

  async function removeTag(id: string) {
    await supabase.from('task_tags').delete().eq('id', id)
    setTags(prev => prev.filter(t => t.id !== id))
  }

  // ── Render ────────────────────────────────────────────────

  if (loading) return <AppLayout><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</div></AppLayout>
  if (!task)   return <AppLayout><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Task not found.</div></AppLayout>

  const isEdit        = mode === 'edit'
  const totalLogged   = timeEntries.reduce((sum, e) => sum + e.hours, 0)
  const estHoursNum   = parseFloat(estHours) || 0
  const remaining     = estHoursNum > 0 ? estHoursNum - totalLogged : null
  const timePct       = estHoursNum > 0 ? Math.min(Math.round((totalLogged / estHoursNum) * 100), 100) : 0
  const timeBarColor  = timePct >= 100 ? '#dc2626' : timePct >= 75 ? '#d97706' : '#5046e5'
  const clDone        = checklist.filter(c => c.is_done).length
  const clientName    = project ? getClientName(project.clients) : null
  const radius        = 20
  const circumference = 2 * Math.PI * radius
  const strokeOffset  = circumference - (timePct / 100) * circumference

  const fieldStyle = (extra?: React.CSSProperties): React.CSSProperties => ({ ...(isEdit ? inputEdit : inputView), ...extra })

  return (
    <AppLayout>
      {/* ── Top bar ── */}
      <div style={{ height: 56, background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span onClick={() => router.push('/projects')} style={{ fontSize: 13, color: '#9ca3af', cursor: 'pointer', fontWeight: 500 }}>Projects</span>
          <span style={{ color: '#d1d5db' }}>{'>'}</span>
          <span onClick={() => router.push(`/projects/${projectId}`)} style={{ fontSize: 13, color: '#9ca3af', cursor: 'pointer', fontWeight: 500 }}>{project?.name || 'Project'}</span>
          <span style={{ color: '#d1d5db' }}>{'>'}</span>
          <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 600 }}>{task.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View / Edit toggle */}
          <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['view', 'edit'] as const).map(m => (
              <button key={m} onClick={() => m === 'view' && isEdit ? cancelEdit() : setMode(m)} style={{
                padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#1a1a2e' : '#9ca3af',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.12s',
              }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          {/* Log Time button */}
          <button
            onClick={() => setShowLogTime(true)}
            style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ◷ Log Time
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, maxWidth: 1100, alignItems: 'start' }}>

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* Title + status */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <div
                  onClick={() => { if (isEdit) setStatus(status === 'done' ? 'todo' : 'done') }}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    border: status === 'done' ? 'none' : '2px solid #d1d5db',
                    background: status === 'done' ? '#16a34a' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isEdit ? 'pointer' : 'default', fontSize: 11, color: 'white',
                  }}
                >
                  {status === 'done' && '✓'}
                </div>
                <input
                  value={title}
                  onChange={e => isEdit && setTitle(e.target.value)}
                  readOnly={!isEdit}
                  style={{
                    flex: 1, fontSize: 22, fontWeight: 800,
                    border: 'none', outline: 'none', background: 'transparent',
                    fontFamily: 'inherit', padding: 0,
                    textDecoration: status === 'done' ? 'line-through' : 'none',
                    color: status === 'done' ? '#9ca3af' : '#1a1a2e',
                    cursor: isEdit ? 'text' : 'default',
                  }}
                  placeholder="Task name..."
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 34 }}>
                <span style={statusBadgeStyle(status)}>{statusOptions.find(s => s.value === status)?.label || status}</span>
                <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
                  Created {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Core Details */}
            <div style={sectionCard}>
              <div style={sectionTitle}>Core Details</div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Description</label>
                <textarea value={description} onChange={e => isEdit && setDescription(e.target.value)} readOnly={!isEdit} rows={3}
                  placeholder={isEdit ? 'Describe the task...' : '—'}
                  style={{ ...fieldStyle({ resize: isEdit ? 'vertical' : 'none' }), lineHeight: 1.6 }} />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {statusOptions.map(opt => (
                    <button key={opt.value} onClick={() => isEdit && setStatus(opt.value)} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      fontFamily: 'inherit', border: '1.5px solid',
                      cursor: isEdit ? 'pointer' : 'default',
                      borderColor: status === opt.value ? '#5046e5' : '#e5e7eb',
                      background: status === opt.value ? '#ede9fe' : (isEdit ? 'white' : '#f9fafb'),
                      color: status === opt.value ? '#5046e5' : '#6b7280',
                      opacity: !isEdit && status !== opt.value ? 0.5 : 1,
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dates & Time */}
            <div style={sectionCard}>
              <div style={sectionTitle}>Dates & Time Estimate</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" value={startDate} onChange={e => isEdit && setStartDate(e.target.value)} readOnly={!isEdit} style={fieldStyle()} />
                </div>
                <div>
                  <label style={labelStyle}>Due Date</label>
                  <input type="date" value={dueDate} onChange={e => isEdit && setDueDate(e.target.value)} readOnly={!isEdit} style={fieldStyle()} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Estimated Hours</label>
                  <input type="number" min="0" step="0.5" value={estHours} onChange={e => isEdit && setEstHours(e.target.value)} readOnly={!isEdit} placeholder="e.g. 4" style={fieldStyle()} />
                </div>
                <div>
                  <label style={labelStyle}>Hours Logged</label>
                  <input type="number" value={totalLogged.toFixed(1)} readOnly style={{ ...inputView, color: '#5046e5', fontWeight: 600 }} />
                </div>
                <div>
                  <label style={labelStyle}>Hours Remaining</label>
                  <input type="number" value={remaining !== null ? remaining.toFixed(1) : ''} placeholder="—" readOnly
                    style={{ ...inputView, color: remaining !== null && remaining < 0 ? '#dc2626' : '#d97706', fontWeight: 600 }} />
                </div>
              </div>
            </div>

            {/* Priority */}
            <div style={sectionCard}>
              <div style={sectionTitle}>Priority</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {priorityOptions.map(opt => (
                  <button key={opt.value} onClick={() => isEdit && setPriority(opt.value)} style={{
                    padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    fontFamily: 'inherit', border: '1.5px solid',
                    cursor: isEdit ? 'pointer' : 'default',
                    borderColor: priority === opt.value ? opt.color : '#e5e7eb',
                    background: priority === opt.value ? opt.color + '18' : (isEdit ? 'white' : '#f9fafb'),
                    color: priority === opt.value ? opt.color : '#6b7280',
                    opacity: !isEdit && priority !== opt.value ? 0.5 : 1,
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Assignees */}
            <div style={sectionCard}>
              <div style={sectionTitle}>Assignees</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {members.map(member => {
                  const isAssigned = assignees.some(a => a.user_id === member.user_id)
                  const color = avatarColor(member.user_name)
                  if (!isEdit && !isAssigned) return null
                  return (
                    <button key={member.user_id} onClick={() => isEdit && toggleAssignee(member)} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px 6px 6px', borderRadius: 20,
                      cursor: isEdit ? 'pointer' : 'default',
                      border: '1.5px solid', fontFamily: 'inherit',
                      borderColor: isAssigned ? color : '#e5e7eb',
                      background: isAssigned ? color + '15' : (isEdit ? 'white' : '#f9fafb'),
                    }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: isAssigned ? color : '#e5e7eb', color: isAssigned ? 'white' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                        {avatarInitials(member.user_name)}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: isAssigned ? color : '#6b7280' }}>{member.user_name}</span>
                      {isAssigned && isEdit && <span style={{ fontSize: 10, color }}>✓</span>}
                    </button>
                  )
                })}
                {!isEdit && assignees.length === 0 && <span style={{ fontSize: 12, color: '#9ca3af' }}>No assignees</span>}
                {isEdit && members.length === 0 && <span style={{ fontSize: 12, color: '#9ca3af' }}>No team members in workspace yet.</span>}
              </div>
            </div>

            {/* Tags */}
            <div style={sectionCard}>
              <div style={sectionTitle}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {tags.map(tag => (
                  <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ede9fe', color: '#5046e5', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {tag.label}
                    {isEdit && <button onClick={() => removeTag(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5046e5', fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>}
                  </div>
                ))}
                {!isEdit && tags.length === 0 && <span style={{ fontSize: 12, color: '#9ca3af' }}>No tags</span>}
                {isEdit && (showTagInput ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input ref={tagInputRef} value={newTag} onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') { setShowTagInput(false); setNewTag('') } }}
                      placeholder="Tag name..." style={{ ...inputEdit, width: 120, padding: '4px 10px', fontSize: 12 }} />
                    <button onClick={addTag} style={{ ...primaryBtn, padding: '4px 12px', fontSize: 12 }}>Add</button>
                    <button onClick={() => { setShowTagInput(false); setNewTag('') }} style={{ ...ghostBtn, padding: '4px 10px', fontSize: 12 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setShowTagInput(true)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px dashed #d1d5db', background: 'white', color: '#9ca3af', fontFamily: 'inherit' }}>+ Add tag</button>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div style={sectionCard}>
              <div style={sectionTitle}>Additional Notes</div>
              <textarea value={notes} onChange={e => isEdit && setNotes(e.target.value)} readOnly={!isEdit} rows={4}
                placeholder={isEdit ? 'Any additional context or notes...' : '—'}
                style={{ ...fieldStyle({ resize: isEdit ? 'vertical' : 'none' }), lineHeight: 1.6 }} />
            </div>

            {/* Form actions — edit mode only */}
            {isEdit && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <button onClick={deleteTask} disabled={deleting} style={dangerBtn}>{deleting ? 'Deleting...' : '🗑 Delete Task'}</button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={cancelEdit} style={ghostBtn}>Cancel</button>
                  <button onClick={saveTask} disabled={saving} style={primaryBtn}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </div>
            )}

            {/* Activity & Comments */}
            <div style={sectionCard}>
              <div style={sectionTitle}>Activity & Comments</div>
              {comments.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>No comments yet.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: comments.length > 0 ? 20 : 0 }}>
                {comments.map(comment => {
                  const color = avatarColor(comment.user_name)
                  const isMe  = comment.user_id === currentUserId
                  return (
                    <div key={comment.id} style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                        {avatarInitials(comment.user_name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{comment.user_name}</span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(comment.created_at)}</span>
                          </div>
                          {isMe && <button onClick={() => deleteComment(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: 0 }}>✕</button>}
                        </div>
                        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>{comment.body}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: avatarColor(currentUserName), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                  {avatarInitials(currentUserName)}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)}
                    onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') postComment() }}
                    rows={2} placeholder="Add a comment... (Ctrl+Enter to post)"
                    style={{ ...inputEdit, resize: 'none', lineHeight: 1.6 }} />
                  {commentBody.trim() && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <button onClick={() => setCommentBody('')} style={ghostBtn}>Cancel</button>
                      <button onClick={postComment} disabled={postingComment} style={primaryBtn}>{postingComment ? 'Posting...' : 'Post Comment'}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Time Progress */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Time Progress</span>
                <button onClick={() => setShowLogTime(true)} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace' }}>+ Log</button>
              </div>
              {estHoursNum > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <svg width="60" height="60" viewBox="0 0 52 52">
                        <circle cx="26" cy="26" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="5" />
                        <circle cx="26" cy="26" r={radius} fill="none" stroke={timeBarColor} strokeWidth="5"
                          strokeDasharray={circumference} strokeDashoffset={strokeOffset}
                          strokeLinecap="round" transform="rotate(-90 26 26)"
                          style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: timeBarColor }}>{timePct}%</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{totalLogged.toFixed(1)}h of {estHoursNum}h used</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'Logged',    value: `${totalLogged.toFixed(1)}h`, color: '#5046e5' },
                      { label: 'Remaining', value: remaining !== null ? `${remaining.toFixed(1)}h` : '—', color: remaining !== null && remaining < 0 ? '#dc2626' : '#d97706' },
                      { label: 'Estimate',  value: `${estHoursNum}h`, color: '#9ca3af' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${timePct}%`, background: timeBarColor, borderRadius: 3 }} />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Set estimated hours to track time progress.</div>
              )}
            </div>

            {/* Time Entries */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between' }}>
                <span>Time Entries</span>
                <span style={{ color: '#1a1a2e', textTransform: 'none', letterSpacing: 0 }}>{timeEntries.length}</span>
              </div>
              {timeEntries.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>No time logged yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {timeEntries.slice(0, 5).map(entry => {
                    const color = avatarColor(entry.user_name || '')
                    return (
                      <div key={entry.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                          {avatarInitials(entry.user_name || '')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#5046e5' }}>{entry.hours}h</span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>
                              {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {entry.user_name?.split(' ')[0]}
                            </span>
                          </div>
                          {entry.description && (
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.description}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between' }}>
                <span>Checklist</span>
                <span style={{ color: '#1a1a2e', textTransform: 'none', letterSpacing: 0 }}>{clDone} / {checklist.length}</span>
              </div>
              {checklist.length > 0 && (
                <div style={{ height: 4, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', width: `${Math.round((clDone / checklist.length) * 100)}%`, background: '#16a34a', borderRadius: 3 }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {checklist.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div onClick={() => toggleCheckItem(item)} style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: item.is_done ? 'none' : '1.5px solid #d1d5db', background: item.is_done ? '#16a34a' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 9, color: 'white' }}>
                      {item.is_done && '✓'}
                    </div>
                    {editingCheckId === item.id ? (
                      <input value={editingCheckText} onChange={e => setEditingCheckText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCheckItemEdit(item); if (e.key === 'Escape') setEditingCheckId(null) }}
                        onBlur={() => saveCheckItemEdit(item)} autoFocus
                        style={{ ...inputEdit, flex: 1, padding: '3px 8px', fontSize: 12 }} />
                    ) : (
                      <span onClick={() => { setEditingCheckId(item.id); setEditingCheckText(item.title) }}
                        style={{ flex: 1, fontSize: 12, color: item.is_done ? '#9ca3af' : '#1a1a2e', textDecoration: item.is_done ? 'line-through' : 'none', cursor: 'pointer' }}>
                        {item.title}
                      </span>
                    )}
                    <button onClick={() => deleteCheckItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCheckItem() }}
                  placeholder="Add checklist item..." style={{ ...inputEdit, flex: 1, padding: '6px 10px', fontSize: 12 }} />
                <button onClick={addCheckItem} style={{ ...ghostBtn, padding: '6px 12px', fontSize: 12 }}>+ Add</button>
              </div>
            </div>

            {/* Project context */}
            {project && (
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={sectionTitle}>Project</div>
                <div onClick={() => router.push(`/projects/${projectId}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>◫</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{project.name}</div>
                    {clientName && <div style={{ fontSize: 11, color: '#9ca3af' }}>{clientName}</div>}
                  </div>
                </div>
                {project.loe_budget && (
                  <div style={{ paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                      <span>Project Status</span>
                      <span style={{ color: '#5046e5', fontWeight: 600 }}>{project.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Log Time Modal ── */}
      {showLogTime && (
        <LogTimeModal
          taskId={taskId}
          projectId={projectId}
          workspaceId={workspaceId}
          taskTitle={task.title}
          onClose={() => setShowLogTime(false)}
          onSaved={(entry) => {
            setTimeEntries(prev => [entry, ...prev])
            setShowLogTime(false)
          }}
        />
      )}

    </AppLayout>
  )
}
