import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createKpi,
  deleteKpi,
  duplicateKpi,
  getKpi,
  updateKpi,
} from '@/lib/kpiApi'
import type {
  KpiAggregationLevel,
  KpiCategory,
  KpiDefinitionPayload,
  KpiFormulaType,
  KpiGranularity,
  KpiMappingTab,
  KpiTech,
  KpiUnit,
  KpiVendorScope,
} from '@/lib/kpiTypes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type RawCounterRow = {
  vendor: Exclude<KpiVendorScope, 'All'>
  tech: KpiTech
  moClass: string
  node: string
  site: string
  cell: string
  valueTime: string
  parameter: string
  value: number
}

type MappingTabKey = 'generic' | 'nokia' | 'ericsson'
type GroupBy = 'Cell' | 'Site'
type TimeWindow = 'last_1h' | 'last_6h' | 'last_24h'

const CATEGORY_OPTIONS: KpiCategory[] = [
  'Accessibility',
  'Retainability',
  'Mobility',
  'Traffic',
  'Availability',
  'Integrity',
]
const TECH_OPTIONS: KpiTech[] = ['2G', '3G', '4G', '5G']
const UNIT_OPTIONS: KpiUnit[] = ['%', 'count', 'bytes', 'Mbps', 'Erlang']
const GRANULARITY_OPTIONS: KpiGranularity[] = [
  '5min',
  '15min',
  'hourly',
  'daily',
]
const AGG_OPTIONS: KpiAggregationLevel[] = ['Cell', 'Site', 'Node']

const MOCK_ROWS: RawCounterRow[] = [
  {
    vendor: 'Nokia',
    tech: '2G',
    moClass: 'BSC',
    node: 'N1',
    site: 'S1',
    cell: 'S1C1',
    valueTime: '2026-02-24T00:00:00Z',
    parameter: 'cssr_attempt',
    value: 100,
  },
  {
    vendor: 'Nokia',
    tech: '2G',
    moClass: 'BSC',
    node: 'N1',
    site: 'S1',
    cell: 'S1C1',
    valueTime: '2026-02-24T00:00:00Z',
    parameter: 'cssr_success',
    value: 98,
  },
  {
    vendor: 'Nokia',
    tech: '3G',
    moClass: 'RNC',
    node: 'N1',
    site: 'S1',
    cell: 'S1C2',
    valueTime: '2026-02-24T00:15:00Z',
    parameter: 'cssr_attempt',
    value: 80,
  },
  {
    vendor: 'Nokia',
    tech: '3G',
    moClass: 'RNC',
    node: 'N1',
    site: 'S1',
    cell: 'S1C2',
    valueTime: '2026-02-24T00:15:00Z',
    parameter: 'cssr_success',
    value: 77,
  },
  {
    vendor: 'Ericsson',
    tech: '4G',
    moClass: 'ENodeB',
    node: 'E1',
    site: 'S2',
    cell: 'S2C1',
    valueTime: '2026-02-24T00:30:00Z',
    parameter: 'cssr_attempt',
    value: 75,
  },
  {
    vendor: 'Ericsson',
    tech: '4G',
    moClass: 'ENodeB',
    node: 'E1',
    site: 'S2',
    cell: 'S2C1',
    valueTime: '2026-02-24T00:30:00Z',
    parameter: 'cssr_success',
    value: 0,
  },
  {
    vendor: 'Ericsson',
    tech: '4G',
    moClass: 'ENodeB',
    node: 'E1',
    site: 'S2',
    cell: 'S2C2',
    valueTime: '2026-02-24T00:45:00Z',
    parameter: 'cssr_attempt',
    value: 0,
  },
  {
    vendor: 'Ericsson',
    tech: '4G',
    moClass: 'ENodeB',
    node: 'E1',
    site: 'S2',
    cell: 'S2C2',
    valueTime: '2026-02-24T00:45:00Z',
    parameter: 'cssr_success',
    value: 0,
  },
]

const emptyMapping = () => ({
  numeratorCounter: 'cssr_success',
  denominatorCounter: 'cssr_attempt',
  additionalCounters: [] as Array<{ name: string; role: string }>,
})

const safeDivide = (n: number, d: number) => (d === 0 ? 0 : n / d)

