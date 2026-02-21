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
const PENDING_SIDEBAR_ORDER_KEY = 'pending_sidebar_order_payload'
const SIDEBAR_ORDER_CACHE_KEY = 'global_sidebar_order_cache'

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

const parsePersistedOrder = (payload: unknown): PersistedSidebarOrder | null => {
  if (!payload || typeof payload !== 'object') return null

  const maybeOrder = payload as {
    groupOrder?: unknown
    itemOrderByGroup?: unknown
  }

  if (!Array.isArray(maybeOrder.groupOrder)) return null
  if (!maybeOrder.groupOrder.every((item) => typeof item === 'string')) return null

  if (!maybeOrder.itemOrderByGroup || typeof maybeOrder.itemOrderByGroup !== 'object') return null
  const entryValues = Object.values(maybeOrder.itemOrderByGroup)
  if (!entryValues.every((value) => Array.isArray(value) && value.every((item) => typeof item === 'string'))) {
    return null
  }

  return {
    groupOrder: maybeOrder.groupOrder,
    itemOrderByGroup: maybeOrder.itemOrderByGroup as Record<string, string[]>,
  }
}


const saveSidebarOrderToServer = async (payload: PersistedSidebarOrder) => {
  const body = JSON.stringify(payload)

  try {
    const patchResponse = await fetch(`${backendBaseUrl}/api/sidebar-order`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (patchResponse.ok) return true
  } catch {
    // fall through to POST fallback
  }

  try {
    const postResponse = await fetch(`${backendBaseUrl}/api/sidebar-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    return postResponse.ok
  } catch {
    return false
  }
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const userRoles = useAuthStore((state) => state.auth.user?.role ?? [])
  const isAdmin = userRoles.includes('admin')
  const [remoteNavGroups, setRemoteNavGroups] = useState<NavGroupType[] | null>(null)
  const [sidebarOrder, setSidebarOrder] = useState<PersistedSidebarOrder | null>(() => {
    if (typeof window === 'undefined') return null

    const cachedOrder = window.localStorage.getItem(SIDEBAR_ORDER_CACHE_KEY)
    if (!cachedOrder) return null

    try {
      return parsePersistedOrder(JSON.parse(cachedOrder))
    } catch {
      window.localStorage.removeItem(SIDEBAR_ORDER_CACHE_KEY)
      return null
    }
  })

  const filteredNavGroups = useMemo(
    () => filterAdminOnlyItems(remoteNavGroups ?? sidebarData.navGroups, isAdmin),
    [isAdmin, remoteNavGroups]
  )

  const navGroups = useMemo(() => {
    if (!sidebarOrder) return filteredNavGroups
    return applyPersistedOrder(filteredNavGroups, sidebarOrder)
  }, [filteredNavGroups, sidebarOrder])

  const persistOrder = async (groups: NavGroupType[]) => {
    if (!isAdmin) return

    const payload = buildPersistedOrder(groups)
    const serializedPayload = JSON.stringify(payload)
    setSidebarOrder(payload)

    window.localStorage.setItem(SIDEBAR_ORDER_CACHE_KEY, serializedPayload)
    window.localStorage.setItem(PENDING_SIDEBAR_ORDER_KEY, serializedPayload)

    const isSaved = await saveSidebarOrderToServer(payload)
    if (!isSaved) return

    window.localStorage.removeItem(PENDING_SIDEBAR_ORDER_KEY)
    window.dispatchEvent(new Event('sidebar-order-updated'))
  }

  useEffect(() => {
    const controller = new AbortController()

    const loadSidebarState = async () => {
      try {
        const [configResponse, orderResponse] = await Promise.all([
          fetch(`${backendBaseUrl}/api/sidebar-config`, {
            signal: controller.signal,
          }),
          fetch(`${backendBaseUrl}/api/sidebar-order`, {
            signal: controller.signal,
          }),
        ])

        if (configResponse.ok) {
          const configData = (await configResponse.json()) as { navGroups?: NavGroupType[] }

          if (Array.isArray(configData.navGroups) && configData.navGroups.length > 0) {
            const merged = sidebarData.navGroups.map((group) => ({ ...group, items: [...group.items] }))

            configData.navGroups.forEach((remoteGroup) => {
              const target = merged.find((group) => group.title === remoteGroup.title)
              if (target) {
                target.items = [...target.items, ...remoteGroup.items]
              } else {
                merged.push(remoteGroup)
              }
            })

            setRemoteNavGroups(merged)
          }
        }

        if (orderResponse.ok) {
          const orderData = (await orderResponse.json()) as unknown
          const parsedOrder = parsePersistedOrder(orderData)
          setSidebarOrder(parsedOrder)

          if (parsedOrder) {
            window.localStorage.setItem(SIDEBAR_ORDER_CACHE_KEY, JSON.stringify(parsedOrder))
          } else {
            window.localStorage.removeItem(SIDEBAR_ORDER_CACHE_KEY)
          }
        }

        const pendingRaw = window.localStorage.getItem(PENDING_SIDEBAR_ORDER_KEY)
        if (pendingRaw) {
          try {
            const pendingPayload = parsePersistedOrder(JSON.parse(pendingRaw))
            if (pendingPayload) {
              const isSaved = await saveSidebarOrderToServer(pendingPayload)
              if (isSaved) {
                window.localStorage.removeItem(PENDING_SIDEBAR_ORDER_KEY)
                window.localStorage.setItem(SIDEBAR_ORDER_CACHE_KEY, JSON.stringify(pendingPayload))
                setSidebarOrder(pendingPayload)
              }
            }
          } catch {
            window.localStorage.removeItem(PENDING_SIDEBAR_ORDER_KEY)
          }
        }
      } catch {
        // fallback to static sidebar config
      }
    }

    loadSidebarState()
    window.addEventListener('sidebar-config-updated', loadSidebarState)
    window.addEventListener('sidebar-order-updated', loadSidebarState)

    return () => {
      controller.abort()
      window.removeEventListener('sidebar-config-updated', loadSidebarState)
      window.removeEventListener('sidebar-order-updated', loadSidebarState)
    }
  }, [isAdmin])

  const handleGroupDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    if (!isAdmin) return
    const payload = event.dataTransfer.getData('application/sidebar-group')
    if (!payload) return

    const sourceIndex = Number(payload)
    if (Number.isNaN(sourceIndex)) return

    event.preventDefault()
    const nextGroups = moveArrayItem(navGroups, sourceIndex, targetIndex)
    void persistOrder(nextGroups)
  }

  const handleItemMove = (
    sourceGroupIndex: number,
    sourceItemIndex: number,
    targetGroupIndex: number,
    targetItemIndex: number
  ) => {
    if (!isAdmin) return

    const next = navGroups.map((group) => ({ ...group, items: [...group.items] }))
    const sourceGroup = next[sourceGroupIndex]
    const targetGroup = next[targetGroupIndex]

    if (!sourceGroup || !targetGroup) return

    const [movedItem] = sourceGroup.items.splice(sourceItemIndex, 1)
    if (!movedItem) return

    targetGroup.items.splice(targetItemIndex, 0, movedItem)
    void persistOrder(next)
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
