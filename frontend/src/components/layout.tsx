import { useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from '@/components/app-sidebar'

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/agents': 'Agents',
  '/replay': 'Market Replay',
}

function titleFor(pathname: string) {
  if (pathname.startsWith('/agents/')) return 'Agent Detail'
  return TITLES[pathname] ?? 'Trade Arena'
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <span className="text-sm font-medium">{titleFor(pathname)}</span>
          <div className="ml-auto flex items-center gap-2 text-[11px] font-mono-data text-muted-foreground">
            NIFTY 100
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