export default function KpiBuilderPage({ kpiId }: { kpiId?: string }) {
  const [name, setName] = useState('CSSR')
  const [category, setCategory] = useState<KpiCategory>('Accessibility')
  const [unit, setUnit] = useState<KpiUnit>('%')
  const [tech, setTech] = useState<KpiTech[]>(['2G', '3G', '4G'])
  const [vendorScope, setVendorScope] = useState<KpiVendorScope>('All')
  const [moClasses, setMoClasses] = useState<string[]>(['BSC', 'RNC', 'ENodeB'])
  const [moInput, setMoInput] = useState('')
  const [granularity, setGranularity] = useState<KpiGranularity>('15min')
  const [aggLevel, setAggLevel] = useState<KpiAggregationLevel>('Cell')
  const [description, setDescription] = useState('')
  const [formulaType, setFormulaType] = useState<KpiFormulaType>('ratio')
  const [greenGte, setGreenGte] = useState(98)
  const [yellowGte, setYellowGte] = useState(95)
  const [groupBy, setGroupBy] = useState<GroupBy>('Cell')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('last_24h')
  const [mappingTab, setMappingTab] = useState<MappingTabKey>('generic')
  const [mappings, setMappings] = useState<{
    generic: KpiMappingTab
    nokia: KpiMappingTab
    ericsson: KpiMappingTab
  }>({
    generic: emptyMapping(),
    nokia: emptyMapping(),
    ericsson: emptyMapping(),
  })
  const [version, setVersion] = useState(1)
  const [updatedAt, setUpdatedAt] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useQuery({
    queryKey: ['kpi', kpiId ?? 'new'],
    enabled: Boolean(kpiId),
    queryFn: async () => {
      const data = await getKpi(kpiId as string)
      setName(data.name)
      setCategory(data.category)
      setUnit(data.unit)
      setTech(data.tech)
      setVendorScope(data.vendorScope)
      setMoClasses(data.moClasses)
      setGranularity(data.granularity)
      setAggLevel(data.aggLevel)
      setDescription(data.description)
      setMappings(data.mappings)
      setFormulaType(data.formula.type)
      setGreenGte(data.thresholds.greenGte)
      setYellowGte(data.thresholds.yellowGte)
      setVersion(data.version)
      setUpdatedAt(data.updatedAt)
      return data
    },
  })

  const payload: KpiDefinitionPayload = {
    name,
    category,
    unit,
    tech,
    vendorScope,
    moClasses,
    granularity,
    aggLevel,
    description,
    mappings,
    formula: { type: formulaType },
    thresholds: { mode: 'static', greenGte, yellowGte },
  }

  const formulaText = useMemo(() => {
    const map =
      vendorScope === 'Nokia'
        ? mappings.nokia
        : vendorScope === 'Ericsson'
          ? mappings.ericsson
          : mappings.generic
    if (formulaType === 'ratio')
      return `safeDivide(SUM(${map.numeratorCounter}), SUM(${map.denominatorCounter || 'den'})) * ${unit === '%' ? 100 : 1}`
    if (formulaType === 'sum') return `SUM(${map.numeratorCounter})`
    return `SUM(${map.numeratorCounter}) - SUM(${map.denominatorCounter || 'counterB'})`
  }, [formulaType, mappings, unit, vendorScope])

  const preview = useMemo(() => {
    const cutoff =
      Date.parse('2026-02-24T01:00:00Z') -
      (timeWindow === 'last_1h'
        ? 3600_000
        : timeWindow === 'last_6h'
          ? 21_600_000
          : 86_400_000)
    const map =
      vendorScope === 'Nokia'
        ? mappings.nokia
        : vendorScope === 'Ericsson'
          ? mappings.ericsson
          : mappings.generic
    const filtered = MOCK_ROWS.filter(
      (r) =>
        (vendorScope === 'All' || r.vendor === vendorScope) &&
        tech.includes(r.tech) &&
        (moClasses.length === 0 || moClasses.includes(r.moClass)) &&
        Date.parse(r.valueTime) >= cutoff
    )
    const grouped = new Map<string, RawCounterRow[]>()
    for (const row of filtered) {
      const key = groupBy === 'Cell' ? row.cell : row.site
      grouped.set(key, [...(grouped.get(key) ?? []), row])
    }
    let denomZero = 0
    let missing = 0
    const rows = [...grouped.entries()].map(([objectName, list]) => {
      const numeratorSum = list
        .filter((r) => r.parameter === map.numeratorCounter)
        .reduce((a, b) => a + b.value, 0)
      const denominatorSum = list
        .filter((r) => r.parameter === map.denominatorCounter)
        .reduce((a, b) => a + b.value, 0)
      if (!list.some((r) => r.parameter === map.numeratorCounter)) missing += 1
      if (
        (formulaType === 'ratio' || formulaType === 'difference') &&
        !list.some((r) => r.parameter === map.denominatorCounter)
      )
        missing += 1
      let kpiValue = 0
      if (formulaType === 'ratio') {
        if (denominatorSum === 0) denomZero += 1
        kpiValue =
          safeDivide(numeratorSum, denominatorSum) * (unit === '%' ? 100 : 1)
      } else if (formulaType === 'sum') kpiValue = numeratorSum
      else kpiValue = numeratorSum - denominatorSum
      const status: 'Green' | 'Yellow' | 'Red' =
        kpiValue >= greenGte
          ? 'Green'
          : kpiValue >= yellowGte
            ? 'Yellow'
            : 'Red'
      return { objectName, numeratorSum, denominatorSum, kpiValue, status }
    })
    const values = rows.map((r) => r.kpiValue)
    const avg = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0
    return {
      rows,
      avg,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
      denomZero,
      missing,
    }
  }, [
    formulaType,
    greenGte,
    groupBy,
    mappings,
    moClasses,
    tech,
    timeWindow,
    unit,
    vendorScope,
    yellowGte,
  ])

  const save = async () => {
    setSaving(true)
    try {
      if (kpiId) {
        await updateKpi(kpiId, { ...payload, preview })
        toast.success('KPI updated')
        setVersion((prev) => prev + 1)
      } else {
        await createKpi({ ...payload, preview })
        toast.success('KPI created')
        window.location.href = '/kpis'
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-4 p-4 md:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <h1 className='text-2xl font-semibold tracking-tight'>KPI Builder</h1>
          <Badge variant='secondary'>v{version}</Badge>
          {updatedAt && (
            <span className='text-xs text-muted-foreground'>
              updated {new Date(updatedAt).toLocaleString()}
            </span>
          )}
        </div>
        <div className='flex gap-2'>
          {kpiId && (
            <Button
              variant='outline'
              onClick={async () => {
                const dup = await duplicateKpi(kpiId)
                toast.success('Duplicated')
                window.location.href = `/kpis/${dup.id}`
              }}
            >
              Duplicate
            </Button>
          )}
          {kpiId && (
            <Button
              variant='destructive'
              onClick={async () => {
                await deleteKpi(kpiId)
                toast.success('Deleted')
                window.location.href = '/kpis'
              }}
            >
              Delete
            </Button>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save KPI'}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-5'>
        <div className='space-y-4 xl:col-span-3'>
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v: KpiCategory) => setCategory(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2 md:col-span-2'>
                <Label>Technology</Label>
                <div className='flex flex-wrap gap-2'>
                  {TECH_OPTIONS.map((t) => (
                    <Button
                      key={t}
                      type='button'
                      variant={tech.includes(t) ? 'default' : 'outline'}
                      size='sm'
                      onClick={() =>
                        setTech((prev) =>
                          prev.includes(t)
                            ? prev.filter((x) => x !== t)
                            : [...prev, t]
                        )
                      }
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
              <div className='space-y-2'>
                <Label>Vendor</Label>
                <Select
                  value={vendorScope}
                  onValueChange={(v: KpiVendorScope) => setVendorScope(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='All'>All</SelectItem>
                    <SelectItem value='Nokia'>Nokia</SelectItem>
                    <SelectItem value='Ericsson'>Ericsson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Unit</Label>
                <Select value={unit} onValueChange={(v: KpiUnit) => setUnit(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Granularity</Label>
                <Select
                  value={granularity}
                  onValueChange={(v: KpiGranularity) => setGranularity(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRANULARITY_OPTIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Aggregation</Label>
                <Select
                  value={aggLevel}
                  onValueChange={(v: KpiAggregationLevel) => setAggLevel(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGG_OPTIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2 md:col-span-2'>
                <Label>MO Class</Label>
                <div className='flex gap-2'>
                  <Input
                    value={moInput}
                    onChange={(e) => setMoInput(e.target.value)}
                  />
                  <Button
                    variant='outline'
                    onClick={() => {
                      const c = moInput.trim()
                      if (!c) return
                      setMoClasses((prev) =>
                        prev.includes(c) ? prev : [...prev, c]
                      )
                      setMoInput('')
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {moClasses.map((m) => (
                    <Badge
                      key={m}
                      className='cursor-pointer'
                      onClick={() =>
                        setMoClasses((prev) => prev.filter((x) => x !== m))
                      }
                    >
                      {m} ×
                    </Badge>
                  ))}
                </div>
              </div>
              <div className='space-y-2 md:col-span-2'>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Counter Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={mappingTab}
                onValueChange={(v) => setMappingTab(v as MappingTabKey)}
              >
                <TabsList className='grid w-full grid-cols-3'>
                  <TabsTrigger value='generic'>Generic</TabsTrigger>
                  <TabsTrigger value='nokia'>Nokia</TabsTrigger>
                  <TabsTrigger value='ericsson'>Ericsson</TabsTrigger>
                </TabsList>
                {(['generic', 'nokia', 'ericsson'] as MappingTabKey[]).map(
                  (tab) => (
                    <TabsContent
                      key={tab}
                      value={tab}
                      className='space-y-3 pt-3'
                    >
                      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        <div className='space-y-2'>
                          <Label>Numerator</Label>
                          <Input
                            value={mappings[tab].numeratorCounter}
                            onChange={(e) =>
                              setMappings((prev) => ({
                                ...prev,
                                [tab]: {
                                  ...prev[tab],
                                  numeratorCounter: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label>Denominator</Label>
                          <Input
                            value={mappings[tab].denominatorCounter ?? ''}
                            onChange={(e) =>
                              setMappings((prev) => ({
                                ...prev,
                                [tab]: {
                                  ...prev[tab],
                                  denominatorCounter: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </TabsContent>
                  )
                )}
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formula / Thresholds</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex flex-wrap gap-2'>
                {(['ratio', 'sum', 'difference'] as KpiFormulaType[]).map(
                  (t) => (
                    <Button
                      key={t}
                      variant={formulaType === t ? 'default' : 'outline'}
                      onClick={() => setFormulaType(t)}
                    >
                      {t}
                    </Button>
                  )
                )}
              </div>
              <div className='rounded-md border bg-muted/40 p-2 font-mono text-xs'>
                {formulaText}
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-2'>
                  <Label>Green {'>='}</Label>
                  <Input
                    type='number'
                    value={greenGte}
                    onChange={(e) => setGreenGte(Number(e.target.value || 0))}
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Yellow {'>='}</Label>
                  <Input
                    type='number'
                    value={yellowGte}
                    onChange={(e) => setYellowGte(Number(e.target.value || 0))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview Controls</CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Time window</Label>
                <Select
                  value={timeWindow}
                  onValueChange={(v: TimeWindow) => setTimeWindow(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='last_1h'>last 1h</SelectItem>
                    <SelectItem value='last_6h'>last 6h</SelectItem>
                    <SelectItem value='last_24h'>last 24h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Group by</Label>
                <div className='flex gap-2'>
                  <Button
                    variant={groupBy === 'Cell' ? 'default' : 'outline'}
                    onClick={() => setGroupBy('Cell')}
                  >
                    Cell
                  </Button>
                  <Button
                    variant={groupBy === 'Site' ? 'default' : 'outline'}
                    onClick={() => setGroupBy('Site')}
                  >
                    Site
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='space-y-4 xl:col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='grid grid-cols-2 gap-2'>
                <Stat title='Avg' value={preview.avg} />
                <Stat title='Min' value={preview.min} />
                <Stat title='Max' value={preview.max} />
                <Stat title='Objects' value={preview.rows.length} raw />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ObjectName</TableHead>
                    <TableHead>NumeratorSum</TableHead>
                    <TableHead>DenominatorSum</TableHead>
                    <TableHead>KPIValue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((r) => (
                    <TableRow key={r.objectName}>
                      <TableCell>{r.objectName}</TableCell>
                      <TableCell>{r.numeratorSum.toFixed(2)}</TableCell>
                      <TableCell>{r.denominatorSum.toFixed(2)}</TableCell>
                      <TableCell>{r.kpiValue.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === 'Green'
                              ? 'default'
                              : r.status === 'Yellow'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warnings</CardTitle>
            </CardHeader>
            <CardContent className='space-y-1 text-sm'>
              <div>
                Denominator=0 count: <strong>{preview.denomZero}</strong>
              </div>
              <div>
                Missing counter rows count: <strong>{preview.missing}</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Stat({
  title,
  value,
  raw = false,
}: {
  title: string
  value: number
  raw?: boolean
}) {
  return (
    <div className='rounded-md border bg-muted/40 p-2'>
      <div className='text-xs text-muted-foreground'>{title}</div>
      <div className='text-lg font-semibold'>
        {raw ? Math.round(value) : value.toFixed(2)}
      </div>
    </div>
  )
}
