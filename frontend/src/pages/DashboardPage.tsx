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
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
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

import SystemOverview from '@/components/SystemOverview';

const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  const { data: projectsData, isLoading } = useQuery<PaginatedResponse<Project> | Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects');
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
      const response = await api.patch(`/projects/${id}`, data);
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
      await api.delete(`/projects/${id}`);
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
    if (window.confirm("Are you sure you want to uproot this project? This cannot be undone.")) {
      deleteProjectMutation.mutate(id);
    }
  };

  const projectItems = Array.isArray(projectsData) ? projectsData : (projectsData?.data || []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary font-black tracking-widest animate-pulse uppercase">Syncing Ecosystem Pulse...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 font-sans">
      <SystemOverview isOpen={isOverviewOpen} onOpenChange={setIsOverviewOpen} />

      {/* Ecosystem Pulse Banner - Clickable for System Overview */}
      <Button 
        variant="ghost" 
        className="relative w-full h-auto p-0 overflow-hidden rounded-[3rem] text-left block group border-none hover:bg-transparent"
        onClick={(e) => {
          e.preventDefault();
          setIsOverviewOpen(true);
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[3rem] p-12 green-gradient text-white shadow-2xl shadow-emerald-900/10 transition-all duration-500 group-hover:shadow-emerald-900/20"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/leaf.png')] opacity-10 group-hover:scale-110 transition-transform duration-1000 pointer-events-none" />
          <div className="relative z-10 space-y-6 pointer-events-none">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <Trophy size={14} className="text-emerald-300" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-emerald-100">Bio-Architect Protocol</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none uppercase">
              Ecosystem <br />
              <span className="text-emerald-300">Pulse.</span>
            </h1>
            <p className="text-emerald-50/70 text-lg max-w-xl font-medium leading-relaxed">
              Managing the foundational layers of India's environmental restoration. Current bandwidth supports expansion of active cultivation zones.
            </p>
          </div>
        </motion.div>
      </Button>

      {/* Projects List Section */}
      <div className="space-y-10">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-slate-800 uppercase">CULTIVATION LAYERS</h2>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Global impact projects overseen by your protocol</p>
          </div>
          
          <div className="flex items-center gap-6">
            <Button 
              className="rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 text-white font-black shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all"
              onClick={() => {
                createProjectMutation.mutate({ 
                  name: `Ecological Core #${projectItems ? projectItems.length + 1 : 1}`,
                  description: 'Expanding environmental boundaries through strategic resource allocation.'
                });
              }}
            >
              <Plus className="mr-2 h-5 w-5" /> CREATE NEW PROJECT
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-10">
          <AnimatePresence mode="popLayout">
            {projectItems?.map((project: Project, index: number) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                layout
              >
                <Card 
                  className="group relative overflow-hidden bg-white hover:bg-slate-50 border-emerald-50 hover:border-emerald-200 rounded-[2.5rem] p-8 shadow-[0_4px_24px_rgba(6,78,59,0.03)] hover:shadow-[0_32px_64px_-16px_rgba(6,78,59,0.12)] transition-all duration-500 h-[320px] flex flex-col justify-between cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                            <Leaf size={24} />
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={(e) => handleEdit(project, e)}
                                className="w-10 h-10 bg-slate-100/50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                            >
                                <Pencil size={16} />
                            </button>
                            <button 
                                onClick={(e) => handleDelete(project.id, e)}
                                className="w-10 h-10 bg-slate-100/50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-3xl font-black text-slate-800 tracking-tighter group-hover:text-primary transition-colors leading-none uppercase">{project.name}</h3>
                      <p className="text-slate-500 font-medium line-clamp-3 leading-relaxed text-sm">
                        {project.description || "Synthesizing regional environmental protocols for enhanced bio-diversity and ecosystem stability."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Calendar size={14} className="mr-2 text-primary/40" />
                          Initiated: {new Date(project.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.15em] opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                          OVERSEE <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {projectItems?.length === 0 && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-8 bg-white/50 backdrop-blur-sm rounded-[4rem] border-2 border-dashed border-emerald-100"
             >
               <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center animate-pulse">
                 <Leaf className="w-16 h-16 text-primary/30" />
               </div>
               <div className="space-y-3">
                 <h3 className="text-4xl font-black text-slate-800 tracking-tighter">FERTILE SOIL DETECTED</h3>
                 <p className="text-slate-400 text-xl max-w-sm mx-auto font-medium leading-relaxed">The ecosystem is awaiting its first seeds. Initiate planting to begin carbon capture protocols.</p>
               </div>
               <Button 
                   onClick={() => createProjectMutation.mutate({ name: "Core Ecological Seed", description: "The foundational layer of your local environment initiative." })}
                   className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/10 text-white font-black transition-all hover:-translate-y-1"
               >
                 <Plus className="mr-2 w-5 h-5" /> ADD MISSION TASK
               </Button>
             </motion.div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800 uppercase">Recalibrate Layer</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Project Identifier</Label>
              <Input 
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ecosystem Logic</Label>
              <Input 
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                placeholder="Describe the environmental impact..."
                className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold focus-visible:ring-primary/20 transition-all placeholder:text-slate-200 placeholder:opacity-40"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
                onClick={() => editingProject && updateProjectMutation.mutate({ id: editingProject.id, data: editForm })}
                className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-xl font-black transition-all shadow-lg shadow-primary/20"
                disabled={updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending ? <Loader2 className="animate-spin" /> : "APPLY CALIBRATION"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
