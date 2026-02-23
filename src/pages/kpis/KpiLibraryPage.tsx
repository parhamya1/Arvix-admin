import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { duplicateKpi, setKpiActive, deleteKpi, listKpis } from '@/lib/kpiApi'
import type { KpiListItem, KpiVendorScope } from '@/lib/kpiTypes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function KpiLibraryPage() {
  const [search, setSearch] = useState('')
  const [vendorFilter, setVendorFilter] = useState<KpiVendorScope | 'Any'>(
    'Any'
  )
  const [deleteTarget, setDeleteTarget] = useState<KpiListItem | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const query = useQuery({ queryKey: ['kpis'], queryFn: listKpis })

  const filtered = useMemo(() => {
    const rows = query.data ?? []
    return rows.filter((row) => {
      const searchOk = row.name.toLowerCase().includes(search.toLowerCase())
      const vendorOk =
        vendorFilter === 'Any' || row.vendorScope === vendorFilter
      return searchOk && vendorOk
    })
  }, [query.data, search, vendorFilter])

  const refresh = async () => {
    await query.refetch()
  }

  const runAction = async (
    id: string,
    action: () => Promise<unknown>,
    success: string
  ) => {
    setBusyId(id)
    try {
      await action()
      toast.success(success)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className='space-y-4 p-4 md:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='text-2xl font-semibold tracking-tight'>KPI List</h1>
        <Button
          onClick={() => {
            window.location.href = '/kpis/new'
          }}
        >
          New KPI
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Definitions</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            <div className='space-y-2 md:col-span-2'>
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search KPI by name'
              />
            </div>
            <div className='space-y-2'>
              <Label>Vendor</Label>
              <Select
                value={vendorFilter}
                onValueChange={(value: KpiVendorScope | 'Any') =>
                  setVendorFilter(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Any'>Any</SelectItem>
                  <SelectItem value='All'>All</SelectItem>
                  <SelectItem value='Nokia'>Nokia</SelectItem>
                  <SelectItem value='Ericsson'>Ericsson</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Granularity</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className='w-[90px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.name}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.vendorScope}</TableCell>
                    <TableCell>{row.granularity}</TableCell>
                    <TableCell>v{row.version}</TableCell>
                    <TableCell>
                      <Switch
                        checked={row.isActive}
                        disabled={busyId === row.id}
                        onCheckedChange={(value) =>
                          runAction(
                            row.id,
                            () => setKpiActive(row.id, value),
                            'Activation updated'
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size='icon' variant='ghost'>
                            <MoreHorizontal className='size-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => {
                              window.location.href = `/kpis/${row.id}`
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              runAction(
                                row.id,
                                () => duplicateKpi(row.id),
                                'KPI duplicated'
                              )
                            }
                          >
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='text-destructive'
                            onClick={() => setDeleteTarget(row)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>No KPIs found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete KPI</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={async () => {
                if (!deleteTarget) return
                await runAction(
                  deleteTarget.id,
                  () => deleteKpi(deleteTarget.id),
                  'KPI deleted'
                )
                setDeleteTarget(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
