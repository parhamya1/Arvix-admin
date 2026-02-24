import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MoreHorizontal, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteKpi, getKpi, listKpis } from '@/lib/kpiApi'

type ThresholdMode = 'range' | 'fixed'

type KpiRow = {
  id: string
  name: string
  vendor: string
  technology: string
  level: string
  thresholdText: string
  status: 'Success' | 'Warning' | 'Critical'
  currentValue: number
  updatedAt: string
}

function hashValue(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function deterministicCurrentValue(id: string): number {
  const value = hashValue(id) % 1000
  return Number((value / 10).toFixed(1))
}

function evaluateStatus(currentValue: number, payload: Record<string, unknown>): {
  status: 'Success' | 'Warning' | 'Critical'
  thresholdText: string
} {
  const thresholds = (payload.thresholds || {}) as {
    warning?: string
    critical?: string
    direction?: 'higher-better' | 'lower-better'
  }
  const thresholdsV2 = (payload.thresholdsV2 || {}) as {
    mode?: ThresholdMode
    range?: {
      success?: { min?: string; max?: string }
      warning?: { operator?: string; min?: string; max?: string; value?: string }
      critical?: { operator?: string; min?: string; max?: string; value?: string }
    }
    fixed?: { direction?: 'higher-better' | 'lower-better'; warning?: string; critical?: string }
  }

  if (thresholdsV2.mode === 'fixed') {
    const direction = thresholdsV2.fixed?.direction || 'higher-better'
    const warning = Number(thresholdsV2.fixed?.warning || 0)
    const critical = Number(thresholdsV2.fixed?.critical || 0)

    let status: 'Success' | 'Warning' | 'Critical' = 'Success'
    if (direction === 'higher-better') {
      if (currentValue <= critical) status = 'Critical'
      else if (currentValue <= warning) status = 'Warning'
    } else {
      if (currentValue >= critical) status = 'Critical'
      else if (currentValue >= warning) status = 'Warning'
    }

    return {
      status,
      thresholdText: `Warn=${warning} Crit=${critical}`,
    }
  }

  const warning = Number(thresholds.warning || thresholdsV2.range?.warning?.value || thresholdsV2.range?.warning?.max || 80)
  const critical = Number(thresholds.critical || thresholdsV2.range?.critical?.value || thresholdsV2.range?.critical?.max || 60)
  const higherBetter = (thresholds.direction || thresholdsV2.fixed?.direction || 'higher-better') === 'higher-better'

  let status: 'Success' | 'Warning' | 'Critical' = 'Success'
  if (higherBetter) {
    if (currentValue < critical) status = 'Critical'
    else if (currentValue < warning) status = 'Warning'
  } else {
    if (currentValue > critical) status = 'Critical'
    else if (currentValue > warning) status = 'Warning'
  }

  const successMin = thresholdsV2.range?.success?.min || 'N/A'
  const successMax = thresholdsV2.range?.success?.max || 'N/A'

  return {
    status,
    thresholdText: `OK ${successMin}–${successMax} | Warn ${warning} | Crit ${critical}`,
  }
}

export function KpiListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<KpiRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const list = await listKpis()
      const detailed = await Promise.all(
        list.map(async (kpi) => {
          const detail = await getKpi(kpi.id)
          const payload = detail.payload as Record<string, unknown>

          const metadata = (payload.metadata || {}) as {
            vendor?: string
            technologies?: string[]
            tech?: string
            level?: string
            scope?: string
          }

          const currentValue = deterministicCurrentValue(kpi.id)
          const { status, thresholdText } = evaluateStatus(currentValue, payload)

          return {
            id: kpi.id,
            name: kpi.name,
            vendor: metadata.vendor || '-',
            technology:
              (Array.isArray(metadata.technologies) ? metadata.technologies.join(', ') : metadata.tech) || '-',
            level: metadata.level || metadata.scope || '-',
            thresholdText,
            status,
            currentValue,
            updatedAt: kpi.updatedAt,
          } as KpiRow
        })
      )
      setRows(detailed)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load KPIs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const statusVariant = (status: KpiRow['status']) => {
    if (status === 'Success') return 'default'
    if (status === 'Warning') return 'secondary'
    return 'destructive'
  }

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [rows]
  )

  return (
    <div className='space-y-4 p-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle>KPI List</CardTitle>
            <CardDescription>KPIs loaded from database.</CardDescription>
          </div>
          <Button onClick={() => void navigate({ to: '/kpi/builder' })}>
            <Plus className='mr-2 size-4' /> New KPI
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='text-sm text-muted-foreground'>Loading KPIs...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI Name</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Technology</TableHead>
                  <TableHead>Level/Scope</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.name}</TableCell>
                    <TableCell>{row.vendor}</TableCell>
                    <TableCell>{row.technology}</TableCell>
                    <TableCell>{row.level}</TableCell>
                    <TableCell>{row.currentValue}</TableCell>
                    <TableCell>{row.thresholdText}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon'>
                              <MoreHorizontal className='size-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onClick={() => void navigate({ to: '/kpi/builder/$id', params: { id: row.id } })}
                            >
                              <Pencil className='mr-2 size-4' /> Edit
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className='text-destructive focus:text-destructive'>
                                <Trash2 className='mr-2 size-4' /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete KPI?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await deleteKpi(row.id)
                                await load()
                                toast.success('Deleted')
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
