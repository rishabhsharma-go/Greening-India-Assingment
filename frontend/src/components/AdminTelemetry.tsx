import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Activity, ShieldAlert, CheckCircle2, Clock, Circle } from 'lucide-react';
import type { ProjectStats } from '@/types';

interface AdminTelemetryProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminTelemetry = ({ isOpen, onOpenChange }: AdminTelemetryProps) => {
  const { data: stats, isLoading } = useQuery<ProjectStats>({
    queryKey: ['admin_system_stats'],
    queryFn: async () => {
      const response = await api.get('/admin/projects/system/stats');
      return response.data?.data || response.data;
    },
    enabled: isOpen,
  });

  const getStatusVisuals = (status: string) => {
    switch (status) {
      case 'todo': return { icon: <Circle size={14} className="text-slate-400" />, color: "bg-slate-100 text-slate-700" };
      case 'in_progress': return { icon: <Clock size={14} className="text-blue-500" />, color: "bg-blue-500/10 text-blue-500" };
      case 'done': return { icon: <CheckCircle2 size={14} className="text-emerald-500" />, color: "bg-emerald-500/10 text-emerald-500" };
      default: return { icon: <Circle size={14} />, color: "bg-slate-100 text-slate-500" };
    }
  };

  const actualStats = stats;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-[3rem] border-none shadow-2xl p-10 bg-slate-950 text-white overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <DialogHeader className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
               <ShieldAlert size={24} />
             </div>
             <div>
               <DialogTitle className="text-3xl font-black tracking-tight uppercase leading-none">
                 System Telemetry
               </DialogTitle>
               <p className="text-emerald-400/80 font-black text-[10px] tracking-[0.3em] uppercase mt-1">Admin God-Mode Analytics</p>
             </div>
          </div>
        </DialogHeader>

        <div className="relative z-10 py-6 space-y-10 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 pt-10">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-emerald-500 font-bold tracking-[0.2em] animate-pulse uppercase text-[10px]">Accessing God Protocol...</p>
            </div>
          ) : (
            <>
              {/* Overall Task Vitality */}
              <div className="space-y-4">
                <h3 className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] border-b border-white/10 pb-2">Global Pulse State (All Nodes)</h3>
                <div className="grid grid-cols-3 gap-4">
                  {['todo', 'in_progress', 'done'].map((statusKey) => {
                    const stat = actualStats?.statsByStatus?.find((s) => s.status === statusKey);
                    const count = stat ? Number(stat.count) : 0;
                    const visuals = getStatusVisuals(statusKey);
                    
                    return (
                      <div key={statusKey} className="bg-white/5 rounded-3xl p-6 border border-white/5 flex flex-col gap-3">
                        <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest text-slate-300">
                          {visuals.icon} 
                          {statusKey.replace('_', ' ')}
                        </div>
                        <div className="text-4xl font-black">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leaderboard / Assignee Load */}
              <div className="space-y-4">
                <h3 className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] border-b border-white/10 pb-2">Guardian Workload Metrics</h3>
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                  {actualStats?.statsByAssignee && actualStats.statsByAssignee.length > 0 ? (
                    <div className="space-y-4">
                      {actualStats.statsByAssignee.map((assigneeStat, idx: number) => (
                        <div key={idx} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                               #{idx + 1}
                             </div>
                             <span className="font-bold text-sm tracking-wide text-white group-hover:text-emerald-400 transition-colors">
                               {assigneeStat.assignee || 'Unassigned Guardians'}
                             </span>
                          </div>
                          <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-black text-[10px] tracking-widest border border-emerald-500/20">
                            <Activity size={12} />
                            {assigneeStat.count} Pulses
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs font-black uppercase tracking-widest">
                       No active pulses detected in the grid.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
