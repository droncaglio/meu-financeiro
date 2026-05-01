import { PanelLeft } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopbarProps {
  onToggleSidebar: () => void
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="size-8 rounded-full bg-zinc-800 text-zinc-50 flex items-center justify-center text-xs font-semibold select-none cursor-pointer">
      {initials}
    </div>
  )
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { user, tenant, logout } = useAuthStore()

  return (
    <header className="h-12 bg-background border-b flex items-center justify-between px-3 shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onToggleSidebar}
        >
          <PanelLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold tracking-tight">
          Meu Financeiro
        </span>
      </div>

      <div className="flex items-center gap-3">
        {tenant && (
          <span className="text-sm text-muted-foreground hidden sm:block">
            {tenant.name}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <UserAvatar name={user?.name ?? 'U'} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
