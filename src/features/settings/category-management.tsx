import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SidebarItem = {
  id: string
  groupTitle: string
  parentId: string | null
  title: string
  url?: string
  displayMode: 'hierarchy' | 'vertical'
  sortOrder: number
}

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

export function CategoryManagement() {
  const [items, setItems] = useState<SidebarItem[]>([])
  const [groupTitle, setGroupTitle] = useState('Other')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [displayMode, setDisplayMode] = useState<'hierarchy' | 'vertical'>('hierarchy')
  const [parentId, setParentId] = useState<string>('none')

  const parentCandidates = useMemo(() => items, [items])

  const loadItems = async () => {
    const res = await fetch(`${backendBaseUrl}/api/sidebar-items`)
    if (!res.ok) return
    const data = (await res.json()) as SidebarItem[]
    setItems(data)
  }

  useEffect(() => {
    const controller = new AbortController()

    const bootstrap = async () => {
      const res = await fetch(`${backendBaseUrl}/api/sidebar-items`, {
        signal: controller.signal,
      })
      if (!res.ok) return
      const data = (await res.json()) as SidebarItem[]
      setItems(data)
    }

    bootstrap()
    return () => controller.abort()
  }, [])

  const createItem = async () => {
    if (!groupTitle.trim() || !title.trim()) return

    const res = await fetch(`${backendBaseUrl}/api/sidebar-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupTitle: groupTitle.trim(),
        title: title.trim(),
        url: url.trim() || undefined,
        sortOrder: Number(sortOrder) || 0,
        displayMode,
        parentId: parentId === 'none' ? null : parentId,
      }),
    })

    if (!res.ok) return

    setTitle('')
    setUrl('')
    setSortOrder('0')
    setParentId('none')
    await loadItems()
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  const deleteItem = async (id: string) => {
    const res = await fetch(`${backendBaseUrl}/api/sidebar-items/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) return
    await loadItems()
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Manage Categories and Menu Items</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Group (top-level section)</Label>
              <Input
                placeholder='General / Other / Reporting'
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Menu title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>URL (optional)</Label>
              <Input
                placeholder='/reporting/custom/raw'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Sort order</Label>
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>Parent (optional)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>No parent (root item)</SelectItem>
                  {parentCandidates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.groupTitle} / {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>Display mode</Label>
              <Select
                value={displayMode}
                onValueChange={(value: 'hierarchy' | 'vertical') => setDisplayMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='hierarchy'>Hierarchy (sidebar-like nesting)</SelectItem>
                  <SelectItem value='vertical'>Vertical (in-page list style)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={createItem}>Add menu item</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Items</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {items.map((item) => (
            <div
              key={item.id}
              className='flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between'
            >
              <div className='text-sm'>
                <div className='font-medium'>
                  {item.groupTitle} / {item.title}
                </div>
                <div className='text-muted-foreground'>
                  mode: {item.displayMode} • parent: {item.parentId ?? 'none'} • url:{' '}
                  {item.url || 'none'}
                </div>
              </div>
              <Button variant='destructive' size='sm' onClick={() => deleteItem(item.id)}>
                Delete
              </Button>
            </div>
          ))}

          {items.length === 0 && (
            <p className='text-sm text-muted-foreground'>No managed items yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
