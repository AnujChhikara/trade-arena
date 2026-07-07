import { NavLink } from 'react-router-dom'
import { Swords, LayoutDashboard, Users, Clock } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agents', label: 'Agents', icon: Users },
  { to: '/replay', label: 'Replay', icon: Clock },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-arena-bg">
      <aside className="w-56 bg-arena-surface border-r border-arena-border flex flex-col shrink-0">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-arena-border">
          <Swords size={18} className="text-arena-primary" />
          <span className="font-display font-bold text-sm tracking-wide text-arena-text">
            TRADE <span className="text-arena-primary">ARENA</span>
          </span>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 pt-3">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide uppercase transition-all ${
                  isActive
                    ? 'bg-arena-primary-light text-arena-primary border border-arena-primary/20'
                    : 'text-arena-muted hover:bg-arena-surface-2 hover:text-arena-text'
                }`
              }
            >
              <l.icon size={15} />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-arena-border">
          <div className="px-3 py-2 text-[10px] font-mono-data text-arena-muted tracking-widest uppercase">
            v1.0.0 · NIFTY 100
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-arena-surface border-b border-arena-border flex items-center px-6 shrink-0 gap-3">
          <span className="text-[11px] font-medium text-arena-muted uppercase tracking-widest">
            AI Trading League
          </span>
          <span className="text-arena-border">·</span>
          <span className="text-[11px] font-mono-data text-arena-muted">
            NIFTY 100
          </span>
        </header>
        <div className="flex-1 overflow-auto p-5">
          {children}
        </div>
      </main>
    </div>
  )
}
