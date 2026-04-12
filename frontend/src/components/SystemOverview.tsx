import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Zap,
  CheckCircle2,
  TreePine,
  Wind
} from "lucide-react";
import { motion } from "framer-motion";

interface SystemOverviewProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const SystemOverview = ({ isOpen, onOpenChange }: SystemOverviewProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl border-none p-0 bg-slate-950 text-white overflow-hidden">
        <div className="sr-only">
          <SheetTitle>System Overview</SheetTitle>
          <SheetDescription>Detailed project specifications and environmental protocols.</SheetDescription>
        </div>
        <ScrollArea className="h-full">
          {/* Hero Section */}
          <div className="relative h-80 flex items-end p-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
            <motion.div 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.4 }}
              className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80')] bg-cover bg-center"
            />
            <div className="relative z-20 space-y-4">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black px-4 py-1 text-[10px] uppercase tracking-[0.2em]">
                System Codex v2.4.0
              </Badge>
              <h2 className="text-6xl font-black tracking-tighter leading-none">
                GREENING <br />
                <span className="text-emerald-400 font-outline">INDIA.</span>
              </h2>
            </div>
          </div>

          <div className="p-10 space-y-16 pb-20">
            {/* What is Greening India? */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TreePine size={20} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">What is Greening India?</h3>
              </div>
              <p className="text-slate-400 text-lg leading-relaxed font-medium">
                Greening India is a <span className="text-emerald-400 font-bold">next-generation ecological restoration platform</span> designed to combat deforestation and climate change through technology. We provide bio-architects and environmental guardians with a precision toolkit to launch, manage, and monitor large-scale reforestation initiatives across the subcontinent.
              </p>
            </section>

            {/* Why it Matters? */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Zap size={20} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Why it Matters?</h3>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50">
                  <div className="mt-1 text-emerald-400"><Wind size={18} /></div>
                  <p className="text-slate-400 text-sm font-medium">
                    <strong className="text-white block mb-1">Carbon Sequestration</strong>
                    Every project tracked in our system contributes directly to neutralizing the national carbon footprint.
                  </p>
                </div>
                <div className="flex gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50">
                  <div className="mt-1 text-blue-400"><Globe size={18} /></div>
                  <p className="text-slate-400 text-sm font-medium">
                    <strong className="text-white block mb-1">Biodiversity Restoration</strong>
                    We help reintroduce native species to barren lands, restoring natural habitats and local water tables.
                  </p>
                </div>
              </div>
            </section>

            {/* FAQs */}
            <section className="space-y-8">
               <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Frequently Asked Questions</h3>
              </div>
              
              <div className="space-y-6">
                {[
                  { 
                    q: "How are projects monitored?", 
                    a: "We use a 'Vitality Index' that aggregates real-time task data from site guardians to provide a live health score for every forest node." 
                  },
                  { 
                    q: "What is the role of a Bio-Architect?", 
                    a: "Bio-Architects are lead regional overseers who model hierarchical cultivation layers to ensure optimal resource allocation." 
                  },
                  { 
                    q: "Is the data audited?", 
                    a: "Yes. Every action is recorded with full audit trails (Created, Updated, Deleted) to ensure absolute transparency in environmental accounting." 
                  }
                ].map((faq, i) => (
                  <div key={i} className="space-y-2 group">
                    <h4 className="text-emerald-400 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                       {faq.q}
                    </h4>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed pl-3.5 border-l border-slate-800 group-hover:border-emerald-500/30 transition-colors">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Infrastructure Specs */}
            <section className="pt-8 border-t border-slate-900">
               <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="bg-slate-900/50 border-slate-800 text-slate-500 font-mono text-[9px]">POSTGRES_QL</Badge>
                  <Badge variant="outline" className="bg-slate-900/50 border-slate-800 text-slate-500 font-mono text-[9px]">REDIS_VAULT</Badge>
                  <Badge variant="outline" className="bg-slate-900/50 border-slate-800 text-slate-500 font-mono text-[9px]">DOCKER_RUNTIME</Badge>
                  <Badge variant="outline" className="bg-slate-900/50 border-slate-800 text-slate-500 font-mono text-[9px]">SOFT_DELETE_PROTOCOLS</Badge>
               </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default SystemOverview;
