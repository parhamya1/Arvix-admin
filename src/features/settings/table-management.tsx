import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const [selectedTabId, setSelectedTabId] = useState('')

  const [tabName, setTabName] = useState('')
  const [notice, setNotice] = useState('')
  const [columns, setColumns] = useState<EditableColumn[]>([createColumn(1)])
  const [newRow, setNewRow] = useState<Record<string, unknown>>({})

  const [editingTabId, setEditingTabId] = useState('')
  const [editTabName, setEditTabName] = useState('')
  const [editColumns, setEditColumns] = useState<EditableColumn[]>([])

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

  const pages = pagesQuery.data ?? []
  const categories = useMemo(
    () =>
      (sidebarItemsQuery.data ?? [])
        .slice()
        .sort((a, b) => `${a.groupTitle} / ${a.title}`.localeCompare(`${b.groupTitle} / ${b.title}`)),
    [sidebarItemsQuery.data]
  )

  const selectedCategory = categories.find((item) => item.id === selectedCategoryId)
  const selectedPage = pages.find((page) => page.sidebarItemId === selectedCategoryId)

  const tabsQuery = useQuery({
    queryKey: ['dynamic-page-tabs', selectedPage?.id ?? 'none'],
    enabled: Boolean(selectedPage?.id),
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${selectedPage?.id}/tabs`)
      if (!res.ok) throw new Error('failed')
      return (await res.json()) as DynamicTab[]
    },
  })

  const tabs = useMemo(() => tabsQuery.data ?? [], [tabsQuery.data])
  const resolvedTabId = tabs.find((tab) => tab.id === selectedTabId)?.id ?? tabs[0]?.id ?? ''
  const selectedTab = tabs.find((tab) => tab.id === resolvedTabId)

  const rowsQuery = useQuery({
    queryKey: ['dynamic-tab-rows', resolvedTabId],
    enabled: Boolean(resolvedTabId),
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${resolvedTabId}/rows`)
      if (!res.ok) throw new Error('failed')
      return (await res.json()) as DynamicRow[]
    },
  })

  const rows = rowsQuery.data ?? []

  const createPageForSelectedCategory = async () => {
    if (!selectedCategory || selectedPage) return
    const res = await fetch(`${backendBaseUrl}/api/dynamic-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${selectedCategory.groupTitle} / ${selectedCategory.title}`,
        sidebarItemId: selectedCategory.id,
      }),
    })
    if (!res.ok) {
      setNotice('Page creation for selected category failed.')
      return
    }
    await pagesQuery.refetch()
    window.dispatchEvent(new Event('sidebar-config-updated'))
    setNotice('Page was created for selected category.')
  }

  const createTab = async () => {
    if (!selectedPage?.id || !tabName.trim()) return
    setNotice('')
    const payloadColumns = columns.map(({ key, label, type }) => ({ key, label, type }))
    const res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${selectedPage.id}/tabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tabName.trim(), columns: payloadColumns }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      setNotice(body?.message ?? 'Add tab failed.')
      return
    }
    const created = (await res.json()) as { id: string }
    setTabName('')
    setColumns([createColumn(1)])
    setSelectedTabId(created.id)
    await queryClient.invalidateQueries({ queryKey: ['dynamic-page-tabs', selectedPage.id] })
    setNotice('Tab added successfully.')
  }

  const deleteTab = async (tabId: string) => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tabId}`, { method: 'DELETE' })
    if (!res.ok) return
    await tabsQuery.refetch()
    await rowsQuery.refetch()
  }

  const startEditTab = (tab: DynamicTab) => {
    setEditingTabId(tab.id)
    setEditTabName(tab.name)
    setEditColumns(
      tab.columns.map((column, index) => ({ uid: crypto.randomUUID(), ...column, key: column.key || `field_${index + 1}` }))
    )
  }

  const saveTabEdit = async () => {
    if (!editingTabId || !editTabName.trim() || editColumns.length === 0) return
    const payloadColumns = editColumns.map(({ key, label, type }) => ({ key, label, type }))
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${editingTabId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editTabName.trim(), columns: payloadColumns }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      setNotice(body?.message ?? 'Update tab failed.')
      return
    }
    await tabsQuery.refetch()
    setEditingTabId('')
    setEditColumns([])
    setEditTabName('')
    setNotice('Tab updated successfully.')
  }

  const addColumn = () => setColumns((prev) => [...prev, createColumn(prev.length + 1)])
  const updateColumn = (index: number, field: keyof TableColumn, value: string) => {
    setColumns((prev) => prev.map((column, i) => (i === index ? { ...column, [field]: value } : column)))
  }

  const addEditColumn = () => setEditColumns((prev) => [...prev, createColumn(prev.length + 1)])
  const updateEditColumn = (index: number, field: keyof TableColumn, value: string) => {
    setEditColumns((prev) => prev.map((column, i) => (i === index ? { ...column, [field]: value } : column)))
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

  return (
    <div className='space-y-4 pb-8'>
      <Card>
        <CardHeader>
          <CardTitle>Category selector</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          <Label>Select category</Label>
          <Popover open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={categoryPickerOpen}
                className='w-full justify-between'
              >
                {selectedCategory
                  ? `${selectedCategory.groupTitle} / ${selectedCategory.title}`
                  : 'Select category...'}
                <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[420px] p-0'>
              <Command>
                <CommandInput placeholder='Search category...' />
                <CommandList>
                  <CommandEmpty>No category found.</CommandEmpty>
                  <CommandGroup>
                    {categories.map((item) => {
                      const label = `${item.groupTitle} / ${item.title}`
                      return (
                        <CommandItem
                          key={item.id}
                          value={label}
                          onSelect={() => {
                            setSelectedCategoryId(item.id)
                            setSelectedTabId('')
                            setNotice('')
                            setCategoryPickerOpen(false)
                          }}
                        >
                          <Check
                            className={`mr-2 size-4 ${selectedCategoryId === item.id ? 'opacity-100' : 'opacity-0'}`}
                          />
                          {label}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {selectedCategory && !selectedPage && (
        <Card>
          <CardHeader>
            <CardTitle>No page assigned for selected category</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={createPageForSelectedCategory}>Create page for this category</Button>
          </CardContent>
        </Card>
      )}

      {selectedPage && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Create Tab for selected category page</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
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
                    <Input value={column.key} onChange={(e) => updateColumn(index, 'key', e.target.value)} />
                    <Input value={column.label} onChange={(e) => updateColumn(index, 'label', e.target.value)} />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tabs of selected category</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {tabs.map((tab) => (
                <div key={tab.id} className='rounded-md border p-3'>
                  <div className='mb-2 flex items-center justify-between'>
                    <p className='font-medium'>{tab.name}</p>
                    <div className='flex gap-2'>
                      <Button variant='outline' size='sm' onClick={() => setSelectedTabId(tab.id)}>
                        Open
                      </Button>
                      <Button variant='outline' size='sm' onClick={() => startEditTab(tab)}>
                        Edit
                      </Button>
                      <Button variant='destructive' size='sm' onClick={() => deleteTab(tab.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {tab.columns.map((column) => (
                      <Badge key={`${tab.id}-${column.key}`}>{column.label} ({column.type})</Badge>
                    ))}
                  </div>
                </div>
              ))}
              {tabs.length === 0 && <p className='text-sm text-muted-foreground'>No tabs for this category yet.</p>}
            </CardContent>
          </Card>
        </>
      )}

      {editingTabId && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Tab</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label>Tab name</Label>
              <Input value={editTabName} onChange={(e) => setEditTabName(e.target.value)} />
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label>Columns</Label>
                <Button type='button' variant='outline' onClick={addEditColumn}>
                  Add column
                </Button>
              </div>
              {editColumns.map((column, index) => (
                <div key={column.uid} className='grid grid-cols-1 gap-2 md:grid-cols-4'>
                  <Input value={column.key} onChange={(e) => updateEditColumn(index, 'key', e.target.value)} />
                  <Input value={column.label} onChange={(e) => updateEditColumn(index, 'label', e.target.value)} />
                  <Select value={column.type} onValueChange={(value) => updateEditColumn(index, 'type', value)}>
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
                    onClick={() => setEditColumns((prev) => prev.filter((entry) => entry.uid !== column.uid))}
                    disabled={editColumns.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className='flex gap-2'>
              <Button onClick={saveTabEdit}>Save changes</Button>
              <Button
                variant='outline'
                onClick={() => {
                  setEditingTabId('')
                  setEditColumns([])
                  setEditTabName('')
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rows (selected tab only)</CardTitle>
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
