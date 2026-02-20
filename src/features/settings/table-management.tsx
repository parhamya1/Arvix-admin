import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ColumnType = 'text' | 'number' | 'boolean' | 'date'
type TableColumn = { key: string; label: string; type: ColumnType }
type EditableColumn = TableColumn & { uid: string }
type DynamicTab = { id: string; name: string; columns: TableColumn[]; pageId?: string | null }
type DynamicPage = { id: string; name: string; sidebarItemId?: string | null }
type DynamicRow = { id: string; data: Record<string, unknown> }
type SidebarItem = { id: string; groupTitle: string; title: string }

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

const createColumn = (index = 1): EditableColumn => ({
  uid: crypto.randomUUID(),
  key: index === 1 ? 'name' : `field_${index}`,
  label: index === 1 ? 'Name' : `Field ${index}`,
  type: 'text',
})

export function TableManagement() {
  const [selectedPageId, setSelectedPageId] = useState('')
  const [selectedTabId, setSelectedTabId] = useState('')

  const [pageName, setPageName] = useState('')
  const [tabName, setTabName] = useState('')
  const [targetSidebarItemId, setTargetSidebarItemId] = useState('none')
  const [notice, setNotice] = useState('')

  const [columns, setColumns] = useState<EditableColumn[]>([createColumn(1)])
  const [newRow, setNewRow] = useState<Record<string, unknown>>({})
  const queryClient = useQueryClient()

  const pagesQuery = useQuery({
    queryKey: ['dynamic-pages'],
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-pages`)
      if (!res.ok) throw new Error('failed')
      return (await res.json()) as DynamicPage[]
    },
  })

  const sidebarItemsQuery = useQuery({
    queryKey: ['sidebar-items'],
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/sidebar-items`)
      if (!res.ok) throw new Error('failed')
      return (await res.json()) as SidebarItem[]
    },
  })

  const resolvedPageId =
    (pagesQuery.data ?? []).find((page) => page.id === selectedPageId)?.id ?? pagesQuery.data?.[0]?.id ?? ''

  const tabsQuery = useQuery({
    queryKey: ['dynamic-page-tabs', resolvedPageId],
    enabled: Boolean(resolvedPageId),
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${resolvedPageId}/tabs`)
      if (!res.ok) throw new Error('failed')
      return (await res.json()) as DynamicTab[]
    },
  })

  const tabs = useMemo(() => tabsQuery.data ?? [], [tabsQuery.data])
  const resolvedTabId = tabs.find((tab) => tab.id === selectedTabId)?.id ?? tabs[0]?.id ?? ''

  const rowsQuery = useQuery({
    queryKey: ['dynamic-tab-rows', resolvedTabId],
    enabled: Boolean(resolvedTabId),
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${resolvedTabId}/rows`)
      if (!res.ok) throw new Error('failed')
      return (await res.json()) as DynamicRow[]
    },
  })

  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === resolvedTabId), [tabs, resolvedTabId])
  const pages = pagesQuery.data ?? []
  const sidebarItems = sidebarItemsQuery.data ?? []
  const rows = rowsQuery.data ?? []

  const createPage = async () => {
    if (!pageName.trim()) return
    setNotice('')
    const res = await fetch(`${backendBaseUrl}/api/dynamic-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: pageName.trim(),
        sidebarItemId: targetSidebarItemId === 'none' ? null : targetSidebarItemId,
      }),
    })
    if (!res.ok) {
      setNotice('Create page failed. Please check name uniqueness and assignment.')
      return
    }
    const created = (await res.json()) as { id: string }
    setPageName('')
    setTargetSidebarItemId('none')
    setSelectedPageId(created.id)
    setSelectedTabId('')
    await pagesQuery.refetch()
    await tabsQuery.refetch()
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  const createTab = async () => {
    if (!resolvedPageId || !tabName.trim() || columns.length === 0) return
    setNotice('')
    const payloadColumns: TableColumn[] = columns.map(({ key, label, type }) => ({ key, label, type }))
    const res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${resolvedPageId}/tabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tabName.trim(), columns: payloadColumns }),
    })
    if (!res.ok) {
      const errorBody = (await res.json().catch(() => null)) as { message?: string } | null
      setNotice(errorBody?.message ?? 'Add tab failed. Check tab name uniqueness and column fields.')
      return
    }
    const created = (await res.json()) as { id: string }
    const newTab: DynamicTab = {
      id: created.id,
      name: tabName.trim(),
      columns: payloadColumns,
      pageId: resolvedPageId,
    }

    queryClient.setQueryData<DynamicTab[]>(['dynamic-page-tabs', resolvedPageId], (prev) => [
      ...(prev ?? []),
      newTab,
    ])

    setTabName('')
    setColumns([createColumn(1)])
    setSelectedPageId(resolvedPageId)
    setSelectedTabId(created.id)
    await tabsQuery.refetch()
    setNotice('Tab added successfully.')
  }

  const updatePageAssignment = async (pageId: string, sidebarItemId: string) => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${pageId}/assignment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sidebarItemId: sidebarItemId === 'none' ? null : sidebarItemId }),
    })
    if (!res.ok) return
    await pagesQuery.refetch()
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  const deletePage = async (pageId: string) => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${pageId}`, { method: 'DELETE' })
    if (!res.ok) return
    await pagesQuery.refetch()
    await tabsQuery.refetch()
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  const deleteTab = async (tabId: string) => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tabId}`, { method: 'DELETE' })
    if (!res.ok) return
    await tabsQuery.refetch()
    await rowsQuery.refetch()
  }

  const addColumn = () => {
    setColumns((prev) => [...prev, createColumn(prev.length + 1)])
  }

  const updateColumn = (index: number, field: keyof TableColumn, value: string) => {
    setColumns((prev) => prev.map((column, i) => (i === index ? { ...column, [field]: value } : column)))
  }

  const saveRow = async () => {
    if (!selectedTab) return
    const payload: Record<string, unknown> = {}
    selectedTab.columns.forEach((column) => {
      const value = newRow[column.key]
      payload[column.key] = column.type === 'number' ? Number(value ?? 0) : value ?? ''
    })
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${selectedTab.id}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload }),
    })
    if (!res.ok) return
    setNewRow({})
    await rowsQuery.refetch()
  }

  const deleteRow = async (rowId: string) => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-table-rows/${rowId}`, { method: 'DELETE' })
    if (!res.ok) return
    await rowsQuery.refetch()
  }

  const sidebarLabel = (id?: string | null) => {
    if (!id) return 'Unassigned'
    const item = sidebarItems.find((entry) => entry.id === id)
    return item ? `${item.groupTitle} / ${item.title}` : 'Unknown item'
  }

  return (
    <div className='space-y-4 pb-8'>
      <Card>
        <CardHeader>
          <CardTitle>Create Page</CardTitle>
        </CardHeader>
        <CardContent className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div className='space-y-2 md:col-span-2'>
            <Label>Page name</Label>
            <Input value={pageName} onChange={(e) => setPageName(e.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label>Attach page to menu</Label>
            <Select value={targetSidebarItemId} onValueChange={setTargetSidebarItemId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>Unassigned</SelectItem>
                {sidebarItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.groupTitle} / {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button onClick={createPage}>Create page</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {pages.map((page) => (
            <div key={page.id} className='rounded-md border p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <p className='font-medium'>{page.name}</p>
                  <p className='text-xs text-muted-foreground'>Linked menu: {sidebarLabel(page.sidebarItemId)}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <Button variant='outline' size='sm' onClick={() => setSelectedPageId(page.id)}>
                    Open
                  </Button>
                  <Button variant='destructive' size='sm' onClick={() => deletePage(page.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              <div className='mt-3'>
                <Select
                  value={page.sidebarItemId ?? 'none'}
                  onValueChange={(value) => updatePageAssignment(page.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Unassigned</SelectItem>
                    {sidebarItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.groupTitle} / {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {pages.length === 0 && <p className='text-sm text-muted-foreground'>No pages created yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Tab (inside selected page)</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {!resolvedPageId && <p className='text-sm text-muted-foreground'>Open a page first.</p>}
          {resolvedPageId && (
            <>
              <div className='space-y-2'>
                <Label>Tab name</Label>
                <Input value={tabName} onChange={(e) => setTabName(e.target.value)} />
              </div>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label>Columns</Label>
                  <Button type='button' variant='outline' onClick={addColumn}>
                    Add column
                  </Button>
                </div>
                {columns.map((column, index) => (
                  <div key={column.uid} className='grid grid-cols-1 gap-2 md:grid-cols-4'>
                    <Input
                      placeholder='key'
                      value={column.key}
                      onChange={(e) => updateColumn(index, 'key', e.target.value)}
                    />
                    <Input
                      placeholder='label'
                      value={column.label}
                      onChange={(e) => updateColumn(index, 'label', e.target.value)}
                    />
                    <Select value={column.type} onValueChange={(value) => updateColumn(index, 'type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='text'>text</SelectItem>
                        <SelectItem value='number'>number</SelectItem>
                        <SelectItem value='boolean'>boolean</SelectItem>
                        <SelectItem value='date'>date</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type='button'
                      variant='destructive'
                      onClick={() => setColumns((prev) => prev.filter((entry) => entry.uid !== column.uid))}
                      disabled={columns.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button onClick={createTab}>Create tab</Button>
              {notice && <p className='text-sm text-muted-foreground'>{notice}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabs in selected page</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {tabs.map((tab) => (
            <div key={tab.id} className='flex items-center justify-between rounded-md border p-3'>
              <div>
                <p className='font-medium'>{tab.name}</p>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {tab.columns.map((column) => (
                    <Badge key={column.key} variant='secondary'>
                      {column.label} ({column.type})
                    </Badge>
                  ))}
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm' onClick={() => setSelectedTabId(tab.id)}>
                  Open
                </Button>
                <Button variant='destructive' size='sm' onClick={() => deleteTab(tab.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {tabs.length === 0 && <p className='text-sm text-muted-foreground'>No tabs in this page yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rows</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {!selectedTab && <p className='text-sm text-muted-foreground'>Open a tab to manage rows.</p>}

          {selectedTab && (
            <>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                {selectedTab.columns.map((column) => (
                  <div key={column.key} className='space-y-2'>
                    <Label>{column.label}</Label>
                    {column.type === 'boolean' ? (
                      <div className='flex h-10 items-center rounded-md border px-3'>
                        <Checkbox
                          checked={Boolean(newRow[column.key])}
                          onCheckedChange={(value) =>
                            setNewRow((prev) => ({ ...prev, [column.key]: Boolean(value) }))
                          }
                        />
                      </div>
                    ) : (
                      <Input
                        type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                        value={(newRow[column.key] as string | number | undefined) ?? ''}
                        onChange={(e) => setNewRow((prev) => ({ ...prev, [column.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={saveRow}>Save row</Button>

              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedTab.columns.map((column) => (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                    <TableHead className='w-[120px]'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {selectedTab.columns.map((column) => (
                        <TableCell key={`${row.id}-${column.key}`}>{String(row.data[column.key] ?? '')}</TableCell>
                      ))}
                      <TableCell>
                        <Button variant='destructive' size='sm' onClick={() => deleteRow(row.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={selectedTab.columns.length + 1}>No rows created yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
