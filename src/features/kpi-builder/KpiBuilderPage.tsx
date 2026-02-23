import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type Technology = '2G' | '3G' | '4G' | '5G'
type Vendor = 'All' | 'Nokia' | 'Ericsson'
type Category =
  | 'Accessibility'
  | 'Retainability'
  | 'Mobility'
  | 'Traffic'
  | 'Availability'
  | 'Integrity'
type Granularity = '5min' | '15min' | 'hourly' | 'daily'
type AggregationLevel = 'Cell' | 'Site' | 'Node'
type Unit = '%' | 'count' | 'bytes' | 'Mbps' | 'Erlang'
type KpiType = 'Ratio' | 'Sum' | 'Difference'
type MappingTab = 'generic' | 'nokia' | 'ericsson'
type GroupBy = 'Cell' | 'Site'
type TimeWindow = 'last_1h' | 'last_6h' | 'last_24h'
type Status = 'Green' | 'Yellow' | 'Red'

type CounterRole = 'Numerator' | 'Denominator' | 'Auxiliary'

type CounterMapping = {
  numerator: string
  denominator: string
  additional: Array<{ name: string; role: CounterRole }>
}

type RawCounterRow = {
  vendor: Exclude<Vendor, 'All'>
  tech: Technology
  moClass: string
  node: string
  site: string
  cell: string
  valueTime: string
  parameter: string
  value: number
}

type PreviewRow = {
  objectName: string
  numeratorSum: number
  denominatorSum: number
  kpiValue: number
  status: Status
}

type KpiDefinition = {
  name: string
  version: string
  category: Category
  technologies: Technology[]
  vendor: Vendor
  moClasses: string[]
  granularity: Granularity
  aggregationLevel: AggregationLevel
  unit: Unit
  description: string
  kpiType: KpiType
  mapping: {
    generic: CounterMapping
    nokia: CounterMapping
    ericsson: CounterMapping
  }
  thresholds: {
    greenGte: number
    yellowGte: number
  }
  preview: {
    timeWindow: TimeWindow
    groupBy: GroupBy
  }
  formula: string
}

const TECH_OPTIONS: Technology[] = ['2G', '3G', '4G', '5G']
const CATEGORY_OPTIONS: Category[] = [
  'Accessibility',
  'Retainability',
  'Mobility',
  'Traffic',
  'Availability',
  'Integrity',
]
const GRANULARITY_OPTIONS: Granularity[] = ['5min', '15min', 'hourly', 'daily']
const AGGREGATION_OPTIONS: AggregationLevel[] = ['Cell', 'Site', 'Node']
const UNIT_OPTIONS: Unit[] = ['%', 'count', 'bytes', 'Mbps', 'Erlang']

