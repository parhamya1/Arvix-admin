import { useMemo, useState } from 'react'
import { Filter, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

type ColumnType = 'text' | 'number' | 'boolean' | 'date'
type TableColumn = { key: string; label: string; type: ColumnType }
type DynamicTable = {
  id: string
  name: string
  columns: TableColumn[]
  sidebarItemId?: string | null
}
type DynamicRow = { id: string; data: Record<string, unknown> }

export function DynamicTableViewer({ tableId }: { tableId: string }) {
  const [activeTableId, setActiveTableId] = useState(tableId)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({})
  const [newRow, setNewRow] = useState<Record<string, unknown>>({})
  const [newTabName, setNewTabName] = useState('')

  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addTabDialogOpen, setAddTabDialogOpen] = useState(false)

  const tablesQuery = useQuery({
    queryKey: ['dynamic-tables-all'],
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-tables`)
      if (!res.ok) throw new Error('Failed to load tables')
      return (await res.json()) as DynamicTable[]
    },
  })

  const initialTable = useMemo(
    () => (tablesQuery.data ?? []).find((table) => table.id === tableId),
    [tablesQuery.data, tableId]
  )

  const siblingTables = useMemo(() => {
    const allTables = tablesQuery.data ?? []
    if (!initialTable) return allTables.filter((table) => table.id === activeTableId)

    if (!initialTable.sidebarItemId) {
      return allTables.filter((table) => table.id === initialTable.id)
    }

    return allTables.filter((table) => table.sidebarItemId === initialTable.sidebarItemId)
  }, [tablesQuery.data, initialTable, activeTableId])

  const resolvedActiveTableId =
    siblingTables.find((table) => table.id === activeTableId)?.id ?? siblingTables[0]?.id ?? ''

  const activeTable = useMemo(
    () => siblingTables.find((table) => table.id === resolvedActiveTableId),
    [siblingTables, resolvedActiveTableId]
  )


  const rowsQuery = useQuery({
    queryKey: ['dynamic-table-rows', resolvedActiveTableId],
    enabled: Boolean(resolvedActiveTableId),
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${resolvedActiveTableId}/rows`)
      if (!res.ok) throw new Error('Rows fetch failed')
      return (await res.json()) as DynamicRow[]
    },
  })


  const filteredRows = useMemo(() => {
    const rows = rowsQuery.data ?? []
    return rows.filter((row) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true
        return String(row.data[key] ?? '')
          .toLowerCase()
          .includes(value.toLowerCase())
      })
    )
  }, [rowsQuery.data, filters])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const openFilterDialog = () => {
    setDraftFilters(filters)
    setFilterDialogOpen(true)
  }

  const applyFilters = () => {
    setFilters(draftFilters)
    setFilterDialogOpen(false)
  }

  const addRow = async () => {
    if (!activeTable) return

    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${activeTable.id}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: newRow }),
    })

    if (!res.ok) return

    setNewRow({})
    setAddDialogOpen(false)
    rowsQuery.refetch()
  }

  const deleteRow = async (rowId: string) => {
    await fetch(`${backendBaseUrl}/api/dynamic-table-rows/${rowId}`, {
      method: 'DELETE',
    })
    rowsQuery.refetch()
  }

  const addTab = async () => {
    if (!newTabName.trim()) return

    const columns = activeTable?.columns ?? [{ key: 'name', label: 'Name', type: 'text' as const }]
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTabName.trim(),
        columns,
        sidebarItemId: initialTable?.sidebarItemId ?? null,
      }),
    })

    if (!res.ok) return

    const created = (await res.json()) as { id: string }
    setNewTabName('')
    setAddTabDialogOpen(false)
    await tablesQuery.refetch()
    setActiveTableId(created.id)
    setFilters({})
    setDraftFilters({})
    setNewRow({})
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  const deleteCurrentTab = async () => {
    if (!activeTable) return
    await fetch(`${backendBaseUrl}/api/dynamic-tables/${activeTable.id}`, { method: 'DELETE' })
    await tablesQuery.refetch()
    setDeleteDialogOpen(false)
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {initialTable?.name ?? activeTable?.name ?? 'Dynamic Table'}
            </h2>
            <p className='text-muted-foreground'>
              Runtime table view with horizontal tabs and quick actions.
            </p>
          </div>

          <TooltipProvider>
            <div className='flex items-center gap-2'>
              <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button size='icon' variant='outline' onClick={openFilterDialog}>
                        <Filter className='size-4' />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Filter columns</TooltipContent>
                </Tooltip>

                <DialogContent className='max-w-3xl'>
                  <DialogHeader>
                    <DialogTitle>Column Filters</DialogTitle>
                    <DialogDescription>
                      Apply filter values per column. Results update after Apply.
                    </DialogDescription>
                  </DialogHeader>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                    {activeTable?.columns.map((column) => (
                      <div key={column.key} className='space-y-1'>
                        <Label>{column.label}</Label>
                        <Input
                          placeholder={`Filter ${column.label}`}
                          value={draftFilters[column.key] ?? ''}
                          onChange={(e) =>
                            setDraftFilters((prev) => ({ ...prev, [column.key]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className='flex items-center justify-between gap-2'>
                    <Button variant='outline' onClick={() => setDraftFilters({})} className='gap-2'>
                      <RotateCcw className='size-4' />
                      Reset filters
                    </Button>

                    <div className='flex items-center gap-2'>
                      <Button variant='outline' onClick={() => setFilterDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={applyFilters}>Apply</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button size='icon'>
                        <Plus className='size-4' />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Add row</TooltipContent>
                </Tooltip>

                <DialogContent className='max-w-3xl'>
                  <DialogHeader>
                    <DialogTitle>Add row</DialogTitle>
                    <DialogDescription>
                      Fill row data and save. Data is added to active tab only.
                    </DialogDescription>
                  </DialogHeader>

                  <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                    {activeTable?.columns.map((column) => (
                      <div key={column.key} className='space-y-1'>
                        <Label>{column.label}</Label>
                        <Input
                          type={
                            column.type === 'number'
                              ? 'number'
                              : column.type === 'date'
                                ? 'date'
                                : 'text'
                          }
                          value={(newRow[column.key] as string | number | undefined) ?? ''}
                          onChange={(e) =>
                            setNewRow((prev) => ({
                              ...prev,
                              [column.key]:
                                column.type === 'number' ? Number(e.target.value) : e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className='flex justify-end'>
                    <Button onClick={addRow}>Save row</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button size='icon' variant='outline'>
                        <Trash2 className='size-4' />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Delete row</TooltipContent>
                </Tooltip>

                <DialogContent className='max-w-5xl'>
                  <DialogHeader>
                    <DialogTitle>Delete Rows</DialogTitle>
                    <DialogDescription>
                      Full table view for active tab. Use row-level Delete actions.
                    </DialogDescription>
                  </DialogHeader>

                  <div className='max-h-[60vh] overflow-auto rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {activeTable?.columns.map((column) => (
                            <TableHead key={column.key}>{column.label}</TableHead>
                          ))}
                          <TableHead className='w-[120px]'>Delete</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((row) => (
                          <TableRow key={row.id}>
                            {activeTable?.columns.map((column) => (
                              <TableCell key={`${row.id}-${column.key}`}>
                                {String(row.data[column.key] ?? '')}
                              </TableCell>
                            ))}
                            <TableCell>
                              <Button variant='destructive' size='sm' onClick={() => deleteRow(row.id)}>
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={(activeTable?.columns.length ?? 0) + 1}>
                              No rows available for deletion.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className='flex justify-end'>
                    <Button variant='outline' onClick={() => setDeleteDialogOpen(false)}>
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={addTabDialogOpen} onOpenChange={setAddTabDialogOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button size='icon' variant='outline'>
                        <Plus className='size-4' />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Add tab</TooltipContent>
                </Tooltip>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add table tab</DialogTitle>
                    <DialogDescription>
                      Create a new table tab under this same category context.
                    </DialogDescription>
                  </DialogHeader>

                  <div className='space-y-2'>
                    <Label>Table name</Label>
                    <Input value={newTabName} onChange={(e) => setNewTabName(e.target.value)} />
                  </div>

                  <div className='flex justify-end gap-2'>
                    <Button variant='outline' onClick={() => setAddTabDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addTab}>Create tab</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size='icon'
                    variant='outline'
                    onClick={deleteCurrentTab}
                    disabled={!activeTable}
                  >
                    <X className='size-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete active tab/table</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {!activeTable && <p className='text-sm text-muted-foreground'>No table available in this context.</p>}

        {activeTable && (
          <>
            <Card>
              <CardHeader className='space-y-3'>
                <CardTitle className='flex items-center justify-between'>
                  <span>Data Grid</span>
                  <span className='text-sm font-normal text-muted-foreground'>
                    {filteredRows.length} rows • {activeFilterCount} active filters
                  </span>
                </CardTitle>

                <Tabs
                  value={resolvedActiveTableId}
                  onValueChange={(value) => {
                    setActiveTableId(value)
                    setFilters({})
                    setDraftFilters({})
                    setNewRow({})
                  }}
                >
                  <TabsList className='h-auto flex-wrap justify-start'>
                    {siblingTables.map((table) => (
                      <TabsTrigger key={table.id} value={table.id}>
                        {table.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className='flex flex-wrap gap-2'>
                  {activeTable.columns.map((column) => (
                    <Badge key={column.key} variant='secondary'>
                      {column.label}
                    </Badge>
                  ))}
                </div>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {activeTable.columns.map((column) => (
                        <TableHead key={column.key}>{column.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        {activeTable.columns.map((column) => (
                          <TableCell key={`${row.id}-${column.key}`}>
                            {String(row.data[column.key] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {filteredRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={activeTable.columns.length}>No data for active filters.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </Main>
    </>
  )
}
