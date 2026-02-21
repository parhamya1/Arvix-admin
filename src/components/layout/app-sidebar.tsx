import { type DragEvent, useEffect, useMemo, useState } from 'react'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { type NavCollapsible, type NavGroup as NavGroupType, type NavItem } from './types'
import { TeamSwitcher } from './team-switcher'
import { useAuthStore } from '@/stores/auth-store'

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

const adminOnlyTitles = new Set(['User Management', 'Category Management', 'Table Management'])

type SidebarOrderPreference = {
  groupOrder: string[]
  itemOrders: Record<string, string[]>
}

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

const moveArrayItem = <T,>(list: T[], fromIndex: number, toIndex: number): T[] => {
  if (fromIndex === toIndex) return list
  const next = [...list]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

const buildOrderPreference = (groups: NavGroupType[]): SidebarOrderPreference => ({
  groupOrder: groups.map((group) => group.title),
  itemOrders: Object.fromEntries(
    groups.map((group) => [group.title, group.items.map((item) => item.title)])
  ),
})

const applyOrderPreference = (
  groups: NavGroupType[],
  preference: SidebarOrderPreference | null
): NavGroupType[] => {
  if (!preference) return groups

  const groupMap = new Map(groups.map((group) => [group.title, group]))
  const orderedGroups = preference.groupOrder
    .map((title) => groupMap.get(title))
    .filter((group): group is NavGroupType => Boolean(group))

  groups.forEach((group) => {
    if (!preference.groupOrder.includes(group.title)) {
      orderedGroups.push(group)
    }
  })

  return orderedGroups.map((group) => {
    const itemOrder = preference.itemOrders[group.title]
    if (!Array.isArray(itemOrder) || itemOrder.length === 0) {
      return group
    }

    const itemMap = new Map(group.items.map((item) => [item.title, item]))
    const orderedItems = itemOrder
      .map((title) => itemMap.get(title))
      .filter((item): item is NavItem => Boolean(item))

    group.items.forEach((item) => {
      if (!itemOrder.includes(item.title)) {
        orderedItems.push(item)
      }
    })

    return {
      ...group,
      items: orderedItems,
    }
  })
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const user = useAuthStore((state) => state.auth.user)
  const userRoles = user?.role ?? []
  const isAdmin = userRoles.includes('admin')
  const canReorder = Boolean(user)
  const [remoteNavGroups, setRemoteNavGroups] = useState<NavGroupType[] | null>(null)
  const [orderVersion, setOrderVersion] = useState(0)

  const filteredNavGroups = useMemo(
    () => filterAdminOnlyItems(remoteNavGroups ?? sidebarData.navGroups, isAdmin),
    [isAdmin, remoteNavGroups]
  )

  const sidebarOrderStorageKey = user?.email ? `sidebar-order:${user.email}` : null

  const sidebarOrderPreference = (() => {
    if (!sidebarOrderStorageKey || typeof window === 'undefined') return null

    try {
      const currentOrderVersion = orderVersion
      if (currentOrderVersion < 0) return null
      const raw = window.localStorage.getItem(sidebarOrderStorageKey)
      if (!raw) return null
      return JSON.parse(raw) as SidebarOrderPreference
    } catch {
      return null
    }
  })()

  const navGroups = useMemo(
    () => applyOrderPreference(filteredNavGroups, sidebarOrderPreference),
    [filteredNavGroups, sidebarOrderPreference]
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

  const saveSidebarOrderPreference = (groups: NavGroupType[]) => {
    if (!sidebarOrderStorageKey || typeof window === 'undefined') return

    window.localStorage.setItem(sidebarOrderStorageKey, JSON.stringify(buildOrderPreference(groups)))
    setOrderVersion((version) => version + 1)
  }

  const handleGroupDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    if (!canReorder) return
    const payload = event.dataTransfer.getData('application/sidebar-group')
    if (!payload) return

    const sourceIndex = Number(payload)
    if (Number.isNaN(sourceIndex)) return

    event.preventDefault()
    const next = moveArrayItem(navGroups, sourceIndex, targetIndex)
    saveSidebarOrderPreference(next)
  }

  const handleItemMove = (
    sourceGroupIndex: number,
    sourceItemIndex: number,
    targetGroupIndex: number,
    targetItemIndex: number
  ) => {
    if (!canReorder) return

    const next = navGroups.map((group) => ({ ...group, items: [...group.items] }))
    const sourceGroup = next[sourceGroupIndex]
    const targetGroup = next[targetGroupIndex]

    if (!sourceGroup || !targetGroup) return

    const [movedItem] = sourceGroup.items.splice(sourceItemIndex, 1)
    if (!movedItem) return

    targetGroup.items.splice(targetItemIndex, 0, movedItem)
    saveSidebarOrderPreference(next)
  }

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group, groupIndex) => (
          <div
            key={group.title}
            draggable={canReorder}
            onDragStart={(event) => {
              if (!canReorder) return
              event.dataTransfer.setData('application/sidebar-group', String(groupIndex))
            }}
            onDragOver={(event) => {
              if (canReorder) event.preventDefault()
            }}
            onDrop={(event) => handleGroupDrop(event, groupIndex)}
          >
            <NavGroup
              {...group}
              draggableItems={canReorder}
              groupIndex={groupIndex}
              onMoveItem={handleItemMove}
            />
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
