import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { deleteKpi, listKpis } from '@/lib/kpiApi'
import type { KpiListItem } from '@/lib/kpiTypes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type StatusRow = {
  id: string
  kpiId: string
  kpiName: string
  scope: string
  currentValue: string
  baselineValue: string
  delta: string
  healthStatus: 'Normal' | 'Warning' | 'Critical'
}

const toHealth = (
  value: number,
  yellow: number,
  green: number
): StatusRow['healthStatus'] => {
  if (value >= green) return 'Normal'
  if (value >= yellow) return 'Warning'
  return 'Critical'
}

const formatKpiValue = (unit: string, value: number) => {
  if (unit === '%') return `${value.toFixed(2)}%`
  if (unit === 'Mbps') return `${value.toFixed(0)} Mbps`
  if (unit === 'bytes') return `${value.toFixed(0)} bytes`
  return value.toFixed(2)
}

export default function KpiLibraryPage() {
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<KpiListItem | null>(null)
  const query = useQuery({ queryKey: ['kpis'], queryFn: listKpis })

  const statusRows = useMemo<StatusRow[]>(() => {
    const rows: StatusRow[] = []
    for (const kpi of query.data ?? []) {
      const avg = Number(kpi.preview?.avg ?? 0)
      const green = Number(kpi.thresholds?.greenGte ?? 98)
      const yellow = Number(kpi.thresholds?.yellowGte ?? 95)
      const baseline = green
      const delta = avg - baseline

      rows.push({
        id: `${kpi.id}-network`,
        kpiId: kpi.id,
        kpiName: kpi.name,
        scope: 'Network',
        currentValue: formatKpiValue(kpi.unit, avg),
        baselineValue: formatKpiValue(kpi.unit, baseline),
        delta: `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`,
        healthStatus: toHealth(avg, yellow, green),
      })

      const topRegions = (kpi.preview?.rows ?? []).slice(0, 2)
      topRegions.forEach((item) => {
        const rowDelta = item.kpiValue - baseline
        rows.push({
          id: `${kpi.id}-${item.objectName}`,
          kpiId: kpi.id,
          kpiName: kpi.name,
          scope: `Region ${item.objectName}`,
          currentValue: formatKpiValue(kpi.unit, item.kpiValue),
          baselineValue: formatKpiValue(kpi.unit, baseline),
          delta: `${rowDelta >= 0 ? '+' : ''}${rowDelta.toFixed(2)}`,
          healthStatus:
            item.status === 'Green'
              ? 'Normal'
              : item.status === 'Yellow'
                ? 'Warning'
                : 'Critical',
        })
      })
    }

    return rows.filter((row) =>
      `${row.kpiName} ${row.scope}`.toLowerCase().includes(search.toLowerCase())
    )
  }, [query.data, search])

  const deleteItem = async () => {
    if (!deleteTarget) return
    try {
      await deleteKpi(deleteTarget.id)
      toast.success('KPI deleted')
      setDeleteTarget(null)
      await query.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  return (
    <div className='space-y-4 p-4 md:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          KPI Status (Network & Regions)
        </h1>
        <Button onClick={() => (window.location.href = '/kpis/new')}>
          KPI Builder
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search KPI or scope...'
      />

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KPI Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Current Value</TableHead>
              <TableHead>Baseline Value</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead>Health Status</TableHead>
              <TableHead className='w-[80px]'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statusRows.map((row) => {
              const kpi = (query.data ?? []).find((k) => k.id === row.kpiId)
              return (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.kpiName}</TableCell>
                  <TableCell>{row.scope}</TableCell>
                  <TableCell>{row.currentValue}</TableCell>
                  <TableCell>{row.baselineValue}</TableCell>
                  <TableCell>{row.delta}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.healthStatus === 'Normal'
                          ? 'default'
                          : row.healthStatus === 'Warning'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {row.healthStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.scope === 'Network' && kpi ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size='icon' variant='ghost'>
                            <MoreHorizontal className='size-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() =>
                              (window.location.href = `/kpis/${kpi.id}`)
                            }
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='text-destructive'
                            onClick={() => setDeleteTarget(kpi)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
            {statusRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  No KPI data yet. Create one from KPI Builder.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
            <Button variant='destructive' onClick={deleteItem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
