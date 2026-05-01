import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const reportTabs = [
  {
    label: 'BP',
    path: '/reports/balance-sheet',
    title: 'Balanço Patrimonial',
  },
  {
    label: 'DRE',
    path: '/reports/income-statement',
    title: 'Demonstração de Resultado',
  },
  {
    label: 'BV',
    path: '/reports/trial-balance',
    title: 'Balancete de Verificação',
  },
  {
    label: 'IEF',
    path: '/reports/indicators',
    title: 'Indicadores Econômico-Financeiros',
  },
  {
    label: 'PE',
    path: '/reports/breakeven',
    title: 'Ponto de Equilíbrio',
  },
]

export function FooterTabs() {
  return (
    <footer className="h-9 bg-background border-t flex items-center shrink-0 px-2 gap-1">
      {reportTabs.map((tab) => (
        <Tooltip key={tab.path}>
          <TooltipTrigger asChild>
            <NavLink
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  'px-3 h-7 flex items-center text-xs font-medium rounded transition-colors whitespace-nowrap',
                  'text-muted-foreground hover:text-foreground hover:bg-muted',
                  isActive && 'bg-muted text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="top">{tab.title}</TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="h-5 mx-1" />

      <div className="flex-1 overflow-x-auto flex items-center gap-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="text-xs text-muted-foreground/40 px-1 whitespace-nowrap">
          As abas de contas aparecem após configurar o plano de contas
        </span>
      </div>
    </footer>
  )
}
