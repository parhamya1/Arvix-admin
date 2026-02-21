import { type DragEvent, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { type NavCollapsible, type NavItem, type NavGroup as NavGroupProps } from './types'

type SortableNavGroupProps = NavGroupProps & {
  draggableItems?: boolean
  groupIndex?: number
  onMoveItem?: (
    sourceGroupIndex: number,
    sourceItemIndex: number,
    targetGroupIndex: number,
    targetItemIndex: number
  ) => void
}

const isCollapsible = (item: NavItem): item is NavCollapsible =>
  Array.isArray((item as { items?: unknown }).items)


const getDraggedSidebarItem = (
  event: DragEvent<HTMLElement>
): { groupIndex: number; itemIndex: number } | null => {
  const payload = event.dataTransfer.getData('application/sidebar-item')
  if (!payload) return null

  try {
    const parsed = JSON.parse(payload) as { groupIndex?: unknown; itemIndex?: unknown }
    if (typeof parsed.groupIndex !== 'number' || typeof parsed.itemIndex !== 'number') {
      return null
    }
    return { groupIndex: parsed.groupIndex, itemIndex: parsed.itemIndex }
  } catch {
    return null
  }
}

export function NavGroup({
  title,
  items,
  draggableItems = false,
  groupIndex = 0,
  onMoveItem,
}: SortableNavGroupProps) {
  const { state, isMobile } = useSidebar()
  const href = useLocation({ select: (location) => location.href })

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu
        onDragOver={(event) => {
          if (draggableItems) event.preventDefault()
        }}
        onDrop={(event) => {
          if (!draggableItems || !onMoveItem) return
          const source = getDraggedSidebarItem(event)
          if (!source) return
          event.preventDefault()
          event.stopPropagation()
          onMoveItem(source.groupIndex, source.itemIndex, groupIndex, items.length)
        }}
      >
        {items.map((item, itemIndex) => {
          const key = `${item.title}-${'url' in item ? item.url : 'group'}`

          const itemNode = !isCollapsible(item) ? (
            <SidebarMenuLink item={item} href={href} />
          ) : state === 'collapsed' && !isMobile ? (
            <SidebarMenuCollapsedDropdown item={item} href={href} />
          ) : (
            <SidebarMenuCollapsible item={item} href={href} />
          )

          return (
            <div
              key={key}
              draggable={draggableItems}
              onDragStartCapture={(event: DragEvent<HTMLDivElement>) => {
                if (!draggableItems) return
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData(
                  'application/sidebar-item',
                  JSON.stringify({ groupIndex, itemIndex })
                )
              }}
              onDragOver={(event) => {
                if (draggableItems) event.preventDefault()
              }}
              onDrop={(event) => {
                if (!draggableItems || !onMoveItem) return
                const source = getDraggedSidebarItem(event)
                if (!source) return

                event.preventDefault()
                event.stopPropagation()
                onMoveItem(source.groupIndex, source.itemIndex, groupIndex, itemIndex)
              }}
            >
              {itemNode}
            </div>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className='rounded-full px-1 py-0 text-xs'>{children}</Badge>
}

function SidebarMenuLink({ item, href }: { item: Exclude<NavItem, NavCollapsible>; href: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={item.title}
      >
        <Link to={item.url} draggable={false} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function RenderNestedItems({ items, href }: { items: NavItem[]; href: string }) {
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenuSub>
      {items.map((subItem) => {
        if (!isCollapsible(subItem)) {
          return (
            <SidebarMenuSubItem key={`${subItem.title}-${subItem.url}`}>
              <SidebarMenuSubButton asChild isActive={checkIsActive(href, subItem)}>
                <Link to={subItem.url} draggable={false} onClick={() => setOpenMobile(false)}>
                  {subItem.icon && <subItem.icon />}
                  <span>{subItem.title}</span>
                  {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          )
        }

        return (
          <SidebarMenuSubItem key={subItem.title}>
            <Collapsible
              defaultOpen={checkIsActive(href, subItem, true)}
              className='group/collapsible'
            >
              <CollapsibleTrigger asChild>
                <SidebarMenuSubButton isActive={checkIsActive(href, subItem)}>
                  {subItem.icon && <subItem.icon />}
                  <span>{subItem.title}</span>
                  <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
                </SidebarMenuSubButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <RenderNestedItems items={subItem.items} href={href} />
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuSubItem>
        )
      })}
    </SidebarMenuSub>
  )
}

function SidebarMenuCollapsible({ item, href }: { item: NavCollapsible; href: string }) {
  return (
    <Collapsible asChild defaultOpen={checkIsActive(href, item, true)} className='group/collapsible'>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <RenderNestedItems items={item.items} href={href} />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function flattenLinks(items: NavItem[]): Exclude<NavItem, NavCollapsible>[] {
  return items.flatMap((item) => (isCollapsible(item) ? flattenLinks(item.items) : [item]))
}

function SidebarMenuCollapsedDropdown({ item, href }: { item: NavCollapsible; href: string }) {
  const links = flattenLinks(item.items)

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={checkIsActive(href, item)}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {links.map((sub) => (
            <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
              <Link
                to={sub.url}
                draggable={false}
                className={`${checkIsActive(href, sub) ? 'bg-secondary' : ''}`}
              >
                {sub.icon && <sub.icon />}
                <span className='max-w-52 text-wrap'>{sub.title}</span>
                {sub.badge && <span className='ms-auto text-xs'>{sub.badge}</span>}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(href: string, item: NavItem, mainNav = false): boolean {
  if (!isCollapsible(item)) {
    return href === item.url || href.split('?')[0] === item.url
  }

  return (
    item.items.some((sub) => checkIsActive(href, sub)) ||
    (mainNav && href.split('/')[1] !== '' && href.split('/')[1] === item.title.toLowerCase())
  )
}
