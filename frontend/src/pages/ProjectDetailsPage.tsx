import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '@/api/axios';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Loader2,
  Trash2,
  Leaf,
  Calendar,
  Pencil
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useToast } from '@/hooks/use-toast';
import type { Project, Task } from '@/types';

import { TaskStatus, TaskPriority } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';

const ProjectPulse = ({ todo, inProgress, done, vitality }: { todo: number, inProgress: number, done: number, vitality: number }) => {
  const total = todo + inProgress + done;
  if (total === 0) return null;

  const segments = [
    { value: done, color: '#10b981', label: 'Flowering' },
    { value: inProgress, color: '#f59e0b', label: 'Sprouting' },
    { value: todo, color: '#94a3b8', label: 'Seeds' }
  ];

  let cumulativeOffset = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative w-48 h-48 flex items-center justify-center group">
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="#f1f5f9"
          strokeWidth="8"
        />
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
              strokeWidth="10"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (percentage / 100) * circumference }}
              transition={{ duration: 1.5, delay: 0.2, ease: "circOut" }}
              style={{ strokeDashoffset: circumference - (percentage / 100) * circumference, rotate: (offset / circumference) * 360 }}
              strokeLinecap="round"
              className="drop-shadow-md"
            />
          );
        })}
      </svg>
      <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col items-center justify-center text-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl font-black text-slate-800 tracking-tighter"
        >
          {vitality}%
        </motion.span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Vitality</span>
      </div>
    </div>
  );
};

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
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

    const handleTaskUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    };

    const handleStatsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] });
    };

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

  const { data: stats } = useQuery<import('@/types').ProjectStats>({
    queryKey: ['project-stats', id],
    queryFn: async () => {
      const response = await api.get(`/projects/${id}/stats`);
      return response.data;
    },
    enabled: !!id,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (newTask: Partial<Task>) => {
      const response = await api.post(`/projects/${id}/tasks`, newTask);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] });
      setIsTaskSheetOpen(false);
      resetForm();
      toast({ title: "Task Cultivated", description: "A new bud has been added to the ecosystem." });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string, data: Partial<Task> }) => {
      const response = await api.patch(`/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] });
      setIsTaskSheetOpen(false);
      resetForm();
      toast({ title: "Task Recalibrated", description: "Growth parameters have been updated." });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', id] });
      toast({ title: "Task Uprooted", variant: "destructive" });
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
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    updateTaskMutation.mutate({ 
      taskId: draggableId, 
      data: { status: destination.droppableId as TaskStatus } 
    });
  };

  const projectTasks = actualProject?.tasks || [];
  const statusCounts = stats?.statsByStatus || [];
  
  const getCount = (status: string) => {
    const item = statusCounts.find(s => String(s.status).toLowerCase() === status.toLowerCase());
    return item ? Number(item.count) : 0;
  };

  const doneCount = getCount('done');
  const inProgressCount = getCount('in_progress') || getCount('inprogress');
  const todoCount = getCount('todo');
  const totalCount = doneCount + inProgressCount + todoCount;

  const aggregateVitality = totalCount > 0 
    ? Math.round((doneCount * 100 + inProgressCount * 50) / totalCount) 
    : 0;

  if (isProjectLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary font-black tracking-widest animate-pulse uppercase">Syncing Forest Layers...</p>
      </div>
    );
  }

  const columns = {
    [TaskStatus.TODO]: projectTasks.filter((t: Task) => t.status === TaskStatus.TODO) || [],
    [TaskStatus.IN_PROGRESS]: projectTasks.filter((t: Task) => t.status === TaskStatus.IN_PROGRESS) || [],
    [TaskStatus.DONE]: projectTasks.filter((t: Task) => t.status === TaskStatus.DONE) || [],
  };

  return (
    <div className="space-y-12 font-sans pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-[4rem] border border-white/60 p-10 lg:p-14 shadow-2xl shadow-emerald-900/5 group"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
               <Badge className="bg-emerald-50 text-emerald-600 font-black px-4 py-1.5 rounded-full border-2 border-emerald-100/50 text-[10px] uppercase tracking-[0.2em]">Active Core Layer</Badge>
               <span className="px-4 py-1.5 bg-white/50 text-slate-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-slate-200/50">
                  {totalCount} Total Buds
               </span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-6xl lg:text-8xl font-black text-slate-800 tracking-tighter leading-none group-hover:scale-[1.01] transition-transform duration-700">
                {actualProject?.name.split(' ')[0]} <br/>
                <span className="text-primary">{actualProject?.name.split(' ').slice(1).join(' ')}</span>
              </h1>
              <p className="text-slate-400 text-lg lg:text-xl font-medium max-w-2xl leading-relaxed mx-auto lg:mx-0">
                {actualProject?.description || "Initializing environmental restoration protocols for enhanced biodiversity."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
               <Sheet open={isTaskSheetOpen} onOpenChange={(open) => {
                 setIsTaskSheetOpen(open);
                 if (!open) resetForm();
               }}>
                 <SheetTrigger asChild>
                   <Button className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 text-white font-black transition-all hover:-translate-y-1 text-lg tracking-tight">
                     <Plus className="mr-2 w-6 h-6" /> ADD MISSION TASK
                   </Button>
                 </SheetTrigger>
                 <SheetContent className="sm:max-w-md border-none rounded-l-[3rem] px-8 bg-white shadow-2xl">
                   <SheetHeader className="space-y-6 pt-10">
                     <div className="bg-emerald-50 w-20 h-20 rounded-3xl flex items-center justify-center mb-2">
                       <Leaf className="w-10 h-10 text-primary" />
                     </div>
                     <div>
                       <SheetTitle className="text-4xl font-black text-slate-800 tracking-tighter leading-none mb-2">
                         {editingTask ? "Recalibrate Bud" : "Bud Initiation"}
                       </SheetTitle>
                       <SheetDescription className="text-lg font-medium text-slate-400">Define the growth parameters for this task bud.</SheetDescription>
                     </div>
                   </SheetHeader>
                   <div className="space-y-8 py-10 overflow-y-auto max-h-[70vh] pr-4">
                     <div className="space-y-3">
                       <Label className="font-black text-slate-500 uppercase tracking-[0.15em] text-[10px] ml-1">Task Headline</Label>
                       <Input 
                         value={taskForm.title} 
                         onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                         placeholder="e.g. Reforestation Phase 1"
                         className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold"
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-3">
                         <Label className="font-black text-slate-500 uppercase tracking-[0.15em] text-[10px] ml-1">Vitality</Label>
                         <Select value={taskForm.priority} onValueChange={(v: TaskPriority) => setTaskForm({...taskForm, priority: v})}>
                           <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl font-bold">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="rounded-2xl border-none shadow-2xl">
                             <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                             <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                             <SelectItem value={TaskPriority.HIGH} className="text-red-500 font-bold">High</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-3">
                         <Label className="font-black text-slate-500 uppercase tracking-[0.15em] text-[10px] ml-1">State</Label>
                         <Select value={taskForm.status} onValueChange={(v: TaskStatus) => setTaskForm({...taskForm, status: v})}>
                           <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl font-bold">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="rounded-2xl border-none shadow-2xl">
                             <SelectItem value={TaskStatus.TODO}>Seeds</SelectItem>
                             <SelectItem value={TaskStatus.IN_PROGRESS}>Sprouting</SelectItem>
                             <SelectItem value={TaskStatus.DONE}>Flowering</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                     </div>
                     <div className="space-y-3">
                        <Label className="font-black text-slate-500 uppercase tracking-[0.15em] text-[10px] ml-1">Harvest Date</Label>
                        <Input 
                          type="date"
                          value={taskForm.dueDate} 
                          onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})}
                          className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="font-black text-slate-500 uppercase tracking-[0.15em] text-[10px] ml-1">Guardian (Assignee)</Label>
                        <Select 
                          value={taskForm.assigneeId || 'unassigned'} 
                          onValueChange={(v) => setTaskForm({...taskForm, assigneeId: v === 'unassigned' ? '' : v})}
                        >
                          <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl font-bold">
                            <SelectValue placeholder="Assign a guardian" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                             <SelectItem value="unassigned">No Guardian</SelectItem>
                             {actualProject?.owner && (
                               <SelectItem value={actualProject.owner.id}>
                                 {actualProject.owner.name} (Owner)
                               </SelectItem>
                             )}
                          </SelectContent>
                        </Select>
                      </div>
                   </div>
                   <SheetFooter>
                     <Button 
                       className="w-full h-16 rounded-[1.5rem] text-xl font-black bg-primary mt-4" 
                       onClick={() => editingTask ? updateTaskMutation.mutate({ taskId: editingTask.id, data: taskForm }) : createTaskMutation.mutate(taskForm)} 
                       disabled={!taskForm.title}
                     >
                       {editingTask ? "APPLY CHANGES" : "INITIATE GROWTH"}
                     </Button>
                   </SheetFooter>
                 </SheetContent>
               </Sheet>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-12 bg-white/60 backdrop-blur-md p-10 rounded-[3rem] shadow-inner shadow-slate-100 border border-white/80">
            <ProjectPulse todo={todoCount} inProgress={inProgressCount} done={doneCount} vitality={aggregateVitality} />
            
            <div className="space-y-6 min-w-[180px]">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  <span>🌸 Flowering</span>
                  <span>{totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%</span>
                </div>
                <div className="h-2 w-full bg-emerald-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-amber-500">
                  <span>🌿 Sprouting</span>
                  <span>{totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0}%</span>
                </div>
                <div className="h-2 w-full bg-amber-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalCount > 0 ? (inProgressCount / totalCount) * 100 : 0}%` }}
                    className="h-full bg-amber-400 rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>🌱 Seeds</span>
                  <span>{totalCount > 0 ? Math.round((todoCount / totalCount) * 100) : 0}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalCount > 0 ? (todoCount / totalCount) * 100 : 0}%` }}
                    className="h-full bg-slate-400 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 min-h-[700px]">
          {Object.entries(columns).map(([colId, tasks]) => (
            <div key={colId} className="flex flex-col space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                   <div className={cn(
                      "w-3 h-3 rounded-full",
                      colId === TaskStatus.TODO ? "bg-slate-300" : 
                      colId === TaskStatus.IN_PROGRESS ? "bg-amber-400 animate-pulse" : 
                      "bg-primary"
                   )} />
                   <h3 className="text-xl font-black text-slate-800 tracking-tight capitalize">{colId.replace('_', ' ')}</h3>
                   <span className="bg-slate-100 text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">{tasks.length} BUDS</span>
                </div>
              </div>

              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                        "flex-1 p-2 rounded-[2.5rem] transition-all duration-300",
                        snapshot.isDraggingOver ? "bg-emerald-50/50 ring-2 ring-primary/10 ring-inset" : "bg-transparent"
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {tasks.map((task: Task, index: number) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="mb-6 outline-none">
                              <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={cn(
                                    "bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_4px_24px_rgba(6,78,59,0.02)] transition-all duration-300 group hover:border-emerald-200 hover:shadow-[0_12px_44px_-12px_rgba(6,78,59,0.1)]",
                                    snapshot.isDragging ? "shadow-2xl border-primary/50 rotate-1 scale-[1.02]" : ""
                                )}
                              >
                                <div className="space-y-4">
                                  <div className="flex items-start justify-between">
                                     <Badge className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 border-none rounded-full",
                                        task.priority === TaskPriority.HIGH ? "bg-red-50 text-red-500" : 
                                        task.priority === TaskPriority.MEDIUM ? "bg-amber-50 text-amber-600" : 
                                        "bg-emerald-50 text-emerald-600"
                                     )}>
                                        {task.priority} VITALITY
                                     </Badge>
                                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button 
                                          onClick={() => handleEditClick(task)}
                                          className="text-slate-400 hover:text-primary transition-colors p-1"
                                       >
                                          <Pencil size={16} />
                                       </button>
                                       <button 
                                          onClick={() => {
                                            if (window.confirm("Uproot this operation bud?")) {
                                              deleteTaskMutation.mutate(task.id);
                                            }
                                          }}
                                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                        >
                                          <Trash2 size={16} />
                                       </button>
                                     </div>
                                  </div>
                                  
                                  <h4 className="text-xl font-black text-slate-800 tracking-tight leading-snug group-hover:text-primary transition-colors">{task.title}</h4>
                                  
                                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                          <Calendar size={12} className="text-primary/40" />
                                          {task.dueDate ? formatDate(task.dueDate) : "No Harvest Date"}
                                      </div>
                                      {task.assignee && (
                                        <Avatar className="w-8 h-8 rounded-xl border-2 border-white shadow-sm ring-1 ring-slate-100">
                                            <AvatarFallback className="bg-emerald-50 text-primary text-[10px] font-black uppercase">
                                        {(task.assignee.name || task.assignee.email).substring(0, 1)}
                                            </AvatarFallback>
                                        </Avatar>
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
                    
                    {tasks.length === 0 && (
                        <div className="h-32 border-2 border-dashed border-slate-100 rounded-[2rem] flex items-center justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            No active buds
                        </div>
                    )}
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
