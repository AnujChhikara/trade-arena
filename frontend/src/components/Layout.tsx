import { NavLink } from 'react-router-dom'
import { TrendingUp, LayoutDashboard, Users, Clock } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agents', label: 'Agents', icon: Users },
  { to: '/replay', label: 'Replay', icon: Clock },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-arena-border flex flex-col shrink-0">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-arena-border">
          <TrendingUp size={20} className="text-arena-primary" />
          <span className="font-bold text-base text-arena-text">Trade Arena</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-arena-primary-light text-arena-primary' : 'text-arena-muted hover:bg-slate-100 hover:text-arena-text'
                }`
              }
            >
              <l.icon size={18} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-arena-border">
          <div className="px-3 py-2 text-xs text-arena-muted">v1.0.0</div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-arena-border flex items-center px-6 shrink-0">
          <h1 className="text-sm font-medium text-arena-muted">AI Trading League — NIFTY 100</h1>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
