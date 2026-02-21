import { useMemo, useState } from 'react'
import { Download, Filter, Plus, RotateCcw, Trash2, X } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { type ExportFormat, exportTableData } from '@/lib/table-export'

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

type ColumnType = 'text' | 'number' | 'boolean' | 'date'
type TableColumn = { key: string; label: string; type: ColumnType }
type DynamicTable = { id: string; name: string; columns: TableColumn[]; pageId?: string | null }
type DynamicRow = { id: string; data: Record<string, unknown> }
type DynamicPage = { id: string; name: string; sidebarItemId?: string | null }

export function DynamicTableViewer({ tableId }: { tableId: string }) {
  const pageId = tableId
  const [activeTableId, setActiveTableId] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({})
  const [newRow, setNewRow] = useState<Record<string, unknown>>({})
  const [newTabName, setNewTabName] = useState('')
  const [newTabMode, setNewTabMode] = useState<'manual' | 'import'>('manual')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addTabDialogOpen, setAddTabDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')

  const pagesQuery = useQuery({
    queryKey: ['dynamic-pages-all'],
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-pages`)
      if (!res.ok) throw new Error('Failed to load pages')
      return (await res.json()) as DynamicPage[]
    },
  })

  const tabsQuery = useQuery({
    queryKey: ['dynamic-page-tabs', pageId],
    enabled: Boolean(pageId),
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${pageId}/tabs`)
      if (!res.ok) throw new Error('Failed to load tabs')
      return (await res.json()) as DynamicTable[]
    },
  })

  const page = useMemo(
    () => (pagesQuery.data ?? []).find((entry) => entry.id === pageId),
    [pagesQuery.data, pageId]
  )

  const tabs = useMemo(() => tabsQuery.data ?? [], [tabsQuery.data])
  const resolvedActiveTableId = tabs.find((tab) => tab.id === activeTableId)?.id ?? tabs[0]?.id ?? ''
  const activeTable = tabs.find((table) => table.id === resolvedActiveTableId)

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
    const res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${pageId}/tabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTabName.trim(),
        columns,
      }),
    })

    if (!res.ok) return

    const created = (await res.json()) as { id: string }
    setNewTabName('')
    setAddTabDialogOpen(false)
    await tabsQuery.refetch()
    setActiveTableId(created.id)
    setFilters({})
    setDraftFilters({})
    setNewRow({})
  }

  const fileToBase64 = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(arrayBuffer)
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    return btoa(binary)
  }

  const importTabFromFile = async () => {
    if (!newTabName.trim() || !importFile) return

    try {
      setImportLoading(true)
      setImportError('')
      const fileContentBase64 = await fileToBase64(importFile)

      const payload = {
        pageId,
        name: newTabName.trim(),
        fileName: importFile.name,
        fileContentBase64,
      }

      let res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${pageId}/tabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 404) {
        res = await fetch(`${backendBaseUrl}/api/dynamic-pages/${pageId}/tabs/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.status === 404) {
        res = await fetch(`${backendBaseUrl}/api/dynamic-tables/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        setImportError(payload?.message ?? `Import failed (HTTP ${res.status}).`)
        return
      }

      const created = (await res.json()) as { id: string }
      setNewTabName('')
      setImportFile(null)
      setAddTabDialogOpen(false)
      await tabsQuery.refetch()
      setActiveTableId(created.id)
      setFilters({})
      setDraftFilters({})
      setNewRow({})
    } finally {
      setImportLoading(false)
    }
  }


  const exportActiveRows = () => {
    if (!activeTable) return
    exportTableData({
      columns: activeTable.columns.map((column) => ({ key: column.key, label: column.label })),
      rows: filteredRows.map((row) => row.data),
      format: exportFormat,
      fileBaseName: `${page?.name ?? 'dynamic-page'}-${activeTable.name}`
        .toLowerCase()
        .replace(/\s+/g, '-'),
    })
    setExportDialogOpen(false)
  }

  const deleteCurrentTab = async () => {
    if (!activeTable) return
    await fetch(`${backendBaseUrl}/api/dynamic-tables/${activeTable.id}`, { method: 'DELETE' })
    await tabsQuery.refetch()
    setDeleteDialogOpen(false)
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
            <h2 className='text-2xl font-bold tracking-tight'>{page?.name ?? 'Dynamic Page'}</h2>
            <p className='text-muted-foreground'>Runtime table view with quick actions.</p>
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
                    <DialogDescription>Apply filter values per column. Results update after Apply.</DialogDescription>
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
                    <DialogDescription>Fill row data and save. Data is added to active tab only.</DialogDescription>
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
                    <DialogDescription>Full table view for active tab. Use row-level Delete actions.</DialogDescription>
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
                    <DialogDescription>Create manually or import CSV/Excel.</DialogDescription>
                  </DialogHeader>

                  <div className='space-y-2'>
                    <Label>Creation mode</Label>
                    <Select
                      value={newTabMode}
                      onValueChange={(value: 'manual' | 'import') => {
                        setNewTabMode(value)
                        setImportError('')
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='manual'>Manual (copy active tab columns)</SelectItem>
                        <SelectItem value='import'>Import CSV / Excel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label>Table name</Label>
                    <Input value={newTabName} onChange={(e) => setNewTabName(e.target.value)} />
                  </div>

                  {newTabMode === 'import' && (
                    <div className='space-y-2'>
                      <Label>CSV / Excel file</Label>
                      <Input
                        type='file'
                        accept='.csv,.xlsx'
                        onChange={(e) => {
                          setImportFile(e.target.files?.[0] ?? null)
                          setImportError('')
                        }}
                      />
                      <p className='text-xs text-muted-foreground'>
                        Header row is detected automatically and rows will be inserted into the new tab.
                      </p>
                      {importError && <p className='text-xs text-destructive'>{importError}</p>}
                    </div>
                  )}

                  <div className='flex justify-end gap-2'>
                    <Button variant='outline' onClick={() => setAddTabDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={newTabMode === 'import' ? importTabFromFile : addTab}
                      disabled={importLoading}
                    >
                      {newTabMode === 'import'
                        ? importLoading
                          ? 'Importing...'
                          : 'Import & create tab'
                        : 'Create tab'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>


              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button size='icon' variant='outline' disabled={!activeTable}>
                        <Download className='size-4' />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Export data</TooltipContent>
                </Tooltip>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export table data</DialogTitle>
                    <DialogDescription>
                      Choose format, then click Apply to export current table data.
                    </DialogDescription>
                  </DialogHeader>

                  <div className='space-y-2'>
                    <Label>Export format</Label>
                    <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='csv'>CSV</SelectItem>
                        <SelectItem value='excel'>Excel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='flex justify-end gap-2'>
                    <Button variant='outline' onClick={() => setExportDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={exportActiveRows}>Apply</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size='icon' variant='outline' onClick={deleteCurrentTab} disabled={!activeTable}>
                    <X className='size-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete active tab/table</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {!activeTable && <p className='text-sm text-muted-foreground'>No tab available in this page.</p>}

        {activeTable && (
          <Card>
            <CardHeader className='space-y-3'>
              <CardTitle className='flex items-center justify-between'>
                <span>Data Grid</span>
                <span className='text-sm font-normal text-muted-foreground'>
                  {filteredRows.length} rows • {activeFilterCount} active filters
                </span>
              </CardTitle>

              {tabs.length > 1 && (
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
                    {tabs.map((table) => (
                      <TabsTrigger key={table.id} value={table.id}>
                        {table.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

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
        )}
      </Main>
    </>
  )
}