const MOCK_ROWS: RawCounterRow[] = [
  { vendor: 'Nokia', tech: '2G', moClass: 'BSC', node: 'NOK-NODE-1', site: 'NOK-S1', cell: 'NOK-S1-C1', valueTime: '2026-02-24T00:00:00Z', parameter: 'cssr_attempt', value: 100 },
  { vendor: 'Nokia', tech: '2G', moClass: 'BSC', node: 'NOK-NODE-1', site: 'NOK-S1', cell: 'NOK-S1-C1', valueTime: '2026-02-24T00:00:00Z', parameter: 'cssr_success', value: 98 },
  { vendor: 'Nokia', tech: '2G', moClass: 'BSC', node: 'NOK-NODE-1', site: 'NOK-S1', cell: 'NOK-S1-C2', valueTime: '2026-02-24T00:00:00Z', parameter: 'cssr_attempt', value: 80 },
  { vendor: 'Nokia', tech: '2G', moClass: 'BSC', node: 'NOK-NODE-1', site: 'NOK-S1', cell: 'NOK-S1-C2', valueTime: '2026-02-24T00:00:00Z', parameter: 'cssr_success', value: 75 },

  { vendor: 'Nokia', tech: '3G', moClass: 'RNC', node: 'NOK-NODE-1', site: 'NOK-S1', cell: 'NOK-S1-C1', valueTime: '2026-02-24T00:15:00Z', parameter: 'cssr_attempt', value: 120 },
  { vendor: 'Nokia', tech: '3G', moClass: 'RNC', node: 'NOK-NODE-1', site: 'NOK-S1', cell: 'NOK-S1-C1', valueTime: '2026-02-24T00:15:00Z', parameter: 'cssr_success', value: 118 },
  { vendor: 'Nokia', tech: '3G', moClass: 'RNC', node: 'NOK-NODE-1', site: 'NOK-S1', cell: 'NOK-S1-C2', valueTime: '2026-02-24T00:15:00Z', parameter: 'cssr_attempt', value: 90 },
  { vendor: 'Nokia', tech: '3G', moClass: 'RNC', node: 'NOK-NODE-1', site: 'NOK-S1', cell: 'NOK-S1-C2', valueTime: '2026-02-24T00:15:00Z', parameter: 'cssr_success', value: 87 },

  { vendor: 'Nokia', tech: '4G', moClass: 'ENodeB', node: 'NOK-NODE-2', site: 'NOK-S2', cell: 'NOK-S2-C1', valueTime: '2026-02-24T00:30:00Z', parameter: 'cssr_attempt', value: 110 },
  { vendor: 'Nokia', tech: '4G', moClass: 'ENodeB', node: 'NOK-NODE-2', site: 'NOK-S2', cell: 'NOK-S2-C1', valueTime: '2026-02-24T00:30:00Z', parameter: 'cssr_success', value: 108 },
  { vendor: 'Nokia', tech: '4G', moClass: 'ENodeB', node: 'NOK-NODE-2', site: 'NOK-S2', cell: 'NOK-S2-C2', valueTime: '2026-02-24T00:30:00Z', parameter: 'cssr_attempt', value: 95 },
  { vendor: 'Nokia', tech: '4G', moClass: 'ENodeB', node: 'NOK-NODE-2', site: 'NOK-S2', cell: 'NOK-S2-C2', valueTime: '2026-02-24T00:30:00Z', parameter: 'cssr_success', value: 0 },

  { vendor: 'Ericsson', tech: '2G', moClass: 'BSC', node: 'ERI-NODE-1', site: 'ERI-S1', cell: 'ERI-S1-C1', valueTime: '2026-02-24T00:45:00Z', parameter: 'cssr_attempt', value: 85 },
  { vendor: 'Ericsson', tech: '2G', moClass: 'BSC', node: 'ERI-NODE-1', site: 'ERI-S1', cell: 'ERI-S1-C1', valueTime: '2026-02-24T00:45:00Z', parameter: 'cssr_success', value: 81 },
  { vendor: 'Ericsson', tech: '2G', moClass: 'BSC', node: 'ERI-NODE-1', site: 'ERI-S1', cell: 'ERI-S1-C2', valueTime: '2026-02-24T00:45:00Z', parameter: 'cssr_attempt', value: 70 },
  { vendor: 'Ericsson', tech: '2G', moClass: 'BSC', node: 'ERI-NODE-1', site: 'ERI-S1', cell: 'ERI-S1-C2', valueTime: '2026-02-24T00:45:00Z', parameter: 'cssr_success', value: 66 },

  { vendor: 'Ericsson', tech: '3G', moClass: 'RNC', node: 'ERI-NODE-1', site: 'ERI-S2', cell: 'ERI-S2-C1', valueTime: '2026-02-24T00:30:00Z', parameter: 'cssr_attempt', value: 105 },
  { vendor: 'Ericsson', tech: '3G', moClass: 'RNC', node: 'ERI-NODE-1', site: 'ERI-S2', cell: 'ERI-S2-C1', valueTime: '2026-02-24T00:30:00Z', parameter: 'cssr_success', value: 102 },
  { vendor: 'Ericsson', tech: '3G', moClass: 'RNC', node: 'ERI-NODE-1', site: 'ERI-S2', cell: 'ERI-S2-C2', valueTime: '2026-02-24T00:30:00Z', parameter: 'cssr_attempt', value: 75 },
  { vendor: 'Ericsson', tech: '3G', moClass: 'RNC', node: 'ERI-NODE-1', site: 'ERI-S2', cell: 'ERI-S2-C2', valueTime: '2026-02-24T00:30:00Z', parameter: 'cssr_success', value: 0 },

  { vendor: 'Ericsson', tech: '4G', moClass: 'ENodeB', node: 'ERI-NODE-2', site: 'ERI-S3', cell: 'ERI-S3-C1', valueTime: '2026-02-24T00:15:00Z', parameter: 'cssr_attempt', value: 130 },
  { vendor: 'Ericsson', tech: '4G', moClass: 'ENodeB', node: 'ERI-NODE-2', site: 'ERI-S3', cell: 'ERI-S3-C1', valueTime: '2026-02-24T00:15:00Z', parameter: 'cssr_success', value: 127 },
  { vendor: 'Ericsson', tech: '4G', moClass: 'ENodeB', node: 'ERI-NODE-2', site: 'ERI-S3', cell: 'ERI-S3-C2', valueTime: '2026-02-24T00:15:00Z', parameter: 'cssr_attempt', value: 0 },
  { vendor: 'Ericsson', tech: '4G', moClass: 'ENodeB', node: 'ERI-NODE-2', site: 'ERI-S3', cell: 'ERI-S3-C2', valueTime: '2026-02-24T00:15:00Z', parameter: 'cssr_success', value: 0 },
]

