import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { CheckSquare, FolderOpen, LogOut, Leaf, ChevronUp } from 'lucide-react'
import { useAuthStore } from '../store/auth'

export function Sidebar() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [showPopup, setShowPopup] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Close popup on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false)
      }
    }
    if (showPopup) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPopup])

  const navItems = [
    { to: '/projects', icon: FolderOpen, label: 'Projects' },
    { to: '/my-tasks', icon: CheckSquare, label: 'My Tasks' },
  ]

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-40 bg-slate-50 flex flex-col p-4 gap-2 border-r border-slate-200/50">
      {/* Brand */}
      <div className="flex flex-col px-3 py-4 mb-2">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-blue-600">Clove</span>
        </button>
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Task Management</span>
      </div>

      {/* Nav */}
      <nav className="flex-grow space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center bg-white text-blue-600 shadow-sm rounded-lg px-4 py-2.5 border border-slate-100'
                : 'flex items-center text-slate-500 hover:bg-slate-200/60 transition-all px-4 py-2.5 rounded-lg'
            }
          >
            <Icon className="w-5 h-5 mr-3" />
            <span className="font-medium text-[0.875rem]">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section with popup */}
      <div className="mt-auto pt-4 border-t border-slate-200/50 relative" ref={popupRef}>
        {/* Popup */}
        {showPopup && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setShowPopup(p => !p)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-200/60 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-blue-600">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <ChevronUp className={`w-4 h-4 text-slate-400 transition-transform ${showPopup ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </aside>
  )
}
