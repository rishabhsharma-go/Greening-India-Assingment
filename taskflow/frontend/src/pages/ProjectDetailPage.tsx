import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { useUserWebSocket } from '../hooks/useUserWebSocket'
import type { Project, Task, TaskStatus, TaskPriority, User } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'
import {
  Plus,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  MoreVertical,
  GripVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'

const statusLabels: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')

  // Get unique assignees from tasks (with user names)
  const uniqueAssignees = Array.from(
    new Set(tasks.filter(t => t.assignee_id).map(t => t.assignee_id))
  )
  
  // Helper to get user name by ID
  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser ? foundUser.name : userId
  }

  // Task dialog
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    due_date: '',
    assignee_id: '' as string,
  })
  const [isSaving, setIsSaving] = useState(false)

  // Project edit dialog
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [projectForm, setProjectForm] = useState({ name: '', description: '' })
  const [isUpdatingProject, setIsUpdatingProject] = useState(false)

  const fetchProject = useCallback(async () => {
    if (!id) return
    try {
      setError(null)
      const data = await api.getProject(id)
      setProject(data)
      setTasks(data.tasks || [])
      setProjectForm({ name: data.name, description: data.description || '' })
    } catch (err) {
      setError('Failed to load project')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Failed to fetch users', err)
    }
  }, [])

  // Drag and drop state
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // WebSocket for real-time updates
  useWebSocket({
    projectId: id || '',
    onTaskCreated: useCallback((data: unknown) => {
      const newTask = data as Task
      setTasks((prev) => {
        // Avoid duplicates
        if (prev.some(t => t.id === newTask.id)) return prev
        return [newTask, ...prev]
      })
      toast({ title: 'New task added' })
    }, [toast]),
    onTaskUpdated: useCallback((data: unknown) => {
      const updatedTask = data as Task
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
    }, []),
    onTaskDeleted: useCallback((data: { id: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.id))
    }, []),
    onProjectUpdated: useCallback((data: unknown) => {
      const updatedProject = data as Project
      setProject(updatedProject)
      setProjectForm({ name: updatedProject.name, description: updatedProject.description || '' })
      toast({ title: 'Project updated' })
    }, [toast]),
    onProjectDeleted: useCallback((_data: { id: string }) => {
      toast({ title: 'Project deleted', description: 'Redirecting to projects list...' })
      navigate('/projects')
    }, [toast, navigate]),
  })

  // User-level WebSocket for access removal notifications (for non-owners)
  useUserWebSocket({
    userId: user?.id || '',
    onProjectRemoved: useCallback((data: { project_id: string }) => {
      // If viewing the project that was removed, redirect
      if (data.project_id === id) {
        toast({ title: 'Access removed', description: 'You no longer have tasks in this project' })
        navigate('/projects')
      }
    }, [id, toast, navigate]),
  })

  useEffect(() => {
    fetchProject()
    fetchUsers()
  }, [fetchProject, fetchUsers])

  // Check if current user is the project owner
  const isOwner = Boolean(project && user && project.owner_id === user.id)

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false
    if (assigneeFilter === 'unassigned' && task.assignee_id) return false
    if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && task.assignee_id !== assigneeFilter) return false
    return true
  })

  const groupedTasks = {
    todo: filteredTasks.filter((t) => t.status === 'todo'),
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
    done: filteredTasks.filter((t) => t.status === 'done'),
  }

  const openCreateTaskDialog = () => {
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      assignee_id: '',
    })
    setIsTaskDialogOpen(true)
  }

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      assignee_id: task.assignee_id || 'unassigned',
    })
    setIsTaskDialogOpen(true)
  }

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskForm.title.trim() || !id) return

    setIsSaving(true)
    try {
      if (editingTask) {
        const updated = await api.updateTask(editingTask.id, {
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || undefined,
          status: taskForm.status,
          priority: taskForm.priority,
          due_date: taskForm.due_date || undefined,
          assignee_id: taskForm.assignee_id && taskForm.assignee_id !== 'unassigned' ? taskForm.assignee_id : undefined,
        })
        setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)))
        toast({ title: 'Task updated' })
      } else {
        const created = await api.createTask(id, {
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || undefined,
          status: taskForm.status,
          priority: taskForm.priority,
          due_date: taskForm.due_date || undefined,
          assignee_id: taskForm.assignee_id && taskForm.assignee_id !== 'unassigned' ? taskForm.assignee_id : undefined,
        })
        setTasks([created, ...tasks])
        toast({ title: 'Task created' })
      }
      setIsTaskDialogOpen(false)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save task' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId)
      setTasks(tasks.filter((t) => t.id !== taskId))
      toast({ title: 'Task deleted' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task' })
    }
  }

  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    // Optimistic update
    const originalTasks = [...tasks]
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))

    try {
      await api.updateTask(task.id, { status: newStatus })
    } catch (err) {
      // Revert on error
      setTasks(originalTasks)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status' })
    }
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Use existing handler for status change
    await handleQuickStatusChange(task, newStatus)
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectForm.name.trim() || !id) return

    setIsUpdatingProject(true)
    try {
      const updated = await api.updateProject(id, {
        name: projectForm.name.trim(),
        description: projectForm.description.trim() || undefined,
      })
      setProject(updated)
      setIsProjectDialogOpen(false)
      toast({ title: 'Project updated' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update project' })
    } finally {
      setIsUpdatingProject(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!id || !confirm('Are you sure you want to delete this project and all its tasks?')) return

    try {
      await api.deleteProject(id)
      toast({ title: 'Project deleted' })
      navigate('/projects')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete project' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{error || 'Project not found'}</p>
        <Link to="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsProjectDialogOpen(true)}
            disabled={!isOwner}
            title={!isOwner ? 'Only project owner can edit' : undefined}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDeleteProject}
            disabled={!isOwner}
            title={!isOwner ? 'Only project owner can delete' : undefined}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          {isOwner && (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {uniqueAssignees.map((assigneeId) => (
                  <SelectItem key={assigneeId} value={assigneeId!}>
                    {getUserName(assigneeId!)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button 
          onClick={openCreateTaskDialog}
          disabled={!isOwner}
          title={!isOwner ? 'Only project owner can create tasks' : undefined}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Kanban Board with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((status) => (
            <DroppableColumn key={status} id={status}>
              <Card className="min-h-[300px]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Badge variant={status}>{statusLabels[status]}</Badge>
                    <span className="text-muted-foreground">({groupedTasks[status].length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupedTasks[status].length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Drop tasks here
                    </p>
                  ) : (
                    groupedTasks[status].map((task) => (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => openEditTaskDialog(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                        onStatusChange={(newStatus) => handleQuickStatusChange(task, newStatus)}
                        isOwner={isOwner}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </DroppableColumn>
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="rounded-lg border bg-card p-3 shadow-lg opacity-90">
              <p className="font-medium">{activeTask.title}</p>
              <Badge variant={activeTask.priority} className="mt-1">
                {priorityLabels[activeTask.priority]}
              </Badge>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSaveTask}>
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
              <DialogDescription>
                {editingTask 
                  ? (isOwner 
                      ? 'Update task details' 
                      : 'Only the project owner can update tasks. Contact the owner to make changes.')
                  : 'Add a new task to this project'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Task title"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Task description"
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={taskForm.status}
                    onValueChange={(v) => setTaskForm({ ...taskForm, status: v as TaskStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(v) => setTaskForm({ ...taskForm, priority: v as TaskPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date (optional)</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              {isOwner && (
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={taskForm.assignee_id}
                    onValueChange={(v) => setTaskForm({ ...taskForm, assignee_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}{u.id === user?.id ? ' (me)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !taskForm.title.trim()}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Edit Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateProject}>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update project details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Name</Label>
                <Input
                  id="project-name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  disabled={isUpdatingProject}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Input
                  id="project-description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  disabled={isUpdatingProject}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingProject || !projectForm.name.trim()}>
                {isUpdatingProject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface TaskCardProps {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: TaskStatus) => void
  isOwner: boolean
}

// Droppable Column wrapper
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors ${isOver ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
    >
      {children}
    </div>
  )
}

// Draggable Task Card
function DraggableTaskCard({ task, onEdit, onDelete, onStatusChange, isOwner }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent/30 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-medium leading-tight">{task.title}</p>
            {task.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant={task.priority}>{priorityLabels[task.priority]}</Badge>
              {task.due_date && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={isOwner ? onEdit : undefined}
              className={!isOwner ? "text-muted-foreground cursor-not-allowed" : ""}
              disabled={!isOwner}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {isOwner ? 'Edit' : 'Edit (Owner only)'}
            </DropdownMenuItem>
            {task.status !== 'todo' && (
              <DropdownMenuItem onClick={() => onStatusChange('todo')}>
                Move to To Do
              </DropdownMenuItem>
            )}
            {task.status !== 'in_progress' && (
              <DropdownMenuItem onClick={() => onStatusChange('in_progress')}>
                Move to In Progress
              </DropdownMenuItem>
            )}
            {task.status !== 'done' && (
              <DropdownMenuItem onClick={() => onStatusChange('done')}>
                Move to Done
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={isOwner ? onDelete : undefined} 
              className={isOwner ? "text-destructive" : "text-muted-foreground cursor-not-allowed"}
              disabled={!isOwner}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isOwner ? 'Delete' : 'Delete (Owner only)'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
