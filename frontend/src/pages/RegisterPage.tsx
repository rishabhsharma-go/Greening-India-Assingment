import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, Loader2, Globe, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/api/axios';
import { useToast } from '@/hooks/use-toast';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const registerData = response.data?.data || response.data;
      const { token, user: userData } = registerData || {};
      
      if (token) {
        login(token, userData);
        navigate('/');
      } else {
        console.error('Core Protocol Failure: Token missing in response', response.data);
        toast({
          title: "Synchronization Error",
          description: "Portal response was malformed. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Registration failed', error);
      toast({
        title: "Protocol Failure",
        description: "Could not initiate account buds. Please verify your identity data.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      {/* Visual Impact Section (Split-Screen) */}
      <div className="hidden lg:flex lg:w-3/5 p-12 relative overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-110" 
          style={{ backgroundImage: "url('/hero.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent" />
        
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20">
                <Leaf className="text-white w-7 h-7" />
              </div>
              <span className="text-3xl font-black tracking-tighter text-white">GREEN<span className="text-primary">INDIA</span></span>
            </div>
            
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6 max-w-xl"
            >
              <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.9]">
                Initiate Your <br />
                <span className="text-primary">Guardian Buds.</span>
              </h2>
              <p className="text-emerald-50/60 text-xl font-medium leading-relaxed">
                Join an elite tier of environmental bio-architects. Together, we are restoring the Indian subcontinent's ecological balance through precision oversight.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-4">
               <div className="flex items-center gap-3 text-emerald-400">
                  <Globe size={24} />
                  <span className="text-sm font-black uppercase tracking-widest">Scalable Impact</span>
               </div>
               <p className="text-white/40 text-xs font-bold leading-relaxed uppercase tracking-widest">Connect thousands of micro-ecosystems into a unified national grid.</p>
            </div>
            <div className="space-y-4">
               <div className="flex items-center gap-3 text-emerald-400">
                  <ShieldCheck size={24} />
                  <span className="text-sm font-black uppercase tracking-widest">Protocol Integrity</span>
               </div>
               <p className="text-white/40 text-xs font-bold leading-relaxed uppercase tracking-widest">End-to-end transparency for every seed planted and every task completed.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Interface Section */}
      <div className="flex-1 flex flex-col justify-center px-10 xl:px-32 py-20 relative bg-white">
        <div className="max-w-md w-full mx-auto space-y-12">
          <div className="space-y-4">
            <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="lg:hidden flex items-center gap-3 mb-8"
            >
               <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                 <Leaf className="text-white w-6 h-6" />
               </div>
               <span className="text-2xl font-black tracking-tighter text-slate-800">GREEN<span className="text-primary">INDIA</span></span>
            </motion.div>
            
            <h1 className="text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter leading-none">Registration</h1>
            <p className="text-slate-400 font-medium text-lg italic uppercase tracking-wider text-[10px] b-4">New Guardian Enrollment • Level 1 Onboarding</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3 pt-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Guardian Name</Label>
                <Input 
                  type="text" 
                  id="name"
                  name="name"
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="e.g. Bio-Architect Smith"
                  className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-lg focus-visible:ring-primary/20 ring-offset-0 transition-all font-medium"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Guardian Identity (Email)</Label>
                <Input 
                  type="email" 
                  id="email"
                  name="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="name@ecosystem.gov"
                  className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-lg focus-visible:ring-primary/20 ring-offset-0 transition-all font-medium"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Access Protocol (Password)</Label>
                <Input 
                  type="password" 
                  id="password"
                  name="password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="••••••••"
                  className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-lg focus-visible:ring-primary/20 ring-offset-0 transition-all font-medium"
                />
              </div>
            </div>

            <Button 
               type="submit" 
               className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] disabled:opacity-50"
               disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : "PLANT YOUR ACCOUNT"}
            </Button>
          </form>

          <p className="text-center text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
            Already a Guardian? <Link to="/login" className="text-primary hover:underline ml-2">Synchronize Core</Link>
          </p>
        </div>
        
        <div className="absolute bottom-10 left-0 right-0 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                Protected by Environmental Integrity Protocol • © 2026
            </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
