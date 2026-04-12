import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '@/api/axios';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Loader2,
  Trash2,
  Calendar,
  Pencil,
  Filter,
  Globe
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useToast } from '@/hooks/use-toast';
import type { Project, Task, User } from '@/types';
import { TaskStatus, TaskPriority } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

const ProjectPulse = ({ todo, inProgress, done, vitality }: { todo: number, inProgress: number, done: number, vitality: number }) => {
  const total = Math.max(todo + inProgress + done, 1);

  const segments = [
    { value: done, color: '#10b981', shadow: 'rgba(16, 185, 129, 0.4)' },
    { value: inProgress, color: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.4)' },
    { value: todo, color: '#94a3b8', shadow: 'rgba(148, 163, 184, 0.4)' }
  ];

  let cumulativeOffset = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center group shrink-0">
      <div className="absolute inset-0 bg-emerald-500/5 rounded-full blur-2xl scale-125 animate-pulse pointer-events-none" />
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
        {segments.map((segment, i) => {
          if (segment.value === 0) return null;
          const percentage = (segment.value / total) * 100;
          const offset = (cumulativeOffset / 100) * circumference;
          cumulativeOffset += percentage;
          return (
            <motion.circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={segment.color}
              strokeWidth="8"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (percentage / 100) * circumference }}
              transition={{ duration: 1.5, delay: 0.2, ease: "circOut" }}
              strokeLinecap="round"
              style={{ rotate: (offset / circumference) * 360, filter: `drop-shadow(0 0 4px ${segment.shadow})` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="relative">
          <span className="text-2xl md:text-3xl font-black text-white tracking-tighter block leading-none">{vitality}%</span>
          <span className="text-[7px] font-bold text-emerald-400 uppercase tracking-widest block mt-1 opacity-60">Pulse</span>
        </div>
      </div>
    </div>
  );
};

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.TODO,
    dueDate: '',
    assigneeId: ''
  });

  useEffect(() => {
    if (!id) return;
    socket.emit('joinProject', id);
    const handleTaskUpdate = () => queryClient.invalidateQueries({ queryKey: ['project', id] });
    const handleStatsUpdate = () => queryClient.invalidateQueries({ queryKey: ['project-stats', id] });
    socket.on('taskUpdated', handleTaskUpdate);
    socket.on('statsUpdated', handleStatsUpdate);
    return () => {
      socket.off('taskUpdated', handleTaskUpdate);
      socket.off('statsUpdated', handleStatsUpdate);
    };
  }, [id, queryClient]);

  const { data: actualProject, isLoading: isProjectLoading } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    },
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const { data: stats } = useQuery<import('@/types').ProjectStats>({
    queryKey: ['project-stats', id],
    queryFn: async () => {
      const response = await api.get(`/projects/${id}/stats`);
      return response.data;
    },
    enabled: !!id,
  });

  const isOwner = actualProject?.ownerId === currentUser?.id || currentUser?.role === 'admin';

  const createTaskMutation = useMutation({
    mutationFn: async (newTask: Partial<Task>) => (await api.post(`/projects/${id}/tasks`, newTask)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] });
      setIsTaskSheetOpen(false);
      resetForm();
      toast({ title: "Seed Planted", description: "Operation node synchronized successfully." });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string, data: Partial<Task> }) => {
      const apiPath = currentUser?.role === 'admin' ? `/admin/tasks` : '/tasks';
      return (await api.patch(`${apiPath}/${taskId}`, data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] });
      setIsTaskSheetOpen(false);
      resetForm();
      toast({ title: "Node Recalibrated" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const apiPath = currentUser?.role === 'admin' ? `/admin/tasks` : '/tasks';
      await api.delete(`${apiPath}/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] });
      toast({ title: "Node Decommissioned", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTaskForm({ title: '', description: '', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, dueDate: '', assigneeId: '' });
    setEditingTask(null);
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assigneeId: task.assigneeId || ''
    });
    setIsTaskSheetOpen(true);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    
    const task = projectTasks.find(t => t.id === draggableId);
    
    const isAdmin = currentUser?.role === 'admin';
    const isAssignee = task?.assigneeId === currentUser?.id;
    const isCreator = task?.creatorId === currentUser?.id;
    const isUnassignedAndOwner = !task?.assigneeId && isOwner;

    const canManage = isAdmin || isAssignee || isCreator || isUnassignedAndOwner;

    if (!canManage) {
       toast({ title: "Access Violation", description: "Integrity lock active. State modification restricted.", variant: "destructive" });
       return;
    }
    updateTaskMutation.mutate({ taskId: draggableId, data: { status: destination.droppableId as TaskStatus } });
  };

  const allProjectTasks = actualProject?.tasks || [];
  const projectTasks = assigneeFilter === 'all' 
    ? allProjectTasks 
    : allProjectTasks.filter((t: Task) => (assigneeFilter === 'me' ? t.assigneeId === currentUser?.id : t.assigneeId === assigneeFilter));
    
  const statusCounts = stats?.statsByStatus || [];
  const getCount = (st: string) => Number(statusCounts.find(s => String(s.status).toLowerCase() === st.toLowerCase())?.count || 0);
  const doneCount = getCount('done');
  const inProgressCount = getCount('in_progress') || getCount('inprogress');
  const todoCount = getCount('todo');
  const totalCount = doneCount + inProgressCount + todoCount;
  const aggregateVitality = totalCount > 0 ? Math.round((doneCount * 100 + inProgressCount * 50) / totalCount) : 0;

  if (isProjectLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-primary font-bold tracking-widest animate-pulse uppercase text-xs">Analyzing Lattice Strands...</p>
      </div>
    );
  }

  const columns = {
    [TaskStatus.TODO]: projectTasks.filter((t: Task) => t.status === TaskStatus.TODO),
    [TaskStatus.IN_PROGRESS]: projectTasks.filter((t: Task) => t.status === TaskStatus.IN_PROGRESS),
    [TaskStatus.DONE]: projectTasks.filter((t: Task) => t.status === TaskStatus.DONE),
  };

  return (
    <div className="space-y-10 font-sans pb-32 px-4 md:px-8 max-w-[1600px] mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-slate-900 rounded-[3rem] border border-white/5 p-8 lg:p-12 shadow-2xl text-white"
      >
        <div className="absolute top-0 right-0 w-[40%] h-[100%] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row gap-10 items-center justify-between">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
               <Badge className="bg-emerald-500/10 text-emerald-400 font-bold px-3 py-1 rounded-full border border-emerald-500/20 text-[9px] uppercase tracking-widest">Active Core</Badge>
               <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest opacity-60">Sync: {totalCount} Nodes</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase leading-none break-words">
                {actualProject?.name}
              </h1>
              <p className="text-slate-400 text-sm lg:text-base font-medium max-w-2xl leading-relaxed mx-auto md:mx-0 opacity-80">
                {actualProject?.description || "Synchronizing ecological restoration layers with foundational biosphere protocols."}
              </p>
              
              <div className="pt-4 flex items-center justify-center md:justify-start gap-4">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md hover:bg-white/10 transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                    <Globe size={14} className="text-emerald-400 group-hover:text-white" />
                  </div>
                  <a 
                    href={`https://greeningindia.org/nodes/${actualProject?.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-white transition-colors"
                  >
                    Launch Digital Portal
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
               {isOwner && (
                 <Sheet open={isTaskSheetOpen} onOpenChange={(o) => { setIsTaskSheetOpen(o); if (!o) resetForm(); }}>
                   <SheetTrigger asChild>
                     <Button className="h-14 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/10 text-white font-bold transition-all hover:-translate-y-0.5 text-sm uppercase border-none group">
                       <Plus className="mr-2 w-5 h-5 group-hover:rotate-90 transition-transform" /> ACTIVATE NODE
                     </Button>
                   </SheetTrigger>
                   <SheetContent className="sm:max-w-md border-none p-0 bg-white">
                      <SheetHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
                        <SheetTitle className="text-2xl font-black text-slate-800 tracking-tight uppercase">Initiate Node</SheetTitle>
                        <SheetDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calibrate operational parameters.</SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="h-[calc(100vh-180px)] px-8">
                        <div className="py-8 space-y-6">
                          <div className="space-y-2">
                            <Label className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Headline</Label>
                            <Input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="h-12 bg-slate-50 border-none rounded-xl px-4 font-bold" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Priority</Label>
                              <Select value={taskForm.priority} onValueChange={(v: TaskPriority) => setTaskForm({...taskForm, priority: v})}>
                                <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl font-bold px-4 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl"><SelectItem value={TaskPriority.LOW}>Low</SelectItem><SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem><SelectItem value={TaskPriority.HIGH}>High</SelectItem></SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">State</Label>
                              <Select value={taskForm.status} onValueChange={(v: TaskStatus) => setTaskForm({...taskForm, status: v})}>
                                <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl font-bold px-4 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl"><SelectItem value={TaskStatus.TODO}>Todo</SelectItem><SelectItem value={TaskStatus.IN_PROGRESS}>Sprouting</SelectItem><SelectItem value={TaskStatus.DONE}>Done</SelectItem></SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Assigned Node</Label>
                             <Select value={taskForm.assigneeId} onValueChange={(v) => setTaskForm({...taskForm, assigneeId: v})}>
                               <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl font-bold px-4 text-xs">
                                 <SelectValue placeholder="System Default (Guardian)" />
                               </SelectTrigger>
                               <SelectContent className="rounded-xl border-none shadow-2xl">
                                 {users?.map(u => (
                                   <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Target Date</Label>
                             <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} className="h-12 bg-slate-50 border-none rounded-xl px-4 font-bold" />
                          </div>
                        </div>
                      </ScrollArea>
                      <div className="px-8 pb-8 pt-4">
                        <Button className="w-full h-14 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white uppercase" onClick={() => editingTask ? updateTaskMutation.mutate({ taskId: editingTask.id, data: taskForm }) : createTaskMutation.mutate(taskForm)} disabled={!taskForm.title}>CONFIRM INITIATION</Button>
                      </div>
                   </SheetContent>
                 </Sheet>
               )}
               <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                 <SelectTrigger className="w-[220px] h-14 bg-white/10 text-white border-white/10 rounded-2xl font-bold uppercase text-[10px] tracking-widest backdrop-blur-md hover:bg-white/20 transition-all text-left">
                   <Filter className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
                   <SelectValue placeholder="Filter by Assignee" />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl border-none shadow-2xl z-50">
                   <SelectItem value="all">All Guardians</SelectItem>
                   <SelectItem value="me">My Nodes</SelectItem>
                   {users?.filter((u: User) => u.id !== currentUser?.id).map((u: User) => (
                     <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
          </div>
          <ProjectPulse todo={todoCount} inProgress={inProgressCount} done={doneCount} vitality={aggregateVitality} />
        </div>
      </motion.div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex overflow-x-auto pb-6 gap-8 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible">
          {Object.entries(columns).map(([colId, tasks]) => (
            <div key={colId} className="min-w-[320px] max-w-[400px] flex-1 snap-start space-y-6 lg:min-w-0 lg:max-w-none">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                   <div className={cn("w-2 h-2 rounded-full", colId === TaskStatus.TODO ? "bg-slate-300" : colId === TaskStatus.IN_PROGRESS ? "bg-amber-400" : "bg-emerald-500")} />
                   <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">{colId.replace('_', ' ')}</h3>
                   <span className="text-[9px] font-bold text-slate-300 border border-slate-100 rounded-full px-2 py-0.5">{tasks.length}</span>
                </div>
              </div>

              <Droppable droppableId={colId}>
                {(provided, snap) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className={cn("flex-1 p-3 rounded-[2.5rem] transition-colors min-h-[500px]", snap.isDraggingOver ? "bg-emerald-50/30" : "bg-slate-50/30")}>
                    <AnimatePresence mode="popLayout">
                      {tasks.map((task: Task, idx: number) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(prov, snp) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className="mb-4 outline-none">
                              <motion.div 
                                layout 
                                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                className={cn("group bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 transition-all", snp.isDragging ? "shadow-xl border-emerald-500/30 rotate-1" : "hover:border-emerald-500/10")}
                              >
                                <div className="space-y-4">
                                  <div className="flex items-start justify-between">
                                     <div className={cn("text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", task.priority === TaskPriority.HIGH ? "border-red-100 text-red-500" : task.priority === TaskPriority.MEDIUM ? "border-amber-100 text-amber-500" : "border-emerald-100 text-emerald-500")}>
                                        {task.priority}
                                     </div>
                                     <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                       {(currentUser?.role === 'admin' || task.assigneeId === currentUser?.id || task.creatorId === currentUser?.id || (!task.assigneeId && isOwner)) && (
                                         <>
                                           <button onClick={() => handleEditClick(task)} className="w-7 h-7 bg-slate-50 text-slate-400 hover:bg-emerald-500 hover:text-white rounded-lg flex items-center justify-center transition-all"><Pencil size={12} /></button>
                                           <button onClick={() => { if (window.confirm("Uproot?")) deleteTaskMutation.mutate(task.id); }} className="w-7 h-7 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center transition-all"><Trash2 size={12} /></button>
                                         </>
                                       )}
                                     </div>
                                  </div>
                                  <h4 className="text-base font-bold text-slate-800 tracking-tight leading-tight uppercase font-sans">{task.title}</h4>
                                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                      <div className="flex items-center text-[9px] font-bold text-slate-400 uppercase">
                                          <Calendar size={12} className="mr-1 text-emerald-500/30" />
                                          {task.dueDate ? formatDate(task.dueDate) : "Cycle Active"}
                                      </div>
                                      {task.assignee && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[8px] font-bold uppercase text-slate-300">{task.assignee.name || task.assignee.email.split('@')[0]}</span>
                                          <Avatar className="w-7 h-7 rounded-xl border-2 border-white shadow-sm ring-1 ring-slate-100">
                                              <AvatarFallback className="bg-emerald-50 text-emerald-600 text-[8px] font-bold">{(task.assignee.name || task.assignee.email).substring(0, 1)}</AvatarFallback>
                                          </Avatar>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </motion.div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                    {tasks.length === 0 && <div className="h-40 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex items-center justify-center opacity-40"><p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Dormant Node</p></div>}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default ProjectDetailsPage;
