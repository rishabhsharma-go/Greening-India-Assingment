import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useUserWebSocket } from '../hooks/useUserWebSocket'
import type { Project } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'
import { Plus, FolderOpen, Loader2, AlertCircle } from 'lucide-react'

export function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const fetchProjects = useCallback(async () => {
    try {
      setError(null)
      const response = await api.getProjects()
      setProjects(response.projects || [])
    } catch (err) {
      setError('Failed to load projects')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Refetch when window gains focus (for real-time-like updates)
  useEffect(() => {
    const handleFocus = () => {
      fetchProjects()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchProjects])

  // User-level WebSocket for real-time project assignment notifications
  useUserWebSocket({
    userId: user?.id || '',
    onProjectAssigned: useCallback((_data: { project_id: string; task: unknown }) => {
      // Refetch projects when assigned to a new task
      fetchProjects()
      toast({ title: 'New assignment', description: 'You have been assigned to a task in a project' })
    }, [fetchProjects, toast]),
    onProjectRemoved: useCallback((data: { project_id: string }) => {
      // Remove project from list when user no longer has tasks in it
      setProjects((prev) => prev.filter((p) => p.id !== data.project_id))
      toast({ title: 'Access removed', description: 'You no longer have tasks in a project' })
    }, [toast]),
  })

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setIsCreating(true)
    try {
      const project = await api.createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      })
      setProjects([project, ...projects])
      setIsDialogOpen(false)
      setNewProjectName('')
      setNewProjectDescription('')
      toast({ title: 'Project created', description: `"${project.name}" has been created.` })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create project' })
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={fetchProjects}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and tasks</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateProject}>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
                <DialogDescription>
                  Add a new project to organize your tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="Project description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || !newProjectName.trim()}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
          <p className="text-muted-foreground">Create your first project to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
