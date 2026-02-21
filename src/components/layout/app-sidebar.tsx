import { useEffect, useMemo, useState } from 'react'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { type NavCollapsible, type NavGroup as NavGroupType, type NavItem } from './types'
import { TeamSwitcher } from './team-switcher'
import { useAuthStore } from '@/stores/auth-store'

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

const adminOnlyTitles = new Set(['User Management', 'Category Management', 'Table Management'])

const isCollapsible = (item: NavItem): item is NavCollapsible =>
  Array.isArray((item as { items?: unknown }).items)

const filterAdminOnlyItems = (groups: NavGroupType[], isAdmin: boolean): NavGroupType[] => {
  if (isAdmin) return groups

  const filterItems = (items: NavItem[]): NavItem[] =>
    items
      .filter((item) => !adminOnlyTitles.has(item.title))
      .map((item) => {
        if (!isCollapsible(item)) return item
        return {
          ...item,
          items: filterItems(item.items),
        }
      })
      .filter((item) => !isCollapsible(item) || item.items.length > 0)

  return groups
    .map((group) => ({
      ...group,
      items: filterItems(group.items),
    }))
    .filter((group) => group.items.length > 0)
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const userRoles = useAuthStore((state) => state.auth.user?.role ?? [])
  const isAdmin = userRoles.includes('admin')
  const [remoteNavGroups, setRemoteNavGroups] = useState<NavGroupType[] | null>(null)

  const navGroups = useMemo(
    () => filterAdminOnlyItems(remoteNavGroups ?? sidebarData.navGroups, isAdmin),
    [isAdmin, remoteNavGroups]
  )

  useEffect(() => {
    const controller = new AbortController()

    const loadSidebarConfig = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/api/sidebar-config`, {
          signal: controller.signal,
        })

        if (!response.ok) return

        const data = (await response.json()) as { navGroups?: NavGroupType[] }

        if (!Array.isArray(data.navGroups) || data.navGroups.length === 0) return

        const merged = sidebarData.navGroups.map((group) => ({ ...group, items: [...group.items] }))

        data.navGroups.forEach((remoteGroup) => {
          const target = merged.find((group) => group.title === remoteGroup.title)
          if (target) {
            target.items = [...target.items, ...remoteGroup.items]
          } else {
            merged.push(remoteGroup)
          }
        })

        setRemoteNavGroups(merged)
      } catch {
        // fallback to static sidebar config
      }
    }

    const handleSidebarUpdate = () => {
      loadSidebarConfig()
    }

    loadSidebarConfig()
    window.addEventListener('sidebar-config-updated', handleSidebarUpdate)

    return () => {
      controller.abort()
      window.removeEventListener('sidebar-config-updated', handleSidebarUpdate)
    }
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
      <SidebarRail />
    </Sidebar>
  )
}
