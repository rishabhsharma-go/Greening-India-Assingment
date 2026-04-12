import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  LogOut, 
  Leaf,
  ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Ecosystem', path: '/' },
  ];

  return (
    <div className="flex h-screen bg-[#f8faf9] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-emerald-50 flex flex-col relative z-30 shadow-[1px_0_0_0_rgba(6,78,59,0.05)]">
        <div className="p-8 pb-12 cursor-pointer transition-opacity hover:opacity-80" onClick={() => navigate('/')}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Leaf className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-800 uppercase">GREEN<span className="text-primary">INDIA</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">Core Protocols</div>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group",
                  isActive 
                    ? "bg-emerald-50 text-primary shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isActive ? "bg-white text-primary shadow-sm" : "bg-transparent group-hover:bg-white"
                  )}>
                    <item.icon size={20} />
                  </div>
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                </div>
                {isActive && <ChevronRight size={16} className="text-primary/40" />}
              </button>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="pt-6 border-t border-slate-100 italic text-[10px] text-slate-400 text-center uppercase tracking-widest font-black">
            Ver 2.4.0 • Ecological Integrity
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-24 bg-white/60 backdrop-blur-xl border-b border-emerald-50 flex items-center justify-between px-10 relative z-20">
          <div className="flex items-center gap-4">
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-4 rounded-2xl border border-slate-100">
              <Avatar className="w-10 h-10 rounded-xl border-2 border-white shadow-sm ring-1 ring-slate-100">
                <AvatarFallback className="bg-emerald-50 text-primary text-xs font-black uppercase">
                  {(user?.name || user?.email)?.substring(0, 2) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-800 leading-none">{user?.name || user?.email}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{user?.role}</span>
              </div>
            </div>
            
            <button 
              onClick={logout}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm group"
              title="Logout"
            >
              <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </header>

        {/* Dynamic Canvas */}
        <div className="flex-1 overflow-y-auto p-10 relative">
          {/* Subtle Organic Background */}
          <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-emerald-50/30 to-transparent -z-10" />
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
