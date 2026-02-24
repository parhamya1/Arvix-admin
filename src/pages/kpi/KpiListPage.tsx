import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
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
type RuleOperator = '>=' | '<=' | '>' | '<' | 'between'

type KpiRow = {
  id: string
  name: string
  vendor: string
  technology: string
  level: string
  thresholdText: string
  status: 'Normal' | 'Warning' | 'Critical'
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

function matchesRule(
  value: number,
  rule?: { operator?: string; min?: string; max?: string; value?: string }
): boolean {
  if (!rule || !rule.operator) return false
  const operator = rule.operator as RuleOperator
  const ruleValue = Number(rule.value)
  const min = Number(rule.min)
  const max = Number(rule.max)

  if (operator === 'between') {
    if (Number.isNaN(min) || Number.isNaN(max)) return false
    return value >= min && value <= max
  }

  if (Number.isNaN(ruleValue)) return false
  if (operator === '>=') return value >= ruleValue
  if (operator === '<=') return value <= ruleValue
  if (operator === '>') return value > ruleValue
  return value < ruleValue
}

function evaluateStatus(currentValue: number, payload: Record<string, unknown>): {
  status: 'Normal' | 'Warning' | 'Critical'
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

  if (thresholdsV2.mode === 'range') {
    const warningRule = thresholdsV2.range?.warning
    const criticalRule = thresholdsV2.range?.critical
    const successMin = Number(thresholdsV2.range?.success?.min)
    const successMax = Number(thresholdsV2.range?.success?.max)

    let status: 'Normal' | 'Warning' | 'Critical' = 'Normal'
    if (matchesRule(currentValue, criticalRule)) status = 'Critical'
    else if (matchesRule(currentValue, warningRule)) status = 'Warning'
    else if (!Number.isNaN(successMin) && !Number.isNaN(successMax)) {
      status = currentValue >= successMin && currentValue <= successMax ? 'Normal' : 'Warning'
    }

    const warnLabel = warningRule?.operator === 'between'
      ? `${warningRule.min || '-'}..${warningRule.max || '-'}`
      : `${warningRule?.operator || ''}${warningRule?.value || '-'}`
    const critLabel = criticalRule?.operator === 'between'
      ? `${criticalRule.min || '-'}..${criticalRule.max || '-'}`
      : `${criticalRule?.operator || ''}${criticalRule?.value || '-'}`

    return {
      status,
      thresholdText: `OK ${thresholdsV2.range?.success?.min || '-'}–${thresholdsV2.range?.success?.max || '-'} | Warn ${warnLabel} | Crit ${critLabel}`,
    }
  }

  const direction = thresholdsV2.fixed?.direction || thresholds.direction || 'higher-better'
  const warning = Number(thresholdsV2.fixed?.warning || thresholds.warning || 80)
  const critical = Number(thresholdsV2.fixed?.critical || thresholds.critical || 60)

  let status: 'Normal' | 'Warning' | 'Critical' = 'Normal'
  if (direction === 'higher-better') {
    if (currentValue <= critical) status = 'Critical'
    else if (currentValue <= warning) status = 'Warning'
  } else {
    if (currentValue >= critical) status = 'Critical'
    else if (currentValue >= warning) status = 'Warning'
  }

  return {
    status,
    thresholdText: `Warn=${warning} | Crit=${critical}`,
  }
}

function statusStyles(status: KpiRow['status']) {
  if (status === 'Normal') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  }
  if (status === 'Warning') {
    return 'border-amber-300 bg-amber-50 text-amber-700'
  }
  return 'border-red-300 bg-red-50 text-red-700'
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
                  <TableHead>Health Status</TableHead>
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
                      <span
                        className={`inline-flex min-w-24 items-center justify-center rounded-full border px-3 py-1 text-sm font-medium ${statusStyles(row.status)}`}
                      >
                        {row.status}
                      </span>
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
