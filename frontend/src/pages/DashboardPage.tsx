import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '@/api/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  Leaf, 
  Trophy,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Compass,
  LayoutGrid,
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Project, PaginatedResponse } from '@/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/types';

import SystemOverview from '@/components/SystemOverview';
import { AdminTelemetry } from '@/components/AdminTelemetry';

type TabType = 'private' | 'global';

const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('private');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isAdminTelemetryOpen, setIsAdminTelemetryOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [globalOwnerFilter, setGlobalOwnerFilter] = useState('all');

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const { data: projectsData, isLoading, isFetching } = useQuery<PaginatedResponse<Project> | Project[]>({
    queryKey: ['projects', page],
    queryFn: async () => {
      const apiPath = currentUser?.role === 'admin' ? '/admin/projects' : '/projects';
      const response = await api.get(`${apiPath}?page=${page}&limit=8`);
      return response.data;
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (newProject: { name: string; description: string }) => {
      const response = await api.post('/projects', newProject);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Seed Planted!",
        description: "Your new project ecosystem has been created.",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const apiPath = currentUser?.role === 'admin' ? `/admin/projects` : '/projects';
      const response = await api.patch(`${apiPath}/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditDialogOpen(false);
      toast({ title: "Ecosystem Updated", description: "The project parameters have been recalibrated." });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const apiPath = currentUser?.role === 'admin' ? `/admin/projects` : '/projects';
      await api.delete(`${apiPath}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Layer Decommissioned", description: "The project has been removed from active oversight.", variant: "destructive" });
    },
  });

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setEditForm({ name: project.name, description: project.description || '' });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to uproot this project?")) {
      deleteProjectMutation.mutate(id);
    }
  };

  const projectItems = Array.isArray(projectsData) ? projectsData : (projectsData?.data || []);
  const meta = !Array.isArray(projectsData) ? (projectsData as PaginatedResponse<Project>)?.meta : null;
  const totalPages = meta?.lastPage || 1;

  const myProjects = projectItems.filter(p => p.ownerId === currentUser?.id);
  const globalProjects = globalOwnerFilter === 'all' ? projectItems : projectItems.filter(p => p.ownerId === globalOwnerFilter);
  const displayedProjects = activeTab === 'private' ? myProjects : globalProjects;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary font-bold tracking-widest animate-pulse uppercase text-sm">Synchronizing Lattice...</p>
      </div>
    );
  }

  const ProjectCard = ({ project, isOwner }: { project: Project, isOwner: boolean }) => (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0 }
      }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      layout
    >
      <Card 
        className={cn(
          "group relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-sm border-t-[0.5px] border-white/60 transition-all duration-500 h-[280px] flex flex-col justify-between cursor-pointer",
          isOwner 
            ? "hover:bg-white hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-900/10" 
            : "hover:bg-white hover:border-slate-400 hover:shadow-2xl hover:shadow-slate-900/10"
        )}
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        {/* Glow effect */}
        <div className={cn(
            "absolute -top-16 -right-16 w-32 h-32 blur-3xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-700",
            isOwner ? "bg-emerald-500" : "bg-slate-500"
        )} />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
              <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm bg-white",
                  isOwner ? "text-primary group-hover:bg-primary group-hover:text-white" : "text-slate-500 group-hover:bg-slate-800 group-hover:text-white"
              )}>
                  {isOwner ? <Leaf size={20} className="group-hover:rotate-12 transition-transform duration-500" /> : <Compass size={20} className="group-hover:scale-110 transition-transform duration-500" />}
              </div>
              <div className="flex items-center gap-2">
                {(isOwner || currentUser?.role === 'admin') && (
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-500">
                      <button 
                          onClick={(e) => handleEdit(project, e)}
                          className="w-8 h-8 bg-white/50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                      >
                          <Pencil size={12} />
                      </button>
                      <button 
                          onClick={(e) => handleDelete(project.id, e)}
                          className="w-8 h-8 bg-white/50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                          <Trash2 size={12} />
                      </button>
                  </div>
                )}
                <Badge variant="outline" className={cn(
                    "text-[8px] font-bold uppercase border-none px-3 py-1 rounded-full",
                    isOwner ? "text-emerald-600 bg-emerald-50 shadow-sm shadow-emerald-100" : "text-slate-500 bg-slate-50 border border-slate-100"
                )}>
                  {isOwner ? <Lock size={10} className="mr-1.5" /> : <Globe size={10} className="mr-1.5" />}
                  {isOwner ? 'Secure Core' : 'Public Grid'}
                </Badge>
              </div>
          </div>
          
          <div className="space-y-2">
            <h3 className={cn(
                "text-xl font-bold tracking-tight transition-colors leading-tight uppercase font-sans line-clamp-2",
                isOwner ? "text-slate-800 group-hover:text-primary" : "text-slate-600 group-hover:text-slate-900"
            )}>{project.name}</h3>
            <p className="text-slate-500/80 font-medium text-xs line-clamp-3 leading-relaxed">
              {project.description || "Synthesizing regional environmental protocols for enhanced bio-diversity and ecosystem stability."}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-100/50">
          <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Calendar size={12} className={cn("mr-1.5", isOwner ? "text-emerald-500/50" : "text-slate-400/50")} />
              {new Date(project.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </div>
          <motion.div 
            className={cn(
                "flex items-center gap-1.5 font-bold text-[9px] uppercase tracking-wider transition-all",
                isOwner ? "text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2" : "text-slate-400"
            )}
          >
              EXPLORE PROTOCOL <ArrowRight size={12} />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="max-w-[1500px] mx-auto space-y-10 font-sans px-4 md:px-8 pb-32">
      <SystemOverview isOpen={isOverviewOpen} onOpenChange={setIsOverviewOpen} />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group cursor-pointer"
        onClick={() => setIsOverviewOpen(true)}
      >
        <div className="relative overflow-hidden rounded-[4rem] p-10 lg:p-14 bg-slate-950 border border-white/5 shadow-2xl transition-all duration-700 hover:shadow-emerald-900/20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-slate-900/50 pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full backdrop-blur-xl">
              <Trophy size={14} className="text-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-300">Biometric Integrity v4.2</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.85] uppercase text-white">
                Ecosystem <span className="text-emerald-400">Pulse.</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-lg max-w-xl font-medium leading-relaxed">
                Orchestrating autonomous environmental restoration through decentralized continental nodes.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* High-Density Tab Navigation */}
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white/40 backdrop-blur-md p-4 rounded-[2.5rem] border border-white/60 shadow-lg">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('private')}
              className={cn(
                "relative flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 outline-none",
                activeTab === 'private' ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Shield size={14} />
              Personal Workspace
              {activeTab === 'private' && (
                <motion.div layoutId="tab-bg" className="absolute inset-0 bg-emerald-50 rounded-2xl -z-10 shadow-sm border border-emerald-100" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('global')}
              className={cn(
                "relative flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 outline-none",
                activeTab === 'global' ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid size={14} />
              Continental Grid
              {activeTab === 'global' && (
                <motion.div layoutId="tab-bg" className="absolute inset-0 bg-slate-100 rounded-2xl -z-10 shadow-sm border border-slate-200" />
              )}
            </button>
            {activeTab === 'global' && (
              <Select value={globalOwnerFilter} onValueChange={setGlobalOwnerFilter}>
                <SelectTrigger className="w-[200px] h-12 bg-white/40 text-slate-600 border-none rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm outline-none ring-0 focus:ring-0">
                  <Filter className="w-3 h-3 text-emerald-500" />
                  <SelectValue placeholder="All Guardians" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl z-50">
                  <SelectItem value="all">All Ecosystems</SelectItem>
                  {users?.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-4">
            {currentUser?.role === 'admin' && (
              <Button 
                className="rounded-2xl h-12 px-6 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold shadow-xl border border-emerald-500/30 transition-all hover:-translate-y-1 active:scale-95 text-xs tracking-widest"
                onClick={() => setIsAdminTelemetryOpen(true)}
              >
                <Activity className="mr-2 h-4 w-4" /> SYSTEM TELEMETRY
              </Button>
            )}
            <Button 
              className="rounded-2xl h-12 px-8 bg-emerald-500 hover:bg-emerald-400 text-white font-bold shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1 active:scale-95 text-xs tracking-widest"
              onClick={() => createProjectMutation.mutate({ name: `Eco-Node ${Math.floor(1000 + Math.random() * 9000)}`, description: 'Initializing foundational restoration layer.' })}
            >
              <Plus className="mr-2 h-4 w-4" /> ACTIVATE NEW NODE
            </Button>
          </div>
        </div>

        {/* Dynamic High-Density Grid */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {displayedProjects.length > 0 ? (
                displayedProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} isOwner={p.ownerId === currentUser?.id} />
                ))
              ) : (
                <div className="col-span-full py-40 border-2 border-dashed border-emerald-100/50 rounded-[4rem] flex flex-col items-center justify-center text-center px-10 space-y-8">
                    <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center animate-bounce shadow-inner border border-emerald-100">
                        <Leaf className="text-emerald-400 w-12 h-12" />
                    </div>
                    <div className="space-y-3 max-w-sm">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Workspace Dormant</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">Welcome, Guardian. Your personal lattice is currently clear. <br />Use the <span className="text-emerald-500 underline">Activate New Node</span> button above to begin your mission.</p>
                    </div>
                </div>
              )}
            </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {meta && (
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-4 bg-white/40 p-2.5 rounded-full backdrop-blur-md border border-white/60 shadow-sm">
              <Button 
                disabled={page <= 1 || isFetching} 
                onClick={() => setPage(page - 1)}
                variant="ghost" 
                className="h-10 rounded-full font-bold uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-200"
              ><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest min-w-[80px] text-center">
                Page {meta?.page || 1} of {totalPages}
              </span>
              <Button 
                disabled={page >= totalPages || isFetching} 
                onClick={() => setPage(page + 1)}
                variant="ghost" 
                className="h-10 rounded-full font-bold uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-200"
              >Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </div>
        )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-10">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tight text-slate-800 uppercase leading-none">Recalibrate Layer</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Node Identifier</Label>
              <Input 
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold focus-visible:ring-emerald-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Biosphere Logic</Label>
              <Input 
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
                onClick={() => editingProject && updateProjectMutation.mutate({ id: editingProject.id, data: editForm })}
                className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm transition-all shadow-lg shadow-emerald-200"
                disabled={updateProjectMutation.isPending}
            >
              APPLY CALIBRATION
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminTelemetry isOpen={isAdminTelemetryOpen} onOpenChange={setIsAdminTelemetryOpen} />
    </div>
  );
};

export default DashboardPage;
