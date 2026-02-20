import { useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useQuery } from '@tanstack/react-query'

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

type ColumnType = 'text' | 'number' | 'boolean' | 'date'
type TableColumn = { key: string; label: string; type: ColumnType }
type DynamicTable = { id: string; name: string; columns: TableColumn[] }
type DynamicRow = { id: string; data: Record<string, unknown> }

export function DynamicTableViewer({ tableId }: { tableId: string }) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [newRow, setNewRow] = useState<Record<string, unknown>>({})

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

  const addRow = async () => {
    await fetch(`${backendBaseUrl}/api/dynamic-tables/${tableId}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: newRow }),
    })
    setNewRow({})
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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Dynamic Table Viewer</h2>
          <p className='text-muted-foreground'>Professional view with filters, add row, and remove row actions.</p>
        </div>

        {tableQuery.isLoading && <p className='text-sm text-muted-foreground'>Loading table...</p>}
        {tableQuery.error && <p className='text-sm text-destructive'>Table not found or backend is unavailable.</p>}

        {tableQuery.data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{tableQuery.data.name}</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex flex-wrap gap-2'>
                  {tableQuery.data.columns.map((column) => (
                    <Badge key={column.key} variant='secondary'>
                      {column.label} ({column.type})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Column filters</CardTitle>
              </CardHeader>
              <CardContent className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                {tableQuery.data.columns.map((column) => (
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add row</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  {tableQuery.data.columns.map((column) => (
                    <div key={column.key} className='space-y-1'>
                      <Label>{column.label}</Label>
                      <Input
                        type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                        value={(newRow[column.key] as string | number | undefined) ?? ''}
                        onChange={(e) =>
                          setNewRow((prev) => ({
                            ...prev,
                            [column.key]: column.type === 'number' ? Number(e.target.value) : e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={addRow}>Add row</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data</CardTitle>
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
                          <TableCell key={`${row.id}-${column.key}`}>{String(row.data[column.key] ?? '')}</TableCell>
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
                        <TableCell colSpan={tableQuery.data.columns.length + 1}>No data for active filters.</TableCell>
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
