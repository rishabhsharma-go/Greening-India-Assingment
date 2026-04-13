import { useState, FormEvent, useMemo, useRef, useEffect } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Trash2, Loader2, AlertCircle, X, Pencil, Search, ArrowUpDown, Check } from 'lucide-react'
import { getProjects, createProject, updateProject, deleteProject, getProjectWithTasks, getUsers } from '../../api/projects'
import { useAuthStore } from '../../store/auth'
import type { Project, User } from '../../types'

const GRADIENTS = [
  'from-blue-600 to-blue-400',
  'from-violet-600 to-purple-400',
  'from-amber-500 to-orange-400',
  'from-emerald-600 to-green-400',
  'from-rose-600 to-pink-400',
  'from-cyan-600 to-teal-400',
]

const PROJECT_TYPES = [
  'Agroforestry',
  'Carbon Credit',
  'Biodiversity',
  'Watershed',
  'Community',
  'Research',
]

const TYPE_COLORS: Record<string, string> = {
  'Agroforestry':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Carbon Credit': 'bg-blue-50 text-blue-700 border-blue-200',
  'Biodiversity':  'bg-violet-50 text-violet-700 border-violet-200',
  'Watershed':     'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Community':     'bg-amber-50 text-amber-700 border-amber-200',
  'Research':      'bg-rose-50 text-rose-700 border-rose-200',
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(s => s.user)

  // ── create modal state ──
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createType, setCreateType] = useState('')
  const [createCustomType, setCreateCustomType] = useState('')
  const [createLead, setCreateLead] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  // ── edit modal state ──
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editType, setEditType] = useState('')
  const [editCustomType, setEditCustomType] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ── search + filter + sort state ──
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'completion'>('newest')
  const [showSort, setShowSort] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSort(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { data: projects, isLoading, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })
  const usersById = (users as User[]).reduce<Record<string, User>>((acc, u) => {
    acc[u.id] = u; return acc
  }, {})

  const taskQueries = useQueries({
    queries: (projects ?? []).map((p: Project) => ({
      queryKey: ['project', p.id],
      queryFn: () => getProjectWithTasks(p.id),
      staleTime: 60_000,
    })),
  })

  const projectStats = (projects ?? []).reduce<Record<string, {
    todo: number; inProgress: number; done: number; total: number; completion: number
  }>>((acc, p: Project, i) => {
    const tasks = taskQueries[i]?.data?.tasks ?? []
    const todo = tasks.filter((t: any) => t.status === 'todo').length
    const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length
    const done = tasks.filter((t: any) => t.status === 'done').length
    const total = tasks.length
    acc[p.id] = { todo, inProgress, done, total, completion: total > 0 ? Math.round((done / total) * 100) : 0 }
    return acc
  }, {})

  // unique types from loaded projects for filter pills
  const filterTypes = useMemo(() => {
    if (!projects) return []
    const seen = new Set<string>()
    for (const p of projects as Project[]) {
      if (p.project_type) seen.add(p.project_type)
    }
    return Array.from(seen).sort()
  }, [projects])

  const filteredProjects = useMemo(() => {
    if (!projects) return []
    const filtered = (projects as Project[]).filter(p => {
      const matchesSearch = !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesFilter = !activeFilter || p.project_type === activeFilter
      return matchesSearch && matchesFilter
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name_asc':  return a.name.localeCompare(b.name)
        case 'name_desc': return b.name.localeCompare(a.name)
        case 'completion': {
          const ca = projectStats[a.id]?.completion ?? 0
          const cb = projectStats[b.id]?.completion ?? 0
          return cb - ca
        }
        default: return 0
      }
    })
  }, [projects, search, activeFilter, sortBy, projectStats])

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowCreate(false); setCreateName(''); setCreateDesc(''); setCreateType(''); setCreateCustomType(''); setCreateLead(''); setCreateError(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to create project'
      setCreateError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateProject>[1] }) =>
      updateProject(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', updated.id] })
      setEditProject(null); setEditError(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to update project'
      setEditError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setDeleteConfirmId(null)
    },
  })

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateError(null)
    if (!createName.trim()) { setCreateError('Project name is required'); return }
    const resolvedType = createType === '__custom__'
      ? createCustomType.trim()
      : createType
    createMutation.mutate({
      name: createName.trim(),
      description: createDesc.trim() || undefined,
      project_type: resolvedType || undefined,
      owner_id: createLead || undefined,
    })
  }

  function openEdit(p: Project, e: React.MouseEvent) {
    e.stopPropagation()
    setEditProject(p)
    setEditName(p.name)
    setEditDesc(p.description ?? '')
    const knownType = p.project_type && PROJECT_TYPES.includes(p.project_type)
    setEditType(p.project_type ? (knownType ? p.project_type : '__custom__') : '')
    setEditCustomType(p.project_type && !knownType ? p.project_type : '')
    setEditError(null)
  }

  function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (!editProject) return
    setEditError(null)
    if (!editName.trim()) { setEditError('Project name is required'); return }
    const resolvedType = editType === '__custom__'
      ? editCustomType.trim()
      : editType
    editMutation.mutate({
      id: editProject.id,
      data: {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        project_type: resolvedType || undefined,
      },
    })
  }

  const total = projects?.length ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total} project{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => { setCreateName(''); setCreateDesc(''); setCreateType(''); setCreateCustomType(''); setCreateLead(currentUser?.id ?? ''); setCreateError(null); setShowCreate(true) }}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-lg text-sm transition-all active:scale-95 shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Create Project
        </button>
      </header>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Stats row */}
        {(() => {
          const allStats = Object.values(projectStats)
          const totalTasks  = allStats.reduce((s, p) => s + p.total, 0)
          const doneTasks   = allStats.reduce((s, p) => s + p.done, 0)
          const activeTasks = allStats.reduce((s, p) => s + p.inProgress, 0)
          const activeProjects = (projects ?? []).filter((_: Project, i: number) =>
            (taskQueries[i]?.data?.tasks ?? []).some((t: any) => t.status === 'in_progress')
          ).length
          const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
          const circumference = 2 * Math.PI * 36
          return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
              {/* Top strip */}
              <div className="px-8 pt-7 pb-5 flex items-center justify-between border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Workspace Overview</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Aggregated across all your projects</p>
                </div>
                {/* Ring */}
                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r="36" fill="transparent" stroke="#f1f5f9" strokeWidth="7" />
                    <circle cx="44" cy="44" r="36" fill="transparent" stroke="#3B82F6" strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (circumference * overallPct) / 100}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-base font-bold text-slate-900 leading-none">{overallPct}%</div>
                    <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">done</div>
                  </div>
                </div>
              </div>
              {/* Stat boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
                <div className="px-8 py-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Projects</div>
                  <div className="text-3xl font-bold text-slate-900">{total}</div>
                  <div className="text-xs text-slate-400 mt-1">in workspace</div>
                </div>
                <div className="px-8 py-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Active Projects</div>
                  <div className="text-3xl font-bold text-blue-500">{activeProjects}</div>
                  <div className="text-xs text-slate-400 mt-1">with tasks in progress</div>
                </div>
                <div className="px-8 py-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tasks In Progress</div>
                  <div className="text-3xl font-bold text-slate-900">{activeTasks}</div>
                  <div className="text-xs text-slate-400 mt-1">of {totalTasks} total tasks</div>
                </div>
                <div className="px-8 py-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tasks Completed</div>
                  <div className="text-3xl font-bold text-emerald-500">{doneTasks}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${overallPct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{overallPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Search + Filter bar */}
        {!isLoading && !isError && total > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search + Sort */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              {/* Sort dropdown */}
              <div className="relative shrink-0" ref={sortRef}>
                <button
                  onClick={() => setShowSort(s => !s)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${showSort ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Sort
                </button>
                {showSort && (
                  <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 z-20 overflow-hidden">
                    {([
                      { value: 'newest',     label: 'Newest first' },
                      { value: 'oldest',     label: 'Oldest first' },
                      { value: 'name_asc',   label: 'Name A → Z' },
                      { value: 'name_desc',  label: 'Name Z → A' },
                      { value: 'completion', label: 'Most complete' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setShowSort(false) }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
                      >
                        <span className={sortBy === opt.value ? 'font-semibold text-slate-900' : 'text-slate-600'}>{opt.label}</span>
                        {sortBy === opt.value && <Check className="w-3.5 h-3.5 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveFilter(null)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${!activeFilter ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700'}`}
              >
                All Projects
              </button>
              {filterTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeFilter === type ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">Failed to load projects</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && total === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No projects yet</h3>
            <p className="text-slate-400 text-sm mb-6">Create your first project to get started</p>
            <button
              onClick={() => { setCreateName(''); setCreateDesc(''); setCreateType(''); setCreateCustomType(''); setCreateLead(currentUser?.id ?? ''); setCreateError(null); setShowCreate(true) }}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-lg text-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Create Project
            </button>
          </div>
        )}

        {/* No results after filtering */}
        {!isLoading && !isError && total > 0 && filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">No projects match</h3>
            <p className="text-slate-400 text-sm">Try a different search term or filter.</p>
          </div>
        )}

        {/* Project grid */}
        {!isLoading && !isError && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project: Project, i: number) => {
              const isOwner = currentUser?.id === project.owner_id
              const stats = projectStats[project.id]
              const gradient = GRADIENTS[i % GRADIENTS.length]
              const { completion = 0, todo = 0, inProgress = 0, done = 0, total: totalTasks = 0 } = stats ?? {}
              const isActive = inProgress > 0
              const lead = usersById[project.owner_id]
              const typeColor = project.project_type ? (TYPE_COLORS[project.project_type] ?? 'bg-slate-50 text-slate-600 border-slate-200') : null

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group bg-[#f2f3f7] p-1 rounded-xl transition-all hover:bg-[#e7e8ec] border border-[#e1e2e6]/20 cursor-pointer"
                >
                  <div className="bg-white rounded-lg p-6 h-full flex flex-col">
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {/* Initials avatar */}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                        <span className="text-white text-sm font-bold">{getInitials(project.name)}</span>
                      </div>
                      {/* Actions + badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOwner && (
                          <>
                            <button
                              onClick={e => openEdit(project, e)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteConfirmId(project.id) }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-500 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${isActive ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {isActive ? 'ACTIVE' : 'QUEUED'}
                        </span>
                      </div>
                    </div>

                    <div className="flex-grow">
                      {/* Name + type */}
                      <div className="flex items-start gap-2 mb-1.5">
                        <h3 className="text-base font-bold group-hover:text-blue-600 transition-colors text-slate-900 leading-tight flex-1">
                          {project.name}
                        </h3>
                        {project.project_type && (
                          <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeColor}`}>
                            {project.project_type}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">
                        {project.description || 'No description provided.'}
                      </p>

                      {/* Task distribution */}
                      <div className="mb-4 space-y-2.5">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          <span>Task Distribution</span>
                          <span>{completion}% COMPLETE</span>
                        </div>
                        <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100">
                          {totalTasks > 0 ? (
                            <>
                              <div className="h-full bg-slate-300 transition-all" style={{ width: `${(todo / totalTasks) * 100}%` }} />
                              <div className="h-full bg-blue-300 transition-all" style={{ width: `${(inProgress / totalTasks) * 100}%` }} />
                              <div className="h-full bg-blue-500 transition-all" style={{ width: `${(done / totalTasks) * 100}%` }} />
                            </>
                          ) : (
                            <div className="h-full bg-slate-200 w-full" />
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Todo</div>
                            </div>
                            <div className="text-sm font-bold text-slate-700">{String(todo).padStart(2, '0')}</div>
                          </div>
                          <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Active</div>
                            </div>
                            <div className="text-sm font-bold text-slate-700">{String(inProgress).padStart(2, '0')}</div>
                          </div>
                          <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <div className="text-[10px] text-blue-500 font-bold uppercase">Done</div>
                            </div>
                            <div className="text-sm font-bold text-blue-500">{String(done).padStart(2, '0')}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer — lead + date */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-600 shrink-0">
                          {lead ? getInitials(lead.name) : '?'}
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none">Lead</div>
                          <div className="text-[11px] font-semibold text-slate-700 leading-tight">{lead?.name ?? 'Unknown'}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium italic">
                        {formatRelativeDate(project.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-xl rounded-2xl overflow-hidden border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">New Project</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              {createError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{createError}</p>
                </div>
              )}
              <form onSubmit={handleCreate} id="create-form" className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Project Name</label>
                  <input type="text" value={createName} onChange={e => setCreateName(e.target.value)} required
                    placeholder="Enter project title..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Description</label>
                  <textarea value={createDesc} onChange={e => setCreateDesc(e.target.value)}
                    placeholder="What is the goal of this project?" rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Project Type</label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => setCreateType(createType === t ? '' : t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${createType === t ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                        {t}
                      </button>
                    ))}
                    <button type="button" onClick={() => setCreateType(createType === '__custom__' ? '' : '__custom__')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${createType === '__custom__' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                      Other…
                    </button>
                  </div>
                  {createType === '__custom__' && (
                    <input
                      type="text"
                      value={createCustomType}
                      onChange={e => setCreateCustomType(e.target.value)}
                      placeholder="Enter custom project type…"
                      className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all"
                      autoFocus
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Project Lead</label>
                  <div className="relative">
                    <select
                      value={createLead}
                      onChange={e => setCreateLead(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-800 transition-all appearance-none"
                    >
                      {(users as User[]).map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}{u.id === currentUser?.id ? ' (You)' : ''} — {u.email}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t border-slate-200/50">
              <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Cancel</button>
              <button type="submit" form="create-form" disabled={createMutation.isPending}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2.5 px-8 rounded-lg transition-all active:scale-95 text-sm">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-xl rounded-2xl overflow-hidden border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Edit Project</h2>
              <button onClick={() => setEditProject(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              {editError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{editError}</p>
                </div>
              )}
              <form onSubmit={handleEdit} id="edit-form" className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Project Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Description</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Project Type</label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => setEditType(editType === t ? '' : t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${editType === t ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                        {t}
                      </button>
                    ))}
                    <button type="button" onClick={() => setEditType(editType === '__custom__' ? '' : '__custom__')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${editType === '__custom__' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                      Other…
                    </button>
                  </div>
                  {editType === '__custom__' && (
                    <input
                      type="text"
                      value={editCustomType}
                      onChange={e => setEditCustomType(e.target.value)}
                      placeholder="Enter custom project type…"
                      className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all"
                      autoFocus
                    />
                  )}
                </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t border-slate-200/50">
              <button type="button" onClick={() => setEditProject(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Cancel</button>
              <button type="submit" form="edit-form" disabled={editMutation.isPending}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2.5 px-8 rounded-lg transition-all active:scale-95 text-sm">
                {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden border border-slate-200 shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Delete project?</h2>
                  <p className="text-sm text-slate-400">This cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteConfirmId)} disabled={deleteMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-bold rounded-lg transition-all">
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
