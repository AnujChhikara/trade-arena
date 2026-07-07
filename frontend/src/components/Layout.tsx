import { NavLink } from 'react-router-dom'
import { Swords, LayoutDashboard, Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agents', label: 'Agents', icon: Users },
  { to: '/replay', label: 'Replay', icon: Clock },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 flex flex-col border-r border-border bg-card/40 backdrop-blur-sm">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <div className="grid place-items-center size-8 rounded-lg bg-primary/12 ring-1 ring-primary/20">
            <Swords size={16} className="text-primary" />
          </div>
          <span className="font-display font-bold text-sm tracking-wide">
            TRADE <span className="text-primary">ARENA</span>
          </span>
        </div>

        <nav className="flex-1 px-3 py-5">
          <div className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
            Menu
          </div>
          <div className="space-y-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium tracking-wide transition-all',
                    isActive
                      ? 'bg-primary/12 text-primary ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                <l.icon size={16} />
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="px-3 py-1 text-[10px] font-mono-data text-muted-foreground/60 tracking-widest uppercase">
            v1.0.0 · NIFTY 100
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-6 lg:px-10 border-b border-border bg-background/70 backdrop-blur-md">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            AI Trading League
          </span>
          <span className="text-border">·</span>
          <span className="text-[11px] font-mono-data text-muted-foreground">NIFTY 100</span>
        </header>
        <div className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
