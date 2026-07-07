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
      <aside className="w-60 bg-arena-surface border-r border-arena-border flex flex-col shrink-0">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-arena-border">
          <div className="w-8 h-8 rounded-lg bg-arena-primary-light flex items-center justify-center">
            <Swords size={17} className="text-arena-primary" />
          </div>
          <span className="font-display font-bold text-sm tracking-wide text-arena-text">
            TRADE <span className="text-arena-primary">ARENA</span>
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-semibold text-arena-muted/60 uppercase tracking-widest">
            Menu
          </div>
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium tracking-wide transition-all ${
                  isActive
                    ? 'bg-arena-primary-light text-arena-primary'
                    : 'text-arena-muted hover:bg-arena-surface-2 hover:text-arena-text'
                }`
              }
            >
              <l.icon size={16} />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-arena-border">
          <div className="px-3 py-1 text-[10px] font-mono-data text-arena-muted/70 tracking-widest uppercase">
            v1.0.0 · NIFTY 100
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-arena-surface/60 backdrop-blur border-b border-arena-border flex items-center px-6 lg:px-10 shrink-0 gap-3">
          <span className="text-[11px] font-medium text-arena-muted uppercase tracking-widest">
            AI Trading League
          </span>
          <span className="text-arena-border">·</span>
          <span className="text-[11px] font-mono-data text-arena-muted">
            NIFTY 100
          </span>
        </header>
        <div className="flex-1 overflow-auto px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
