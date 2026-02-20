import { useMemo, useState } from 'react'
import { Filter, Plus, RotateCcw } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

type ColumnType = 'text' | 'number' | 'boolean' | 'date'
type TableColumn = { key: string; label: string; type: ColumnType }
type DynamicTable = { id: string; name: string; columns: TableColumn[] }
type DynamicRow = { id: string; data: Record<string, unknown> }

export function DynamicTableViewer({ tableId }: { tableId: string }) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [newRow, setNewRow] = useState<Record<string, unknown>>({})
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const tableQuery = useQuery({
    queryKey: ['dynamic-table', tableId],
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tableId}`)
      if (!res.ok) throw new Error('Table not found')
      return (await res.json()) as DynamicTable
    },
  })

  const rowsQuery = useQuery({
    queryKey: ['dynamic-table-rows', tableId],
    queryFn: async () => {
      const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tableId}/rows`)
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

  const addRow = async () => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tableId}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: newRow }),
    })

    if (!res.ok) return

    setNewRow({})
    setAddDialogOpen(false)
    rowsQuery.refetch()
  }

  const removeRow = async (rowId: string) => {
    await fetch(`${backendBaseUrl}/api/dynamic-table-rows/${rowId}`, { method: 'DELETE' })
    rowsQuery.refetch()
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
              {tableQuery.data?.name ?? 'Dynamic Table'}
            </h2>
            <p className='text-muted-foreground'>
              Runtime table view with quick actions, column filters, and row operations.
            </p>
          </div>

          <TooltipProvider>
            <div className='flex items-center gap-2'>
              <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button size='icon' variant='outline'>
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
                      Apply filter values per column. Results are updated in the table immediately.
                    </DialogDescription>
                  </DialogHeader>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                    {tableQuery.data?.columns.map((column) => (
                      <div key={column.key} className='space-y-1'>
                        <Label>{column.label}</Label>
                        <Input
                          placeholder={`Filter ${column.label}`}
                          value={filters[column.key] ?? ''}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, [column.key]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className='flex justify-end'>
                    <Button
                      variant='outline'
                      onClick={() => setFilters({})}
                      className='gap-2'
                    >
                      <RotateCcw className='size-4' />
                      Reset filters
                    </Button>
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
                      Fill row data and save. The table is refreshed automatically.
                    </DialogDescription>
                  </DialogHeader>

                  <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                    {tableQuery.data?.columns.map((column) => (
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
            </div>
          </TooltipProvider>
        </div>

        {tableQuery.isLoading && <p className='text-sm text-muted-foreground'>Loading table...</p>}
        {tableQuery.error && <p className='text-sm text-destructive'>Table not found or backend is unavailable.</p>}

        {tableQuery.data && (
          <Card>
            <CardHeader className='space-y-3'>
              <CardTitle className='flex items-center justify-between'>
                <span>Data Grid</span>
                <span className='text-sm font-normal text-muted-foreground'>
                  {filteredRows.length} rows • {activeFilterCount} active filters
                </span>
              </CardTitle>

              <div className='flex flex-wrap gap-2'>
                {tableQuery.data.columns.map((column) => (
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
                    {tableQuery.data.columns.map((column) => (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                    <TableHead className='w-[120px]'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      {tableQuery.data.columns.map((column) => (
                        <TableCell key={`${row.id}-${column.key}`}>
                          {String(row.data[column.key] ?? '')}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button variant='destructive' size='sm' onClick={() => removeRow(row.id)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={tableQuery.data.columns.length + 1}>
                        No data for active filters.
                      </TableCell>
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
