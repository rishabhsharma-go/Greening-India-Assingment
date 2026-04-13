import { useState, FormEvent, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Loader2,
  AlertCircle,
  X,
  Calendar,
  Flag,
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
  Trash2,
  ArrowUpDown,
  Search,
  ChevronDown,
} from 'lucide-react'
import { getProjectWithTasks, getProjectStats, getProjectTasks, createTask, updateTask, deleteTask, getUsers } from '../../api/projects'
import { useAuthStore } from '../../store/auth'
import type { Task, ProjectStats, User } from '../../types'

type TaskStatus = 'todo' | 'in_progress' | 'done'
type TaskPriority = 'low' | 'medium' | 'high'
type SortField = 'none' | 'priority' | 'due_date' | 'title'

interface Column {
  id: TaskStatus
  title: string
  icon: typeof Circle
  color: string
  headerBg: string
  dot: string
}

const COLUMNS: Column[] = [
  { id: 'todo',        title: 'To Do',       icon: Circle,       color: 'text-slate-500', headerBg: 'bg-slate-100',  dot: 'bg-slate-400' },
  { id: 'in_progress', title: 'In Progress',  icon: Clock,        color: 'text-blue-500',  headerBg: 'bg-blue-50',    dot: 'bg-blue-500' },
  { id: 'done',        title: 'Done',         icon: CheckCircle2, color: 'text-green-500', headerBg: 'bg-green-50',   dot: 'bg-green-500' },
]

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low:    'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-red-100   text-red-700',
}

