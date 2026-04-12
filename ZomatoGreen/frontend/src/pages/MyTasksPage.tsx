import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProjects, getProjectTasks } from '../api/projects'
import { useAuthStore } from '../store/auth'
import { Loader2, Calendar, Flag, Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Task, Project } from '../types'

type TaskPriority = 'low' | 'medium' | 'high'
type TaskStatus = 'todo' | 'in_progress' | 'done'

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low:    'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-red-100   text-red-700',
}

const STATUS_META: Record<TaskStatus, { label: string; icon: typeof Circle; color: string; bg: string }> = {
  todo:        { label: 'To Do',       icon: Circle,       color: 'text-slate-500', bg: 'bg-slate-100' },
  in_progress: { label: 'In Progress', icon: Clock,        color: 'text-blue-500',  bg: 'bg-blue-50' },
  done:        { label: 'Done',        icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
}

interface TaskWithProject extends Task {
  projectName: string
  projectId: string
}

export function MyTasksPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.user)

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })

  // Fetch tasks per project filtered by current user
  const taskQueries = useQuery({
    queryKey: ['my-tasks', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || projects.length === 0) return []
      const results = await Promise.all(
        projects.map(async (p: Project) => {
          const tasks = await getProjectTasks(p.id, { assignee: currentUser.id })
          return tasks.map((t: Task): TaskWithProject => ({
            ...t,
            projectName: p.name,
            projectId: p.id,
          }))
        })
      )
      return results.flat()
    },
    enabled: !!currentUser?.id && projects.length > 0,
  })

  const allTasks: TaskWithProject[] = taskQueries.data ?? []
  const isLoading = projectsLoading || taskQueries.isLoading

  const todo       = allTasks.filter(t => t.status === 'todo')
  const inProgress = allTasks.filter(t => t.status === 'in_progress')
  const done       = allTasks.filter(t => t.status === 'done')

  const statCards = [
    { label: 'To Do',       count: todo.length,       color: 'text-slate-600', bg: 'bg-slate-50',  border: 'border-slate-200' },
    { label: 'In Progress', count: inProgress.length, color: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-200' },
    { label: 'Done',        count: done.length,       color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-200' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading ? 'Loading...' : `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} assigned to you`}
          </p>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {statCards.map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-6 flex flex-col gap-1`}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</span>
              <span className={`text-3xl font-black ${s.color}`}>{s.count}</span>
              <span className="text-xs text-slate-400">task{s.count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {!isLoading && allTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No tasks assigned to you</h3>
            <p className="text-slate-400 text-sm">Tasks assigned to you will appear here</p>
          </div>
        )}

        {/* Task sections */}
        {!isLoading && (
          <div className="space-y-6">
            {([
              { status: 'in_progress' as TaskStatus, tasks: inProgress },
              { status: 'todo' as TaskStatus, tasks: todo },
              { status: 'done' as TaskStatus, tasks: done },
            ]).map(({ status, tasks }) => {
              if (tasks.length === 0) return null
              const meta = STATUS_META[status]
              const Icon = meta.icon
              return (
                <div key={status}>
                  <div className={`flex items-center gap-2 mb-3 px-1`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                    <span className="text-sm font-bold text-slate-700">{meta.label}</span>
                    <span className="text-xs bg-white text-slate-500 rounded-full px-2 py-0.5 font-semibold border border-slate-200">
                      {tasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/projects/${task.projectId}`)}
                        className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-500 transition-colors">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 shrink-0 group-hover:text-blue-500 transition-colors">
                            {task.projectName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${PRIORITY_STYLES[task.priority]}`}>
                            <Flag className="w-2.5 h-2.5" />
                            {task.priority}
                          </span>
                          {task.due_date && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium
                              ${new Date(task.due_date) < new Date() && task.status !== 'done'
                                ? 'text-red-500'
                                : 'text-slate-400'}`}>
                              <Calendar className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {new Date(task.due_date) < new Date() && task.status !== 'done' && (
                                <span className="ml-0.5 text-[9px] font-bold">overdue</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
