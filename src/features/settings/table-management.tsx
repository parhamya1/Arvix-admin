import { useEffect, useMemo, useState } from 'react'
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
  sidebarItemId?: string | null
}

type DynamicRow = {
  id: string
  data: Record<string, unknown>
}

type SidebarItem = {
  id: string
  groupTitle: string
  title: string
}

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

export function TableManagement() {
  const [tables, setTables] = useState<DynamicTable[]>([])
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([])
  const [selectedTableId, setSelectedTableId] = useState('')
  const [rows, setRows] = useState<DynamicRow[]>([])
  const [tableName, setTableName] = useState('')
  const [targetSidebarItemId, setTargetSidebarItemId] = useState('none')
  const [columns, setColumns] = useState<TableColumn[]>([{ key: 'name', label: 'Name', type: 'text' }])
  const [newRow, setNewRow] = useState<Record<string, unknown>>({})

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId),
    [selectedTableId, tables]
  )

  const loadTables = async () => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables`)
    if (!res.ok) return
    const data = (await res.json()) as DynamicTable[]
    setTables(data)
    if (!selectedTableId && data.length > 0) setSelectedTableId(data[0].id)
  }

  const loadRows = async (tableId: string) => {
    if (!tableId) return
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tableId}/rows`)
    if (!res.ok) return
    setRows((await res.json()) as DynamicRow[])
  }

  useEffect(() => {
    const controller = new AbortController()

    const bootstrap = async () => {
      const [sidebarRes, tablesRes] = await Promise.all([
        fetch(`${backendBaseUrl}/api/sidebar-items`, { signal: controller.signal }),
        fetch(`${backendBaseUrl}/api/dynamic-tables`, { signal: controller.signal }),
      ])

      if (sidebarRes.ok) setSidebarItems((await sidebarRes.json()) as SidebarItem[])
      if (tablesRes.ok) {
        const data = (await tablesRes.json()) as DynamicTable[]
        setTables(data)
        if (data.length > 0) setSelectedTableId((prev) => prev || data[0].id)
      }
    }

    bootstrap()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const syncRows = async () => {
      if (!selectedTableId) {
        setRows([])
        return
      }
      const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${selectedTableId}/rows`, {
        signal: controller.signal,
      })
      if (!res.ok) return
      setRows((await res.json()) as DynamicRow[])
    }

    syncRows()
    return () => controller.abort()
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

  const createTable = async () => {
    if (!tableName.trim()) return
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tableName.trim(),
        columns,
        sidebarItemId: targetSidebarItemId === 'none' ? null : targetSidebarItemId,
      }),
    })
    if (!res.ok) return

    setTableName('')
    setColumns([{ key: 'name', label: 'Name', type: 'text' }])
    setTargetSidebarItemId('none')
    await loadTables()
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  const updateAssignment = async (tableId: string, sidebarItemId: string) => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tableId}/assignment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sidebarItemId: sidebarItemId === 'none' ? null : sidebarItemId }),
    })
    if (!res.ok) return
    await loadTables()
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  const deleteTable = async (tableId: string) => {
    const res = await fetch(`${backendBaseUrl}/api/dynamic-tables/${tableId}`, {
      method: 'DELETE',
    })
    if (!res.ok) return
    await loadTables()
    if (selectedTableId === tableId) setSelectedTableId('')
    window.dispatchEvent(new Event('sidebar-config-updated'))
  }

  const saveRow = async () => {
    if (!selectedTableId || !selectedTable) return
    const payload: Record<string, unknown> = {}
    selectedTable.columns.forEach((column) => {
      const value = newRow[column.key]
      payload[column.key] = column.type === 'number' ? Number(value ?? 0) : value ?? ''
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
    if (!selectedTableId) return
    const res = await fetch(`${backendBaseUrl}/api/dynamic-table-rows/${rowId}`, {
      method: 'DELETE',
    })
    if (!res.ok) return
    await loadRows(selectedTableId)
  }


  const assignmentPreview = useMemo(() => {
    const groups = sidebarItems.map((item) => ({
      id: item.id,
      label: `${item.groupTitle} / ${item.title}`,
      tables: tables.filter((table) => table.sidebarItemId === item.id),
    }))

    const unassigned = tables.filter((table) => !table.sidebarItemId)

    return { groups, unassigned }
  }, [sidebarItems, tables])

  const sidebarLabel = (id?: string | null) => {
    if (!id) return 'Unassigned'
    const item = sidebarItems.find((entry) => entry.id === id)
    return item ? `${item.groupTitle} / ${item.title}` : 'Unknown item'
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Create Table</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Table name</Label>
              <Input value={tableName} onChange={(e) => setTableName(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>Attach to menu item</Label>
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
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label>Columns</Label>
              <Button type='button' variant='outline' onClick={addColumn}>
                Add column
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
                  onClick={() => setColumns((prev) => prev.filter((_, i) => i !== index))}
                  disabled={columns.length === 1}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={createTable}>Create table</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tables</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {tables.map((table) => (
            <div key={table.id} className='rounded-md border p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <p className='font-medium'>{table.name}</p>
                  <p className='text-xs text-muted-foreground'>Linked menu: {sidebarLabel(table.sidebarItemId)}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <Button variant='outline' size='sm' onClick={() => setSelectedTableId(table.id)}>
                    Open
                  </Button>
                  <Button variant='destructive' size='sm' onClick={() => deleteTable(table.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              <div className='mt-3'>
                <Select
                  value={table.sidebarItemId ?? 'none'}
                  onValueChange={(value) => updateAssignment(table.id, value)}
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
          {tables.length === 0 && <p className='text-sm text-muted-foreground'>No tables created yet.</p>}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Assignment Preview</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {assignmentPreview.groups.map((group) => (
            <div key={group.id} className='rounded-md border p-3'>
              <p className='mb-2 text-sm font-medium'>{group.label}</p>
              {group.tables.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {group.tables.map((table) => (
                    <Badge key={table.id} variant='secondary'>
                      {table.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className='text-xs text-muted-foreground'>No table assigned to this menu item.</p>
              )}
            </div>
          ))}

          <div className='rounded-md border p-3'>
            <p className='mb-2 text-sm font-medium'>Unassigned tables</p>
            {assignmentPreview.unassigned.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {assignmentPreview.unassigned.map((table) => (
                  <Badge key={table.id}>{table.name}</Badge>
                ))}
              </div>
            ) : (
              <p className='text-xs text-muted-foreground'>All tables are assigned.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rows</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {!selectedTable && <p className='text-sm text-muted-foreground'>Open a table to manage rows.</p>}

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
              <Button onClick={saveRow}>Save row</Button>

              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedTable.columns.map((column) => (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                    <TableHead className='w-[120px]'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {selectedTable.columns.map((column) => (
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
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={selectedTable.columns.length + 1}>No rows created yet.</TableCell>
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