function sortTasks(tasks: Task[], field: SortField): Task[] {
  if (field === 'none') return tasks
  return [...tasks].sort((a, b) => {
    if (field === 'priority') {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    }
    if (field === 'due_date') {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    if (field === 'title') {
      return a.title.localeCompare(b.title)
    }
    return 0
  })
}

// ── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  overlay = false,
  onEdit,
  assigneeName,
}: {
  task: Task
  overlay?: boolean
  onEdit?: (t: Task) => void
  assigneeName?: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !overlay ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-xl border border-slate-100 p-3.5 group select-none
        ${overlay
          ? 'shadow-xl rotate-1 cursor-grabbing'
          : 'cursor-grab hover:shadow-md hover:border-slate-200 transition-all'
        }`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{task.title}</p>
        {!overlay && onEdit && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onEdit(task) }}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${PRIORITY_STYLES[task.priority]}`}>
          <Flag className="w-2.5 h-2.5" />
          {task.priority}
        </span>
        {task.due_date && (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <Calendar className="w-3 h-3" />
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Assignee */}
      {assigneeName && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-50">
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-blue-600">{assigneeName.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium truncate">{assigneeName}</span>
        </div>
      )}
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  userMap,
  sortField,
  onSortChange,
}: {
  column: Column
  tasks: Task[]
  onAddTask: (status: TaskStatus) => void
  onEditTask: (t: Task) => void
  userMap: Record<string, string>
  sortField: SortField
  onSortChange: (f: SortField) => void
}) {
  const Icon = column.icon
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [showSortMenu, setShowSortMenu] = useState(false)

  const sortedTasks = sortTasks(tasks, sortField)

  return (
    <div className="flex flex-col min-w-0">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${column.headerBg} border border-slate-200 border-b-0`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${column.dot}`} />
          <Icon className={`w-4 h-4 ${column.color}`} />
          <span className="text-sm font-bold text-slate-700">{column.title}</span>
          <span className="text-xs bg-white text-slate-500 rounded-full px-2 py-0.5 font-semibold border border-slate-200">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Sort button */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(s => !s)}
              className={`p-1 rounded-lg transition-colors ${sortField !== 'none' ? 'text-blue-500 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/70'}`}
              title="Sort tasks"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden">
                {(['none', 'priority', 'due_date', 'title'] as SortField[]).map(f => (
                  <button
                    key={f}
                    onClick={() => { onSortChange(f); setShowSortMenu(false) }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors
                      ${sortField === f ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {f === 'none' ? 'Default' : f === 'due_date' ? 'Due Date' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {column.id === 'todo' && (
            <button
              onClick={() => onAddTask(column.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/70 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Droppable task list */}
      <div
        ref={setNodeRef}
        className={`flex-1 border border-slate-200 rounded-b-xl p-2 min-h-[420px] transition-colors
          ${isOver ? 'bg-blue-50/60' : 'bg-slate-50/50'}`}
      >
        <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sortedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                assigneeName={task.assignee_id ? userMap[task.assignee_id] : undefined}
              />
            ))}
          </div>
        </SortableContext>
        {tasks.length === 0 && (
          <div
            onClick={column.id === 'todo' ? () => onAddTask(column.id) : undefined}
            className={`flex flex-col items-center justify-center h-32 text-center ${column.id === 'todo' ? 'cursor-pointer group' : ''}`}
          >
            <p className="text-xs text-slate-300 group-hover:text-slate-400 transition-colors">Drop tasks here</p>
            {column.id === 'todo' && (
              <button className="mt-1 text-xs text-blue-400 hover:text-blue-500">+ Add task</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Searchable Assignee Picker ────────────────────────────────────────────────

function AssigneePicker({
  value,
  onChange,
  users,
  currentUserId,
}: {
  value: string
  onChange: (id: string) => void
  users: User[]
  currentUserId: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Current user first, then alphabetical
  const sorted = [
    ...users.filter(u => u.id === currentUserId),
    ...users.filter(u => u.id !== currentUserId).sort((a, b) => a.name.localeCompare(b.name)),
  ]
  const filtered = sorted.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedUser = users.find(u => u.id === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none hover:border-blue-400 transition-all"
      >
        <span className={selectedUser ? 'text-slate-800' : 'text-slate-400'}>
          {selectedUser ? selectedUser.name : 'Unassigned'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {/* Unassigned option */}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
                ${!value ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-[9px] text-slate-400">—</span>
              </div>
              Unassigned
            </button>

            {filtered.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => { onChange(u.id); setOpen(false) }}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
                  ${value === u.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-blue-600">{u.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="flex-1 truncate">{u.name}</span>
                {u.id === currentUserId && (
                  <span className="text-[10px] text-blue-400 font-semibold shrink-0">You</span>
                )}
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-slate-400 text-center">No users found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Task Form Modal ───────────────────────────────────────────────────────────

function TaskModal({
  title,
  lockStatus,
  initialData,
  onSubmit,
  onDelete,
  onClose,
  isPending,
  isDeleting,
  error,
  users,
  currentUserId,
}: {
  title: string
  lockStatus?: boolean
  initialData: {
    taskTitle: string; setTaskTitle: (v: string) => void
    taskDesc: string; setTaskDesc: (v: string) => void
    taskPriority: TaskPriority; setTaskPriority: (v: TaskPriority) => void
    taskStatus: TaskStatus; setTaskStatus: (v: TaskStatus) => void
    taskDueDate: string; setTaskDueDate: (v: string) => void
    taskAssignee: string; setTaskAssignee: (v: string) => void
  }
  onSubmit: (e: FormEvent) => void
  onDelete?: () => void
  onClose: () => void
  isPending: boolean
  isDeleting?: boolean
  error: string | null
  users: User[]
  currentUserId: string
}) {
  const { taskTitle, setTaskTitle, taskDesc, setTaskDesc, taskPriority, setTaskPriority, taskStatus, setTaskStatus, taskDueDate, setTaskDueDate, taskAssignee, setTaskAssignee } = initialData
  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={onSubmit} id="task-form" className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Title *</label>
            <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required placeholder="Task title" className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Description</label>
            <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Optional details..." rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className={`grid gap-3 ${lockStatus ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {!lockStatus && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Status</label>
                <select value={taskStatus} onChange={e => setTaskStatus(e.target.value as TaskStatus)} className={`${inputCls} bg-white`}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Priority</label>
              <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as TaskPriority)} className={`${inputCls} bg-white`}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Due Date</label>
              <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Assignee</label>
              <AssigneePicker
                value={taskAssignee}
                onChange={setTaskAssignee}
                users={users}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-between p-6 bg-slate-50 border-t border-slate-200/50 rounded-b-2xl">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              form="task-form"
              disabled={isPending}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-6 rounded-lg text-sm transition-all"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(s => s.user)

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const dragOriginStatus = useRef<TaskStatus | null>(null)

  // Sort state per column
  const [sortFields, setSortFields] = useState<Record<TaskStatus, SortField>>({
    todo: 'none',
    in_progress: 'none',
    done: 'none',
  })

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [createStatus, setCreateStatus] = useState<TaskStatus>('todo')
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  // Shared form fields
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium')
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')

  // Single request that returns both project + tasks
  const { data: projectData, isLoading: projectLoading, isError: projectError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProjectWithTasks(id!),
    enabled: !!id,
  })

  const project = projectData?.project
  const tasks: Task[] = projectData?.tasks ?? []
  const tasksLoading = projectLoading

  const { data: stats } = useQuery({
    queryKey: ['project-stats', id],
    queryFn: () => getProjectStats(id!),
    enabled: !!id,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const userMap: Record<string, string> = Object.fromEntries(users.map(u => [u.id, u.name]))

  // DnD sensors — require 5px movement to start drag (prevents click conflicts)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  type CachedProject = { project: import('../../types').Project; tasks: Task[] }

  function getTasks(): Task[] {
    return queryClient.getQueryData<CachedProject>(['project', id])?.tasks ?? []
  }

  function setTasks(updater: (old: Task[]) => Task[]) {
    queryClient.setQueryData<CachedProject>(['project', id], old =>
      old ? { ...old, tasks: updater(old.tasks) } : old
    )
  }

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
      updateTask(taskId, data),
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['project', id] })
      const prev = getTasks()
      setTasks(old => old.map(t => t.id === taskId ? { ...t, ...data } : t))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) setTasks(() => ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] })
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: (data: Parameters<typeof createTask>[1] & { status: TaskStatus }) =>
      createTask(id!, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['project', id] })
      const prev = getTasks()
      const optimistic: Task = {
        id: 'optimistic-' + Date.now(),
        title: data.title,
        description: data.description ?? null,
        status: data.status,
        priority: data.priority ?? 'medium',
        project_id: id!,
        assignee_id: data.assignee_id ?? null,
        due_date: data.due_date ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setTasks(old => [...old, optimistic])
      setShowCreate(false)
      resetForm()
      return { prev }
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) setTasks(() => ctx.prev)
      const msg = err?.response?.data?.error || 'Failed to create task'
      setCreateError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setShowCreate(true)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] })
    },
  })

  const editTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
      updateTask(taskId, data),
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['project', id] })
      const prev = getTasks()
      setTasks(old => old.map(t => t.id === taskId ? { ...t, ...data } : t))
      setEditingTask(null)
      return { prev }
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) setTasks(() => ctx.prev)
      const msg = err?.response?.data?.error || 'Failed to update task'
      setEditError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['project', id] })
      const prev = getTasks()
      setTasks(old => old.filter(t => t.id !== taskId))
      setEditingTask(null)
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) setTasks(() => ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] })
    },
  })

  // DnD handlers
  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find(t => t.id === event.active.id) ?? null
    setActiveTask(task)
    dragOriginStatus.current = task?.status ?? null
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const overColumn = COLUMNS.find(c => c.id === overId)
    const currentTasks = getTasks()
    const overTask = currentTasks.find(t => t.id === overId)
    const targetStatus: TaskStatus | undefined = overColumn?.id ?? overTask?.status

    const draggedTask = currentTasks.find(t => t.id === activeId)
    if (!draggedTask || !targetStatus || draggedTask.status === targetStatus) return

    setTasks(old => old.map(t => t.id === activeId ? { ...t, status: targetStatus } : t))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active } = event

    const currentTasks = getTasks()
    const task = currentTasks.find(t => t.id === active.id)

    if (!task) { dragOriginStatus.current = null; return }

    if (task.status !== dragOriginStatus.current) {
      updateTaskMutation.mutate({ taskId: task.id, data: { status: task.status } })
    }
    dragOriginStatus.current = null
  }

  // Form helpers
  function resetForm() {
    setTaskTitle(''); setTaskDesc(''); setTaskPriority('medium')
    setTaskStatus('todo'); setTaskDueDate(''); setTaskAssignee('')
  }

  function openCreate(status: TaskStatus) {
    resetForm(); setCreateStatus(status); setTaskStatus(status); setCreateError(null); setShowCreate(true)
  }

  function openEdit(task: Task) {
    setTaskTitle(task.title)
    setTaskDesc(task.description ?? '')
    setTaskPriority(task.priority)
    setTaskStatus(task.status)
    setTaskDueDate(task.due_date ?? '')
    setTaskAssignee(task.assignee_id ?? '')
    setEditError(null)
    setEditingTask(task)
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateError(null)
    if (!taskTitle.trim()) { setCreateError('Title is required'); return }
    createTaskMutation.mutate({
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      priority: taskPriority,
      status: createStatus,
      due_date: taskDueDate || undefined,
      assignee_id: taskAssignee || undefined,
    })
  }

  function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingTask) return
    setEditError(null)
    editTaskMutation.mutate({
      taskId: editingTask.id,
      data: {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        priority: taskPriority,
        status: taskStatus,
        due_date: taskDueDate || undefined,
        assignee_id: taskAssignee || null,
      },
    })
  }

  const tasksByColumn = (status: TaskStatus) => tasks.filter(t => t.status === status)
  const formFields = { taskTitle, setTaskTitle, taskDesc, setTaskDesc, taskPriority, setTaskPriority, taskStatus, setTaskStatus, taskDueDate, setTaskDueDate, taskAssignee, setTaskAssignee }

  if (projectLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (projectError || !project) {
    return (
      <div className="m-8 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <p className="text-red-800 font-medium">Failed to load project</p>
      </div>
    )
  }

  const rate = (stats as ProjectStats | undefined)?.completion_rate ?? 0
  const completion = rate > 1 ? Math.round(rate) : Math.round(rate * 100)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
            {project.description && (
              <p className="text-xs text-slate-400 mt-0.5">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {stats && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${completion}%` }} />
                </div>
                <span className="font-semibold text-slate-700">{completion}% done</span>
              </div>
            )}
            <button
              onClick={() => openCreate('todo')}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="p-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn(col.id)}
                onAddTask={openCreate}
                onEditTask={openEdit}
                userMap={userMap}
                sortField={sortFields[col.id]}
                onSortChange={f => setSortFields(prev => ({ ...prev, [col.id]: f }))}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} overlay assigneeName={activeTask.assignee_id ? userMap[activeTask.assignee_id] : undefined} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <TaskModal
          title="Add Task"
          lockStatus
          initialData={formFields}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          isPending={createTaskMutation.isPending}
          error={createError}
          users={users}
          currentUserId={currentUser?.id ?? ''}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskModal
          title="Edit Task"
          initialData={formFields}
          onSubmit={handleEdit}
          onDelete={() => deleteTaskMutation.mutate(editingTask.id)}
          onClose={() => setEditingTask(null)}
          isPending={editTaskMutation.isPending}
          isDeleting={deleteTaskMutation.isPending}
          error={editError}
          users={users}
          currentUserId={currentUser?.id ?? ''}
        />
      )}
    </div>
  )
}
