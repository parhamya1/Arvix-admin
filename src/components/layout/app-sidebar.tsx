import { useEffect, useState } from 'react'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { type NavGroup as NavGroupType } from './types'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const [navGroups, setNavGroups] = useState<NavGroupType[]>(sidebarData.navGroups)

  useEffect(() => {
    const controller = new AbortController()

    const loadSidebarConfig = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/api/sidebar-config`, {
          signal: controller.signal,
        })

        if (!response.ok) return

        const data = (await response.json()) as { navGroups?: NavGroupType[] }

        if (Array.isArray(data.navGroups) && data.navGroups.length > 0) {
          setNavGroups(data.navGroups)
        }
      } catch {
        // fallback to static sidebar config
      }
    }

    loadSidebarConfig()

    return () => controller.abort()
  }, [])

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
