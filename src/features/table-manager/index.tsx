import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ColumnType = 'text' | 'number' | 'boolean' | 'date'

type TableColumn = {
  key: string
  label: string
  type: ColumnType
}

type DynamicTable = {
  id: string
  name: string
  columns: TableColumn[]
}

type DynamicRow = {
  id: string
  data: Record<string, unknown>
}

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

export function TableManagerPage() {
  const [tables, setTables] = useState<DynamicTable[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [rows, setRows] = useState<DynamicRow[]>([])
  const [tableName, setTableName] = useState('')
  const [columns, setColumns] = useState<TableColumn[]>([
    { key: 'name', label: 'Name', type: 'text' },
  ])
  const [newRow, setNewRow] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId),
    [selectedTableId, tables]
  )

  const loadTables = async () => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables`)
    if (!res.ok) return
    const data = (await res.json()) as DynamicTable[]
    setTables(data)

    if (!selectedTableId && data.length > 0) {
      setSelectedTableId(data[0].id)
    }
  }

  const loadRows = async (tableId: string) => {
    if (!tableId) return
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tableId}/rows`)
    if (!res.ok) return
    const data = (await res.json()) as DynamicRow[]
    setRows(data)
  }

  useEffect(() => {
    loadTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedTableId) {
      setRows([])
      return
    }

    loadRows(selectedTableId)
  }, [selectedTableId])

  const addColumn = () => {
    setColumns((prev) => [
      ...prev,
      { key: `field_${prev.length + 1}`, label: `Field ${prev.length + 1}`, type: 'text' },
    ])
  }

  const updateColumn = (index: number, field: keyof TableColumn, value: string) => {
    setColumns((prev) =>
      prev.map((column, i) => (i === index ? { ...column, [field]: value } : column))
    )
  }

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index))
  }

  const createTable = async () => {
    if (!tableName.trim() || columns.length === 0) return
    setLoading(true)

    const payload = {
      name: tableName.trim(),
      columns: columns.map((column) => ({
        key: column.key.trim(),
        label: column.label.trim() || column.key.trim(),
        type: column.type,
      })),
    }

    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      alert('ساخت جدول ناموفق بود (احتمالاً نام جدول تکراری است).')
      return
    }

    setTableName('')
    setColumns([{ key: 'name', label: 'Name', type: 'text' }])
    await loadTables()
  }

  const deleteTable = async (tableId: string) => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tableId}`, {
      method: 'DELETE',
    })

    if (!res.ok) return

    await loadTables()
    if (selectedTableId === tableId) {
      const remaining = tables.filter((table) => table.id !== tableId)
      setSelectedTableId(remaining[0]?.id ?? '')
    }
  }

  const saveRow = async () => {
    if (!selectedTableId || !selectedTable) return

    const payload: Record<string, unknown> = {}
    selectedTable.columns.forEach((column) => {
      const value = newRow[column.key]
      if (column.type === 'number' && value !== '' && value !== undefined) {
        payload[column.key] = Number(value)
        return
      }
      payload[column.key] = value ?? ''
    })

    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${selectedTableId}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload }),
    })

    if (!res.ok) return

    setNewRow({})
    await loadRows(selectedTableId)
  }

  const deleteRow = async (rowId: string) => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-table-rows/${rowId}`, {
      method: 'DELETE',
    })
    if (!res.ok || !selectedTableId) return
    await loadRows(selectedTableId)
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
          <h2 className='text-2xl font-bold tracking-tight'>Table Manager</h2>
          <p className='text-muted-foreground'>
            این بخش برای ساخت/حذف جدول داینامیک و مدیریت ردیف‌ها از داخل خود داشبورد است.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ساخت جدول جدید</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label>Table Name</Label>
              <Input
                placeholder='مثلاً site_inventory'
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
              />
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label>ستون‌ها</Label>
                <Button type='button' variant='outline' onClick={addColumn}>
                  افزودن ستون
                </Button>
              </div>

              {columns.map((column, index) => (
                <div key={`${column.key}-${index}`} className='grid grid-cols-1 gap-2 md:grid-cols-4'>
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
                  <Select
                    value={column.type}
                    onValueChange={(value) => updateColumn(index, 'type', value)}
                  >
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
                    onClick={() => removeColumn(index)}
                    disabled={columns.length === 1}
                  >
                    حذف
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={createTable} disabled={loading}>
              ساخت جدول
            </Button>
          </CardContent>
        </Card>

        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          <Card className='lg:col-span-1'>
            <CardHeader>
              <CardTitle>جدول‌ها</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              {tables.length === 0 && <p className='text-sm text-muted-foreground'>جدولی ثبت نشده.</p>}
              {tables.map((table) => (
                <div key={table.id} className='flex items-center gap-2'>
                  <Button
                    variant={selectedTableId === table.id ? 'default' : 'outline'}
                    className='flex-1 justify-start'
                    onClick={() => setSelectedTableId(table.id)}
                  >
                    {table.name}
                  </Button>
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => deleteTable(table.id)}
                  >
                    حذف
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className='lg:col-span-2'>
            <CardHeader>
              <CardTitle>مدیریت ردیف‌ها</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {!selectedTable && (
                <p className='text-sm text-muted-foreground'>یک جدول را انتخاب کن.</p>
              )}

              {selectedTable && (
                <>
                  <div className='flex flex-wrap gap-2'>
                    {selectedTable.columns.map((column) => (
                      <Badge key={column.key} variant='secondary'>
                        {column.label} ({column.type})
                      </Badge>
                    ))}
                  </div>

                  <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    {selectedTable.columns.map((column) => (
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
                            onChange={(e) =>
                              setNewRow((prev) => ({ ...prev, [column.key]: e.target.value }))
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <Button onClick={saveRow}>ذخیره ردیف</Button>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedTable.columns.map((column) => (
                          <TableHead key={column.key}>{column.label}</TableHead>
                        ))}
                        <TableHead className='w-[120px]'>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={selectedTable.columns.length + 1}>
                            هیچ ردیفی ثبت نشده.
                          </TableCell>
                        </TableRow>
                      )}
                      {rows.map((row) => (
                        <TableRow key={row.id}>
                          {selectedTable.columns.map((column) => (
                            <TableCell key={`${row.id}-${column.key}`}>
                              {String(row.data[column.key] ?? '')}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button
                              variant='destructive'
                              size='sm'
                              onClick={() => deleteRow(row.id)}
                            >
                              حذف
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
