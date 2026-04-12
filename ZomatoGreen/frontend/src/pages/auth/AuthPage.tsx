import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, Leaf, AtSign, KeyRound, User } from 'lucide-react'
import { login, register } from '../../api/auth'
import { useAuthStore } from '../../store/auth'

type Tab = 'login' | 'register'

export function AuthPage({ defaultTab = 'login' }: { defaultTab?: Tab }) {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const [tab, setTab] = useState<Tab>(defaultTab)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchTab(t: Tab) {
    setTab(t)
    setError(null)
    setName('')
    setEmail('')
    setPassword('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (tab === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const data =
        tab === 'login'
          ? await login({ email, password })
          : await register({ name, email, password })
      setAuth(data.token, data.user)
      navigate('/projects')
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        (tab === 'login' ? 'Invalid email or password' : 'Registration failed')
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-2 bg-[#f0f2f5]">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Card */}
      <main className="w-full max-w-5xl grid md:grid-cols-12 border border-gray-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.10)] rounded-3xl overflow-hidden bg-white relative z-10 h-[90vh]">

        {/* Left branding panel */}
        <div className="md:col-span-5 bg-[#f7f8fa] p-10 flex flex-col justify-between relative border-r border-gray-100">
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-14">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-semibold text-xl tracking-tight text-gray-900">Clove</h1>
            </div>

            <h2 className="text-4xl font-light tracking-tight text-gray-900 leading-[1.1] mb-6">
              Ship tasks,<br />
              <span className="font-semibold text-blue-500">not chaos.</span>
            </h2>
            <p className="text-gray-500 text-base font-light leading-relaxed max-w-[280px]">
              Create projects, assign tasks, track progress — a focused workspace for teams that want clarity.
            </p>
          </div>

          {/* Decorative card */}
          <div className="mt-10 relative z-10">
            <div
              className="p-7 border border-gray-200/60 rounded-2xl shadow-sm bg-white/70"
              style={{ backdropFilter: 'blur(40px)' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="h-2 w-2 rounded-full bg-blue-400/60" />
                <div className="h-1 w-20 bg-gray-200 rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="h-1.5 w-full bg-gray-100 rounded-full" />
                <div className="h-1.5 w-5/6 bg-gray-100 rounded-full" />
                <div className="h-1.5 w-4/6 bg-gray-100 rounded-full" />
              </div>
            </div>
          </div>

          {/* Decorative circles */}
          <div className="absolute left-6 bottom-20 opacity-10 pointer-events-none select-none flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-400" />
            <div className="w-5 h-5 rounded-full bg-gray-400 self-end" />
            <div className="w-6 h-6 rounded-full bg-gray-400 self-center" />
          </div>
        </div>

        {/* Right form panel */}
        <div className="md:col-span-7 bg-white p-8 md:p-16 flex flex-col justify-center overflow-y-auto">
          <div className="max-w-md mx-auto w-full">

            {/* Tab toggle */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6 border border-gray-200">
              <button
                type="button"
                onClick={() => switchTab('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  tab === 'login'
                    ? 'bg-white text-blue-500 shadow-sm border border-gray-200'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchTab('register')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  tab === 'register'
                    ? 'bg-white text-blue-500 shadow-sm border border-gray-200'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Animated form content */}
            <div key={tab} className="animate-fade-slide-in">

              {/* Heading */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {tab === 'login' ? 'Welcome Back' : 'Create Account'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {tab === 'login'
                    ? 'Enter your credentials to access your flow.'
                    : 'Fill in the details below to get started.'}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 mb-5 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name field — register only */}
                {tab === 'register' && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="Jane Smith"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    Email Address
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="name@company.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      Password
                    </label>
                    {tab === 'login' ? (
                      <span className="text-xs text-blue-500 cursor-pointer hover:text-blue-600">Reset password?</span>
                    ) : (
                      <span className="text-xs text-gray-400">Min. 8 characters</span>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white font-medium py-4 rounded-full shadow-lg shadow-blue-500/25 hover:bg-blue-600 hover:-translate-y-px transition-all active:scale-[0.99] disabled:bg-blue-300 disabled:shadow-none disabled:translate-y-0 mt-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading
                    ? tab === 'login' ? 'Signing in...' : 'Creating account...'
                    : tab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <p className="mt-8 text-center text-xs text-gray-400 leading-relaxed">
                By entering, you accept our{' '}
                <span className="text-gray-700 font-medium cursor-pointer hover:text-blue-500 transition-colors">Terms</span>{' '}
                and{' '}
                <span className="text-gray-700 font-medium cursor-pointer hover:text-blue-500 transition-colors">Privacy</span>.
              </p>

            </div> {/* end animated wrapper */}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-3 text-gray-400/50 text-[10px] font-semibold tracking-[0.2em] uppercase flex items-center gap-6">
        <span>© 2026 Clove</span>
        <span className="h-1 w-1 rounded-full bg-gray-300" />
        <span>Task Management, Simplified</span>
      </footer>
    </div>
  )
}
