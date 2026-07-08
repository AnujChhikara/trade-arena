import { Link, useLocation } from 'react-router-dom'
import { Swords, LayoutDashboard, Users, Clock } from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from '@/components/ui/sidebar'

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Agents', url: '/agents', icon: Users },
  { title: 'Replay', url: '/replay', icon: Clock },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const isActive = (url: string) => (url === '/' ? pathname === '/' : pathname.startsWith(url))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
            <Swords className="size-4 text-primary" />
          </div>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display text-sm font-bold tracking-wide">
              TRADE <span className="text-primary">ARENA</span>
            </span>
            <span className="text-[10px] text-muted-foreground">AI Trading League</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1 font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
          v1.0.0 · NIFTY 100
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
