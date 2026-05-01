import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Receipt,
  CalendarClock,
  ListTree,
  Landmark,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Receipt, label: 'Lançamentos', path: '/entries' },
  { icon: CalendarClock, label: 'Compromissos', path: '/commitments' },
  { icon: ListTree, label: 'Plano de Contas', path: '/accounts' },
  { icon: Landmark, label: 'Contas Bancárias', path: '/bank-accounts' },
]

const bottomItems = [
  { icon: Settings, label: 'Configurações', path: '/settings' },
]

interface NavItemProps {
  icon: React.ElementType
  label: string
  path: string
  collapsed: boolean
}

function NavItem({ icon: Icon, label, path, collapsed }: NavItemProps) {
  const link = (
    <NavLink
      to={path}
      end={path === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800',
          isActive && 'bg-zinc-800 text-zinc-50',
          collapsed && 'justify-center px-2',
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} />
        ))}
      </nav>
      <div className="p-2 border-t border-zinc-800">
        {bottomItems.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} />
        ))}
      </div>
    </aside>
  )
}