const defaultMapping = (): CounterMapping => ({
  numerator: 'cssr_success',
  denominator: 'cssr_attempt',
  additional: [],
})

const safeDivide = (numerator: number, denominator: number) => {
  if (denominator === 0) return 0
  return numerator / denominator
}

const getCutoffMs = (window: TimeWindow) => {
  const now = Date.parse('2026-02-24T01:00:00Z')
  if (window === 'last_1h') return now - 60 * 60 * 1000
  if (window === 'last_6h') return now - 6 * 60 * 60 * 1000
  return now - 24 * 60 * 60 * 1000
}

const statusFromThresholds = (value: number, greenGte: number, yellowGte: number): Status => {
  if (value >= greenGte) return 'Green'
  if (value >= yellowGte) return 'Yellow'
  return 'Red'
}

export default function KpiBuilderPage() {
  const [kpiName, setKpiName] = useState('CSSR')
  const [category, setCategory] = useState<Category>('Accessibility')
  const [selectedTechs, setSelectedTechs] = useState<Technology[]>(['2G', '3G', '4G'])
  const [vendor, setVendor] = useState<Vendor>('All')
  const [moClasses, setMoClasses] = useState<string[]>(['BSC', 'RNC', 'ENodeB'])
  const [newMoClass, setNewMoClass] = useState('')
  const [granularity, setGranularity] = useState<Granularity>('15min')
  const [aggregationLevel, setAggregationLevel] = useState<AggregationLevel>('Cell')
  const [unit, setUnit] = useState<Unit>('%')
  const [description, setDescription] = useState('Call setup success KPI from PM counters.')

  const [activeMappingTab, setActiveMappingTab] = useState<MappingTab>('generic')
  const [mapping, setMapping] = useState<Record<MappingTab, CounterMapping>>({
    generic: defaultMapping(),
    nokia: defaultMapping(),
    ericsson: defaultMapping(),
  })

  const [kpiType, setKpiType] = useState<KpiType>('Ratio')
  const [greenGte, setGreenGte] = useState(98)
  const [yellowGte, setYellowGte] = useState(95)
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('last_24h')
  const [groupBy, setGroupBy] = useState<GroupBy>('Cell')
  const [previewTick, setPreviewTick] = useState(0)
  const [savedDefinition, setSavedDefinition] = useState<KpiDefinition | null>(null)

  const activeMapping = mapping[activeMappingTab]

  const warnings = useMemo(() => {
    const list: string[] = []

    for (const [tab, map] of Object.entries(mapping) as Array<[MappingTab, CounterMapping]>) {
      if (!map.numerator.trim()) list.push(`${tab.toUpperCase()}: Numerator counter is required.`)
      if (kpiType === 'Ratio' && !map.denominator.trim()) {
        list.push(`${tab.toUpperCase()}: Denominator counter is required for Ratio KPIs.`)
      }
      if (kpiType === 'Difference' && !map.denominator.trim()) {
        list.push(`${tab.toUpperCase()}: Counter B (denominator field) is required for Difference KPIs.`)
      }
    }

    if (!kpiName.trim()) list.push('KPI Name is required.')
    if (selectedTechs.length === 0) list.push('Select at least one technology.')
    if (yellowGte > greenGte) list.push('Yellow threshold must be less than or equal to Green threshold.')

    return list
  }, [greenGte, kpiName, kpiType, mapping, selectedTechs.length, yellowGte])

  const currentCounterMapping = useMemo(() => {
    if (vendor === 'Nokia') return mapping.nokia
    if (vendor === 'Ericsson') return mapping.ericsson
    return mapping.generic
  }, [mapping, vendor])

  const previewData = useMemo(() => {
    void previewTick

    const cutoffMs = getCutoffMs(timeWindow)
    const filtered = MOCK_ROWS.filter((row) => {
      const rowTime = Date.parse(row.valueTime)
      const vendorOk = vendor === 'All' || row.vendor === vendor
      const techOk = selectedTechs.includes(row.tech)
      const moOk = moClasses.length === 0 || moClasses.includes(row.moClass)
      const timeOk = rowTime >= cutoffMs
      return vendorOk && techOk && moOk && timeOk
    })

    const rowsByObject = new Map<string, RawCounterRow[]>()
    for (const row of filtered) {
      const key = groupBy === 'Cell' ? row.cell : row.site
      const existing = rowsByObject.get(key)
      if (existing) existing.push(row)
      else rowsByObject.set(key, [row])
    }

    let denominatorZeroCount = 0
    let missingCounterRowsCount = 0

    const tableRows: PreviewRow[] = []

    for (const [objectName, objectRows] of rowsByObject.entries()) {
      const numeratorSum = objectRows
        .filter((row) => row.parameter === currentCounterMapping.numerator)
        .reduce((acc, row) => acc + row.value, 0)

      const denominatorSum = objectRows
        .filter((row) => row.parameter === currentCounterMapping.denominator)
        .reduce((acc, row) => acc + row.value, 0)

      if (!objectRows.some((row) => row.parameter === currentCounterMapping.numerator)) {
        missingCounterRowsCount += 1
      }
      if ((kpiType === 'Ratio' || kpiType === 'Difference') && !objectRows.some((row) => row.parameter === currentCounterMapping.denominator)) {
        missingCounterRowsCount += 1
      }

      let kpiValue = 0
      if (kpiType === 'Ratio') {
        if (denominatorSum === 0) denominatorZeroCount += 1
        const factor = unit === '%' ? 100 : 1
        kpiValue = safeDivide(numeratorSum, denominatorSum) * factor
      } else if (kpiType === 'Sum') {
        kpiValue = numeratorSum
      } else {
        kpiValue = numeratorSum - denominatorSum
      }

      tableRows.push({
        objectName,
        numeratorSum,
        denominatorSum,
        kpiValue,
        status: statusFromThresholds(kpiValue, greenGte, yellowGte),
      })
    }

    const values = tableRows.map((row) => row.kpiValue)
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const min = values.length > 0 ? Math.min(...values) : 0
    const max = values.length > 0 ? Math.max(...values) : 0

    const greenCount = tableRows.filter((row) => row.status === 'Green').length
    const yellowCount = tableRows.filter((row) => row.status === 'Yellow').length
    const redCount = tableRows.filter((row) => row.status === 'Red').length

    const total = tableRows.length || 1

    return {
      tableRows,
      summary: {
        avg,
        min,
        max,
        objectsCount: tableRows.length,
        greenPct: (greenCount / total) * 100,
        yellowPct: (yellowCount / total) * 100,
        redPct: (redCount / total) * 100,
      },
      denominatorZeroCount,
      missingCounterRowsCount,
    }
  }, [currentCounterMapping.denominator, currentCounterMapping.numerator, greenGte, groupBy, kpiType, moClasses, previewTick, selectedTechs, timeWindow, unit, vendor, yellowGte])

  const formulaText = useMemo(() => {
    if (kpiType === 'Ratio') {
      return `safeDivide(SUM(${currentCounterMapping.numerator}), SUM(${currentCounterMapping.denominator || 'denominator'})) * ${unit === '%' ? '100' : '1'}`
    }
    if (kpiType === 'Sum') return `SUM(${currentCounterMapping.numerator})`
    return `SUM(${currentCounterMapping.numerator}) - SUM(${currentCounterMapping.denominator || 'counterB'})`
  }, [currentCounterMapping.denominator, currentCounterMapping.numerator, kpiType, unit])

  const handleTechToggle = (tech: Technology) => {
    setSelectedTechs((prev) => (prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]))
  }

  const addMoClass = () => {
    const clean = newMoClass.trim()
    if (!clean || moClasses.includes(clean)) return
    setMoClasses((prev) => [...prev, clean])
    setNewMoClass('')
  }

  const removeMoClass = (value: string) => {
    setMoClasses((prev) => prev.filter((entry) => entry !== value))
  }

  const updateActiveMapping = (patch: Partial<CounterMapping>) => {
    setMapping((prev) => ({ ...prev, [activeMappingTab]: { ...prev[activeMappingTab], ...patch } }))
  }

  const addAdditionalCounter = () => {
    updateActiveMapping({
      additional: [...activeMapping.additional, { name: '', role: 'Auxiliary' }],
    })
  }

  const updateAdditionalCounter = (index: number, patch: Partial<{ name: string; role: CounterRole }>) => {
    const next = activeMapping.additional.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    updateActiveMapping({ additional: next })
  }

  const removeAdditionalCounter = (index: number) => {
    updateActiveMapping({ additional: activeMapping.additional.filter((_, i) => i !== index) })
  }

  const saveKpi = () => {
    const definition: KpiDefinition = {
      name: kpiName,
      version: 'v1.0.0',
      category,
      technologies: selectedTechs,
      vendor,
      moClasses,
      granularity,
      aggregationLevel,
      unit,
      description,
      kpiType,
      mapping: {
        generic: mapping.generic,
        nokia: mapping.nokia,
        ericsson: mapping.ericsson,
      },
      thresholds: {
        greenGte,
        yellowGte,
      },
      preview: {
        timeWindow,
        groupBy,
      },
      formula: formulaText,
    }
    setSavedDefinition(definition)
  }

  return (
    <div className='space-y-4 p-4 md:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <h1 className='text-2xl font-semibold tracking-tight'>KPI Builder</h1>
          <Badge variant='secondary'>v1.0.0</Badge>
        </div>
        <Button onClick={saveKpi}>Save KPI</Button>
      </div>

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-5'>
        <div className='space-y-4 xl:col-span-3'>
          <Card>
            <CardHeader>
              <CardTitle>KPI Metadata</CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>KPI Name</Label>
                <Input value={kpiName} onChange={(e) => setKpiName(e.target.value)} />
              </div>

              <div className='space-y-2'>
                <Label>Category</Label>
                <Select value={category} onValueChange={(value: Category) => setCategory(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2 md:col-span-2'>
                <Label>Technology</Label>
                <div className='flex flex-wrap gap-2'>
                  {TECH_OPTIONS.map((tech) => (
                    <Button key={tech} type='button' variant={selectedTechs.includes(tech) ? 'default' : 'outline'} size='sm' onClick={() => handleTechToggle(tech)}>
                      {tech}
                    </Button>
                  ))}
                </div>
              </div>

              <div className='space-y-2'>
                <Label>Vendor</Label>
                <Select value={vendor} onValueChange={(value: Vendor) => setVendor(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='All'>All</SelectItem>
                    <SelectItem value='Nokia'>Nokia</SelectItem>
                    <SelectItem value='Ericsson'>Ericsson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2 md:col-span-2'>
                <Label>MO Class</Label>
                <div className='flex gap-2'>
                  <Input value={newMoClass} onChange={(e) => setNewMoClass(e.target.value)} placeholder='Add MO class and press Add' onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addMoClass()
                    }
                  }} />
                  <Button type='button' variant='outline' onClick={addMoClass}>Add</Button>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {moClasses.map((entry) => (
                    <Badge key={entry} className='cursor-pointer' onClick={() => removeMoClass(entry)}>
                      {entry} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className='space-y-2'>
                <Label>Granularity</Label>
                <Select value={granularity} onValueChange={(value: Granularity) => setGranularity(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRANULARITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label>Aggregation Level</Label>
                <Select value={aggregationLevel} onValueChange={(value: AggregationLevel) => setAggregationLevel(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AGGREGATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label>Unit</Label>
                <Select value={unit} onValueChange={(value: Unit) => setUnit(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2 md:col-span-2'>
                <Label>Description</Label>
                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Counter Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeMappingTab} onValueChange={(value) => setActiveMappingTab(value as MappingTab)}>
                <TabsList className='grid w-full grid-cols-3'>
                  <TabsTrigger value='generic'>Generic</TabsTrigger>
                  <TabsTrigger value='nokia'>Nokia</TabsTrigger>
                  <TabsTrigger value='ericsson'>Ericsson</TabsTrigger>
                </TabsList>

                {(['generic', 'nokia', 'ericsson'] as MappingTab[]).map((tab) => (
                  <TabsContent key={tab} value={tab} className='space-y-3 pt-3'>
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label>Numerator counter</Label>
                        <Input value={mapping[tab].numerator} onChange={(e) => setMapping((prev) => ({ ...prev, [tab]: { ...prev[tab], numerator: e.target.value } }))} />
                      </div>
                      <div className='space-y-2'>
                        <Label>Denominator counter (optional)</Label>
                        <Input value={mapping[tab].denominator} onChange={(e) => setMapping((prev) => ({ ...prev, [tab]: { ...prev[tab], denominator: e.target.value } }))} />
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <Label>Additional counters</Label>
                        <Button variant='outline' size='sm' onClick={addAdditionalCounter}>Add counter</Button>
                      </div>
                      {tab === activeMappingTab && activeMapping.additional.map((entry, index) => (
                        <div key={`${tab}-${index}`} className='grid grid-cols-1 gap-2 md:grid-cols-3'>
                          <Input value={entry.name} onChange={(e) => updateAdditionalCounter(index, { name: e.target.value })} placeholder='counter name' />
                          <Select value={entry.role} onValueChange={(value: CounterRole) => updateAdditionalCounter(index, { role: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value='Auxiliary'>Auxiliary</SelectItem>
                              <SelectItem value='Numerator'>Numerator</SelectItem>
                              <SelectItem value='Denominator'>Denominator</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant='destructive' onClick={() => removeAdditionalCounter(index)}>Remove</Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formula</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex flex-wrap gap-2'>
                {(['Ratio', 'Sum', 'Difference'] as KpiType[]).map((type) => (
                  <Button key={type} variant={kpiType === type ? 'default' : 'outline'} onClick={() => setKpiType(type)}>
                    {type}
                  </Button>
                ))}
              </div>
              <div className='rounded-md border bg-muted/50 p-3 font-mono text-sm'>{formulaText}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Thresholds</CardTitle></CardHeader>
            <CardContent className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Green {'>='} X</Label>
                <Input type='number' value={greenGte} onChange={(e) => setGreenGte(Number(e.target.value || 0))} />
              </div>
              <div className='space-y-2'>
                <Label>Yellow between Y and X</Label>
                <Input type='number' value={yellowGte} onChange={(e) => setYellowGte(Number(e.target.value || 0))} />
              </div>
              <div className='md:col-span-2 text-sm text-muted-foreground'>Red {'<'} {yellowGte}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Preview Controls</CardTitle></CardHeader>
            <CardContent className='grid grid-cols-1 gap-3 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label>Time window</Label>
                <Select value={timeWindow} onValueChange={(value: TimeWindow) => setTimeWindow(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Button variant={groupBy === 'Cell' ? 'default' : 'outline'} onClick={() => setGroupBy('Cell')}>Cell</Button>
                  <Button variant={groupBy === 'Site' ? 'default' : 'outline'} onClick={() => setGroupBy('Site')}>Site</Button>
                </div>
              </div>

              <div className='flex items-end'>
                <Button className='w-full' onClick={() => setPreviewTick((prev) => prev + 1)}>Run Preview</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='space-y-4 xl:col-span-2'>
          <Card>
            <CardHeader><CardTitle>Live Preview</CardTitle></CardHeader>
            <CardContent className='space-y-3'>
              <div className='grid grid-cols-2 gap-2'>
                <StatCard label='Avg' value={previewData.summary.avg} />
                <StatCard label='Min' value={previewData.summary.min} />
                <StatCard label='Max' value={previewData.summary.max} />
                <StatCard label='Objects count' value={previewData.summary.objectsCount} raw />
                <StatCard label='%Green' value={previewData.summary.greenPct} />
                <StatCard label='%Yellow' value={previewData.summary.yellowPct} />
                <StatCard label='%Red' value={previewData.summary.redPct} />
              </div>

              <div className='rounded-md border'>
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
                    {previewData.tableRows.map((row) => (
                      <TableRow key={row.objectName}>
                        <TableCell>{row.objectName}</TableCell>
                        <TableCell>{row.numeratorSum.toFixed(2)}</TableCell>
                        <TableCell>{row.denominatorSum.toFixed(2)}</TableCell>
                        <TableCell>{row.kpiValue.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'Green' ? 'default' : row.status === 'Yellow' ? 'secondary' : 'destructive'}>{row.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {previewData.tableRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>No preview rows after filters.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Warnings</CardTitle></CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <div>Denominator=0 count: <strong>{previewData.denominatorZeroCount}</strong></div>
              <div>Missing counter rows count: <strong>{previewData.missingCounterRowsCount}</strong></div>
              {warnings.length > 0 && (
                <ul className='list-disc space-y-1 ps-5 text-amber-600'>
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>KPI Definition JSON</CardTitle></CardHeader>
            <CardContent>
              <pre className='max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs'>
                {savedDefinition ? JSON.stringify(savedDefinition, null, 2) : 'Click "Save KPI" to generate definition JSON.'}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, raw = false }: { label: string; value: number; raw?: boolean }) {
  const formatted = raw ? String(Math.round(value)) : value.toFixed(2)
  return (
    <div className='rounded-md border bg-muted/40 p-3'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className='text-lg font-semibold'>{formatted}</div>
    </div>
  )
}
