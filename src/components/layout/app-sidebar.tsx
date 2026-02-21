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
const SIDEBAR_ORDER_STORAGE_KEY = 'sidebar_order_admin'

const adminOnlyTitles = new Set(['User Management', 'Category Management', 'Table Management'])

type PersistedSidebarOrder = {
  groupOrder: string[]
  itemOrderByGroup: Record<string, string[]>
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

const getAdminOrderStorageKey = (accountNo?: string, email?: string) => {
  const userKey = accountNo ?? email ?? 'default'
  return `${SIDEBAR_ORDER_STORAGE_KEY}:${userKey}`
}

const buildPersistedOrder = (groups: NavGroupType[]): PersistedSidebarOrder => ({
  groupOrder: groups.map((group) => group.title),
  itemOrderByGroup: Object.fromEntries(
    groups.map((group) => [group.title, group.items.map((item) => item.title)])
  ),
})

const reorderByTitle = <T extends { title: string }>(items: T[], orderedTitles: string[]) => {
  if (orderedTitles.length === 0) return items

  const grouped = new Map<string, T[]>()
  items.forEach((item) => {
    const list = grouped.get(item.title)
    if (list) {
      list.push(item)
      return
    }
    grouped.set(item.title, [item])
  })

  const orderedItems: T[] = []
  orderedTitles.forEach((title) => {
    const list = grouped.get(title)
    if (!list || list.length === 0) return
    orderedItems.push(...list)
    grouped.delete(title)
  })

  grouped.forEach((remaining) => orderedItems.push(...remaining))

  return orderedItems
}

const applyPersistedOrder = (
  groups: NavGroupType[],
  persistedOrder: PersistedSidebarOrder
): NavGroupType[] => {
  const orderedGroups = reorderByTitle(groups, persistedOrder.groupOrder)

  return orderedGroups.map((group) => ({
    ...group,
    items: reorderByTitle(group.items, persistedOrder.itemOrderByGroup[group.title] ?? []),
  }))
}

const parsePersistedOrder = (raw: string | null): PersistedSidebarOrder | null => {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as PersistedSidebarOrder
    if (!Array.isArray(parsed.groupOrder) || !parsed.itemOrderByGroup) return null
    return parsed
  } catch {
    return null
  }
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const user = useAuthStore((state) => state.auth.user)
  const userRoles = user?.role ?? []
  const isAdmin = userRoles.includes('admin')
  const [remoteNavGroups, setRemoteNavGroups] = useState<NavGroupType[] | null>(null)
  const [orderedNavState, setOrderedNavState] = useState<{
    storageKey: string
    groups: NavGroupType[]
  } | null>(null)

  const filteredNavGroups = useMemo(
    () => filterAdminOnlyItems(remoteNavGroups ?? sidebarData.navGroups, isAdmin),
    [isAdmin, remoteNavGroups]
  )

  const storageKey = useMemo(
    () => getAdminOrderStorageKey(user?.accountNo, user?.email),
    [user?.accountNo, user?.email]
  )

  const persistedOrder = useMemo(() => {
    if (!isAdmin || typeof window === 'undefined') return null
    return parsePersistedOrder(window.localStorage.getItem(storageKey))
  }, [isAdmin, storageKey])

  const navGroups = useMemo(() => {
    if (!isAdmin) return filteredNavGroups

    if (orderedNavState && orderedNavState.storageKey === storageKey) {
      return orderedNavState.groups
    }

    if (!persistedOrder) return filteredNavGroups
    return applyPersistedOrder(filteredNavGroups, persistedOrder)
  }, [filteredNavGroups, isAdmin, orderedNavState, persistedOrder, storageKey])

  const persistOrder = (groups: NavGroupType[]) => {
    if (!isAdmin || typeof window === 'undefined') return
    const payload = buildPersistedOrder(groups)
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
    setOrderedNavState({ storageKey, groups })
  }

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

  const ensureAdminGroups = () => navGroups

  const handleGroupDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    if (!isAdmin) return
    const payload = event.dataTransfer.getData('application/sidebar-group')
    if (!payload) return

    const sourceIndex = Number(payload)
    if (Number.isNaN(sourceIndex)) return

    event.preventDefault()
    const nextGroups = moveArrayItem(ensureAdminGroups(), sourceIndex, targetIndex)
    persistOrder(nextGroups)
  }

  const handleItemMove = (
    sourceGroupIndex: number,
    sourceItemIndex: number,
    targetGroupIndex: number,
    targetItemIndex: number
  ) => {
    if (!isAdmin) return

    const current = ensureAdminGroups()
    const next = current.map((group) => ({ ...group, items: [...group.items] }))
    const sourceGroup = next[sourceGroupIndex]
    const targetGroup = next[targetGroupIndex]

    if (!sourceGroup || !targetGroup) return

    const [movedItem] = sourceGroup.items.splice(sourceItemIndex, 1)
    if (!movedItem) return

    targetGroup.items.splice(targetItemIndex, 0, movedItem)
    persistOrder(next)
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
            draggable={isAdmin}
            onDragStart={(event) => {
              if (!isAdmin) return
              event.dataTransfer.setData('application/sidebar-group', String(groupIndex))
            }}
            onDragOver={(event) => {
              if (isAdmin) event.preventDefault()
            }}
            onDrop={(event) => handleGroupDrop(event, groupIndex)}
          >
            <NavGroup
              {...group}
              draggableItems={isAdmin}
              groupIndex={groupIndex}
              onMoveItem={handleItemMove}
            />
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
