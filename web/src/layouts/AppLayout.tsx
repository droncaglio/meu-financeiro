import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { FooterTabs } from './FooterTabs'

const SIDEBAR_KEY = 'mf-sidebar-collapsed'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === 'true',
  )

  function toggleSidebar() {
    setCollapsed((prev) => {
      localStorage.setItem(SIDEBAR_KEY, String(!prev))
      return !prev
    })
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} />
        <main className="flex-1 overflow-auto bg-muted/30">
          <Outlet />
        </main>
      </div>
      <FooterTabs />
    </div>
  )
}
