import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  Database,
  Eye,
  FlaskConical,
  Layers,
  Loader2,
  Save,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createKpi, deleteKpi, getKpi, updateKpi } from '@/lib/kpiApi'

type BuilderState = {
  metadata: {
    description: string
    category?: string
    vendor?: string
    tech?: string
    moClass?: string
  }
  mapping: {
    source: string
    tableId?: string
    numerator?: string
    denominator?: string
    additionalCounters?: string[]
    vendor?: string
    tech?: string
    moClass?: string
  }
  formula: {
    expression: string
    type?: 'Ratio' | 'Sum' | 'Difference'
  }
  thresholds: {
    warning: string
    critical: string
  }
}

type PmRowData = Record<string, unknown>

type TableItem = {
  id: string
  name: string
}

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

const defaultState: BuilderState = {
  metadata: { description: '', category: '', vendor: '', tech: '', moClass: '' },
  mapping: {
    source: '',
    tableId: '',
    numerator: '',
    denominator: '',
    additionalCounters: [],
    vendor: '',
    tech: '',
    moClass: '',
  },
  formula: { expression: '', type: 'Ratio' },
  thresholds: { warning: '', critical: '' },
}

const steps = [
  { id: 1, title: 'Define KPI', icon: Target },
  { id: 2, title: 'Choose Data Source', icon: Database },
  { id: 3, title: 'Map Counters', icon: Layers },
  { id: 4, title: 'Formula & Thresholds', icon: FlaskConical },
  { id: 5, title: 'Preview & Save', icon: Eye },
]

const vendorKeyCandidates = ['Vendor', 'vendor']
const techKeyCandidates = ['Technology', 'Tech', 'tech']
const classKeyCandidates = ['Class', 'MO_Class', 'ClSPs', 'moClass', 'class']
const counterKeyCandidates = ['Parameter', 'parameter']

const templateOptions = [
  { label: 'RRC SR', numerator: 'RRC Setup Success', denominator: 'RRC Setup Attempt' },
  { label: 'ERAB SR', numerator: 'ERAB Setup Success', denominator: 'ERAB Setup Attempt' },
  { label: 'Availability', numerator: 'Cell Available Time', denominator: 'Cell Total Time' },
]

const pickExistingKey = (row: PmRowData, candidates: string[]) =>
  candidates.find((candidate) => Object.prototype.hasOwnProperty.call(row, candidate))

const valueToText = (value: unknown) => String(value ?? '').trim()

function CounterPicker({
  label,
  value,
  onSelect,
  options,
}: {
  label: string
  value: string
  onSelect: (next: string) => void
  options: string[]
}) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(
    () => options.filter((item) => item.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  )

  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline' className='w-full justify-between'>
            <span className='truncate'>{value || `Select ${label.toLowerCase()}`}</span>
            <ChevronRight className='size-4 opacity-60' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[360px] p-3' align='start'>
          <Input
            placeholder='Search counters...'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='mb-3'
          />
          <div className='max-h-56 space-y-1 overflow-auto'>
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <Button
                  key={option}
                  variant='ghost'
                  className='w-full justify-start'
                  onClick={() => onSelect(option)}
                >
                  {option}
                </Button>
              ))
            ) : (
              <div className='text-sm text-muted-foreground'>No counters found.</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function KpiBuilderPage({ id }: { id?: string }) {
  const navigate = useNavigate()
  const isEditMode = Boolean(id)
  const [activeStep, setActiveStep] = useState(1)
  const [name, setName] = useState('')
  const [builderState, setBuilderState] = useState<BuilderState>(defaultState)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [tables, setTables] = useState<TableItem[]>([])
  const [rows, setRows] = useState<PmRowData[]>([])
  const [isTablesLoading, setIsTablesLoading] = useState(false)
  const [isRowsLoading, setIsRowsLoading] = useState(false)
  const [savedAt, setSavedAt] = useState<string>('')

  const selectedTableId = builderState.mapping.tableId || ''

  useEffect(() => {
    const loadTables = async () => {
      setIsTablesLoading(true)
      try {
        const response = await fetch(`${backendBaseUrl}/api/dynamic-tables`)
        const data = (await response.json()) as TableItem[]
        setTables(data)
      } catch {
        toast.error('Failed to load PM tables')
      } finally {
        setIsTablesLoading(false)
      }
    }

    void loadTables()
  }, [])

  useEffect(() => {
    if (!selectedTableId) {
      setRows([])
      return
    }

    const loadRows = async () => {
      setIsRowsLoading(true)
      try {
        const response = await fetch(`${backendBaseUrl}/api/dynamic-tables/${selectedTableId}/rows`)
        const data = (await response.json()) as { data: PmRowData }[]
        const sampled = data.slice(0, 5000).map((item) => item.data || {})
        setRows(sampled)
      } catch {
        toast.error('Failed to load selected PM rows')
      } finally {
        setIsRowsLoading(false)
      }
    }

    void loadRows()
  }, [selectedTableId])

  useEffect(() => {
    if (!id) return

    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await getKpi(id)
        if (!isMounted) return

        setName(data.name)
        setSavedAt(data.updatedAt)

        const payload = data.payload as Partial<BuilderState>
        setBuilderState({
          metadata: {
            description:
              (payload.metadata as { description?: string } | undefined)?.description ?? '',
            category: (payload.metadata as { category?: string } | undefined)?.category ?? '',
            vendor: (payload.metadata as { vendor?: string } | undefined)?.vendor ?? '',
            tech: (payload.metadata as { tech?: string } | undefined)?.tech ?? '',
            moClass: (payload.metadata as { moClass?: string } | undefined)?.moClass ?? '',
          },
          mapping: {
            source: (payload.mapping as { source?: string } | undefined)?.source ?? '',
            tableId: (payload.mapping as { tableId?: string } | undefined)?.tableId ?? '',
            numerator: (payload.mapping as { numerator?: string } | undefined)?.numerator ?? '',
            denominator:
              (payload.mapping as { denominator?: string } | undefined)?.denominator ?? '',
            additionalCounters:
              (payload.mapping as { additionalCounters?: string[] } | undefined)
                ?.additionalCounters ?? [],
            vendor: (payload.mapping as { vendor?: string } | undefined)?.vendor ?? '',
            tech: (payload.mapping as { tech?: string } | undefined)?.tech ?? '',
            moClass: (payload.mapping as { moClass?: string } | undefined)?.moClass ?? '',
          },
          formula: {
            expression:
              (payload.formula as { expression?: string } | undefined)?.expression ?? '',
            type: ((payload.formula as { type?: 'Ratio' | 'Sum' | 'Difference' } | undefined)
              ?.type ?? 'Ratio') as 'Ratio' | 'Sum' | 'Difference',
          },
          thresholds: {
            warning:
              (payload.thresholds as { warning?: string } | undefined)?.warning ?? '',
            critical:
              (payload.thresholds as { critical?: string } | undefined)?.critical ?? '',
          },
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load KPI')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [id])

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId),
    [selectedTableId, tables]
  )

  const inferredKeys = useMemo(() => {
    const firstRow = rows[0] ?? {}
    return {
      vendorKey: pickExistingKey(firstRow, vendorKeyCandidates),
      techKey: pickExistingKey(firstRow, techKeyCandidates),
      classKey: pickExistingKey(firstRow, classKeyCandidates),
      counterKey: pickExistingKey(firstRow, counterKeyCandidates),
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (inferredKeys.vendorKey && builderState.metadata.vendor) {
        if (valueToText(row[inferredKeys.vendorKey]) !== builderState.metadata.vendor) return false
      }
      if (inferredKeys.techKey && builderState.metadata.tech) {
        if (valueToText(row[inferredKeys.techKey]) !== builderState.metadata.tech) return false
      }
      if (inferredKeys.classKey && builderState.metadata.moClass) {
        if (valueToText(row[inferredKeys.classKey]) !== builderState.metadata.moClass) return false
      }
      return true
    })
  }, [rows, inferredKeys, builderState.metadata.vendor, builderState.metadata.tech, builderState.metadata.moClass])

  const vendorOptions = useMemo(() => {
    if (!inferredKeys.vendorKey) return []
    return Array.from(new Set(rows.map((row) => valueToText(row[inferredKeys.vendorKey!])).filter(Boolean))).sort()
  }, [rows, inferredKeys.vendorKey])

  const techOptions = useMemo(() => {
    if (!inferredKeys.techKey) return []
    return Array.from(new Set(filteredRows.map((row) => valueToText(row[inferredKeys.techKey!])).filter(Boolean))).sort()
  }, [filteredRows, inferredKeys.techKey])

  const classOptions = useMemo(() => {
    if (!inferredKeys.classKey) return []
    return Array.from(new Set(filteredRows.map((row) => valueToText(row[inferredKeys.classKey!])).filter(Boolean))).sort()
  }, [filteredRows, inferredKeys.classKey])

  const counterOptions = useMemo(() => {
    if (!inferredKeys.counterKey) return []
    return Array.from(new Set(filteredRows.map((row) => valueToText(row[inferredKeys.counterKey!])).filter(Boolean))).sort()
  }, [filteredRows, inferredKeys.counterKey])

  useEffect(() => {
    setBuilderState((prev) => ({
      ...prev,
      mapping: {
        ...prev.mapping,
        vendor: prev.metadata.vendor,
        tech: prev.metadata.tech,
        moClass: prev.metadata.moClass,
      },
    }))
  }, [builderState.metadata.vendor, builderState.metadata.tech, builderState.metadata.moClass])

  useEffect(() => {
    const numerator = builderState.mapping.numerator || 'NUMERATOR'
    const denominator = builderState.mapping.denominator || 'DENOMINATOR'
    const type = builderState.formula.type || 'Ratio'

    let computed = `${numerator} / ${denominator} * 100`
    if (type === 'Sum') computed = `${numerator} + ${denominator}`
    if (type === 'Difference') computed = `${numerator} - ${denominator}`

    setBuilderState((prev) => ({ ...prev, formula: { ...prev.formula, expression: computed } }))
  }, [builderState.mapping.numerator, builderState.mapping.denominator, builderState.formula.type])

  const payload = useMemo(
    () => ({
      metadata: builderState.metadata,
      mapping: builderState.mapping,
      formula: builderState.formula,
      thresholds: builderState.thresholds,
    }),
    [builderState]
  )

  const validation = useMemo(() => {
    const warnings: string[] = []
    if (!name.trim()) warnings.push('KPI name is required')
    if (!builderState.mapping.tableId) warnings.push('Select a PM table')
    if (!builderState.mapping.numerator) warnings.push('Numerator counter is required')
    if (!builderState.mapping.denominator) warnings.push('Denominator counter is required')

    const warning = Number(builderState.thresholds.warning)
    const critical = Number(builderState.thresholds.critical)
    if (!Number.isNaN(warning) && !Number.isNaN(critical) && critical >= warning) {
      warnings.push('Threshold error: critical must be lower than warning')
    }

    if ((builderState.mapping.denominator || '').trim() === '0') {
      warnings.push('Denominator equals 0 risk')
    }

    const foundNumerator = counterOptions.includes(builderState.mapping.numerator || '')
    const foundDenominator = counterOptions.includes(builderState.mapping.denominator || '')

    return { warnings, foundNumerator, foundDenominator }
  }, [
    name,
    builderState.mapping.tableId,
    builderState.mapping.numerator,
    builderState.mapping.denominator,
    builderState.thresholds.warning,
    builderState.thresholds.critical,
    counterOptions,
  ])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    setIsSaving(true)
    try {
      if (isEditMode && id) {
        await updateKpi(id, { name: name.trim(), payload })
      } else {
        await createKpi({ name: name.trim(), payload })
      }
      setSavedAt(new Date().toISOString())
      toast.success('Saved')
      void navigate({ to: '/kpi/list' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save KPI')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await deleteKpi(id)
      toast.success('Deleted')
      void navigate({ to: '/kpi/list' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete KPI')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setBuilderState(defaultState)
    setName('')
    setActiveStep(1)
  }

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 p-6 text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' /> Loading KPI...
      </div>
    )
  }

  return (
    <div className='space-y-4 p-4'>
      <Card className='sticky top-0 z-10 border bg-background/95 backdrop-blur'>
        <CardContent className='flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-xs text-muted-foreground'>KPI / Builder</p>
            <h1 className='text-2xl font-semibold tracking-tight'>KPI Builder</h1>
            <div className='mt-2 flex items-center gap-2 text-xs text-muted-foreground'>
              <Badge variant='secondary' className='gap-1'>
                <CheckCircle2 className='size-3' /> {savedAt ? 'Saved' : 'Draft'}
              </Badge>
              {savedAt && <span>Last updated: {new Date(savedAt).toLocaleString()}</span>}
            </div>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' onClick={resetForm}>
              Reset
            </Button>
            {isEditMode && (
              <Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Trash2 className='mr-2 size-4' />}
                Delete
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving} className='transition-all hover:translate-y-[-1px]'>
              {isSaving ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />} Save KPI
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[1fr_360px]'>
        <div className='space-y-4'>
          <Card>
            <CardContent className='grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5'>
              {steps.map((step) => {
                const Icon = step.icon
                const active = activeStep === step.id
                return (
                  <Button
                    key={step.id}
                    variant={active ? 'default' : 'outline'}
                    className='justify-start gap-2'
                    onClick={() => setActiveStep(step.id)}
                  >
                    <Icon className='size-4' />
                    <span className='truncate'>
                      {step.id}. {step.title}
                    </span>
                  </Button>
                )
              })}
            </CardContent>
          </Card>

          {activeStep === 1 && (
            <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'>
              <CardHeader>
                <CardTitle>Define KPI</CardTitle>
                <CardDescription>Set core business details for this KPI.</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='kpi-name'>KPI Name</Label>
                  <Input id='kpi-name' value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className='space-y-2'>
                  <Label>Category</Label>
                  <Input
                    value={builderState.metadata.category || ''}
                    onChange={(e) =>
                      setBuilderState((prev) => ({
                        ...prev,
                        metadata: { ...prev.metadata, category: e.target.value },
                      }))
                    }
                    placeholder='Accessibility / Retainability / Mobility'
                  />
                </div>
                <div className='space-y-2 md:col-span-2'>
                  <Label>Description</Label>
                  <Textarea
                    value={builderState.metadata.description}
                    onChange={(e) =>
                      setBuilderState((prev) => ({
                        ...prev,
                        metadata: { ...prev.metadata, description: e.target.value },
                      }))
                    }
                    placeholder='Business definition and intent'
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 2 && (
            <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'>
              <CardHeader>
                <CardTitle>PM Source</CardTitle>
                <CardDescription>Options derived from sampled data (up to 5000 rows).</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label>Choose PM Table</Label>
                  <Select
                    value={builderState.mapping.tableId || ''}
                    onValueChange={(value) =>
                      setBuilderState((prev) => ({
                        ...prev,
                        mapping: {
                          ...prev.mapping,
                          tableId: value,
                          source: tables.find((table) => table.id === value)?.name || '',
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isTablesLoading ? 'Loading tables...' : 'Select table'} />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          {table.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTable?.name && <p className='text-xs text-muted-foreground'>Selected: {selectedTable.name}</p>}
                </div>

                <div className='flex flex-wrap gap-2'>
                  <Badge variant='secondary'>Vendor: {inferredKeys.vendorKey || 'N/A'}</Badge>
                  <Badge variant='secondary'>Tech: {inferredKeys.techKey || 'N/A'}</Badge>
                  <Badge variant='secondary'>MO Class: {inferredKeys.classKey || 'N/A'}</Badge>
                  <Badge variant='secondary'>Parameter: {inferredKeys.counterKey || 'N/A'}</Badge>
                </div>

                {isRowsLoading ? (
                  <div className='space-y-2'>
                    <div className='h-9 animate-pulse rounded bg-muted' />
                    <div className='h-9 animate-pulse rounded bg-muted' />
                    <div className='h-9 animate-pulse rounded bg-muted' />
                  </div>
                ) : (
                  <div className='grid gap-4 md:grid-cols-3'>
                    <div className='space-y-2'>
                      <Label>Vendor</Label>
                      <Select
                        value={builderState.metadata.vendor || ''}
                        onValueChange={(value) =>
                          setBuilderState((prev) => ({
                            ...prev,
                            metadata: { ...prev.metadata, vendor: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='All vendors' />
                        </SelectTrigger>
                        <SelectContent>
                          {vendorOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2'>
                      <Label>Tech</Label>
                      <Select
                        value={builderState.metadata.tech || ''}
                        onValueChange={(value) =>
                          setBuilderState((prev) => ({
                            ...prev,
                            metadata: { ...prev.metadata, tech: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='All technologies' />
                        </SelectTrigger>
                        <SelectContent>
                          {techOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2'>
                      <Label>MO Class</Label>
                      <Select
                        value={builderState.metadata.moClass || ''}
                        onValueChange={(value) =>
                          setBuilderState((prev) => ({
                            ...prev,
                            metadata: { ...prev.metadata, moClass: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='All classes' />
                        </SelectTrigger>
                        <SelectContent>
                          {classOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className='grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end'>
                  <CounterPicker
                    label='Numerator Counter'
                    value={builderState.mapping.numerator || ''}
                    options={counterOptions}
                    onSelect={(next) =>
                      setBuilderState((prev) => ({
                        ...prev,
                        mapping: { ...prev.mapping, numerator: next },
                      }))
                    }
                  />
                  <Button
                    variant='outline'
                    size='icon'
                    aria-label='Swap numerator and denominator'
                    onClick={() =>
                      setBuilderState((prev) => ({
                        ...prev,
                        mapping: {
                          ...prev.mapping,
                          numerator: prev.mapping.denominator,
                          denominator: prev.mapping.numerator,
                        },
                      }))
                    }
                  >
                    <ArrowRightLeft className='size-4' />
                  </Button>
                  <CounterPicker
                    label='Denominator Counter'
                    value={builderState.mapping.denominator || ''}
                    options={counterOptions}
                    onSelect={(next) =>
                      setBuilderState((prev) => ({
                        ...prev,
                        mapping: { ...prev.mapping, denominator: next },
                      }))
                    }
                  />
                </div>

                <div className='space-y-2'>
                  <Label>Quick Templates</Label>
                  <Select
                    onValueChange={(value) => {
                      const template = templateOptions.find((item) => item.label === value)
                      if (!template) return
                      setBuilderState((prev) => ({
                        ...prev,
                        mapping: {
                          ...prev.mapping,
                          numerator: template.numerator,
                          denominator: template.denominator,
                        },
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Apply a template' />
                    </SelectTrigger>
                    <SelectContent>
                      {templateOptions.map((option) => (
                        <SelectItem key={option.label} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 3 && (
            <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'>
              <CardHeader>
                <CardTitle>Map Counters</CardTitle>
                <CardDescription>Configure mappings by vendor profile.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue='generic'>
                  <TabsList>
                    <TabsTrigger value='generic'>Generic</TabsTrigger>
                    <TabsTrigger value='nokia'>Nokia</TabsTrigger>
                    <TabsTrigger value='ericsson'>Ericsson</TabsTrigger>
                  </TabsList>

                  {['generic', 'nokia', 'ericsson'].map((tab) => (
                    <TabsContent key={tab} value={tab} className='space-y-4'>
                      <div className='grid gap-4 md:grid-cols-2'>
                        <CounterPicker
                          label='Numerator'
                          value={builderState.mapping.numerator || ''}
                          options={counterOptions}
                          onSelect={(next) =>
                            setBuilderState((prev) => ({
                              ...prev,
                              mapping: { ...prev.mapping, numerator: next },
                            }))
                          }
                        />
                        <CounterPicker
                          label='Denominator'
                          value={builderState.mapping.denominator || ''}
                          options={counterOptions}
                          onSelect={(next) =>
                            setBuilderState((prev) => ({
                              ...prev,
                              mapping: { ...prev.mapping, denominator: next },
                            }))
                          }
                        />
                      </div>

                      <div className='space-y-2'>
                        <Label>Additional Counters (comma separated)</Label>
                        <Input
                          value={(builderState.mapping.additionalCounters || []).join(', ')}
                          onChange={(e) =>
                            setBuilderState((prev) => ({
                              ...prev,
                              mapping: {
                                ...prev.mapping,
                                additionalCounters: e.target.value
                                  .split(',')
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              },
                            }))
                          }
                          placeholder='Counter A, Counter B'
                        />
                      </div>

                      <div className='grid gap-2 text-xs'>
                        <div className='flex items-center gap-2'>
                          <span
                            className={`size-2 rounded-full ${validation.foundNumerator ? 'bg-emerald-500' : 'bg-red-500'}`}
                          />
                          Numerator exists in PM table
                        </div>
                        <div className='flex items-center gap-2'>
                          <span
                            className={`size-2 rounded-full ${validation.foundDenominator ? 'bg-emerald-500' : 'bg-red-500'}`}
                          />
                          Denominator exists in PM table
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}

          {activeStep === 4 && (
            <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'>
              <CardHeader>
                <CardTitle>Formula & Thresholds</CardTitle>
                <CardDescription>Use guided formula mode with guarded thresholds.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label>KPI Type</Label>
                  <div className='flex flex-wrap gap-2'>
                    {(['Ratio', 'Sum', 'Difference'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={builderState.formula.type === type ? 'default' : 'outline'}
                        onClick={() =>
                          setBuilderState((prev) => ({
                            ...prev,
                            formula: { ...prev.formula, type },
                          }))
                        }
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label>Computed Formula</Label>
                  <Input value={builderState.formula.expression} readOnly />
                </div>

                <Separator />

                <div className='space-y-3'>
                  <Label>Thresholds</Label>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label>Yellow boundary</Label>
                      <Input
                        value={builderState.thresholds.warning}
                        onChange={(e) =>
                          setBuilderState((prev) => ({
                            ...prev,
                            thresholds: { ...prev.thresholds, warning: e.target.value },
                          }))
                        }
                        placeholder='e.g. 98'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label>Red boundary</Label>
                      <Input
                        value={builderState.thresholds.critical}
                        onChange={(e) =>
                          setBuilderState((prev) => ({
                            ...prev,
                            thresholds: { ...prev.thresholds, critical: e.target.value },
                          }))
                        }
                        placeholder='e.g. 95'
                      />
                    </div>
                  </div>
                  <div className='overflow-hidden rounded-md border'>
                    <div className='h-2 bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500' />
                    <p className='p-2 text-xs text-muted-foreground'>
                      Green ≥ Warning, Yellow Critical..Warning, Red {'<'} Critical
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 5 && (
            <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'>
              <CardHeader>
                <CardTitle>Preview & Save</CardTitle>
                <CardDescription>Final checks before publishing this KPI definition.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-3 sm:grid-cols-3'>
                  {[
                    { label: 'Min', value: '--' },
                    { label: 'Avg', value: '--' },
                    { label: 'Max', value: '--' },
                  ].map((item) => (
                    <Card key={item.label}>
                      <CardContent className='p-4'>
                        <p className='text-xs text-muted-foreground'>{item.label}</p>
                        <p className='text-2xl font-semibold'>{item.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <details className='rounded-md border p-3'>
                  <summary className='cursor-pointer text-sm font-medium'>KPI JSON Preview</summary>
                  <pre className='mt-3 overflow-x-auto rounded bg-muted p-3 text-xs'>
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                </details>

                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Sparkles className='mr-2 size-4' />} Save KPI
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Live Summary</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Name</span>
                <span className='font-medium'>{name || 'Untitled KPI'}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Category</span>
                <span>{builderState.metadata.category || '--'}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>PM table</span>
                <span className='max-w-[180px] truncate'>{selectedTable?.name || '--'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validation</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              {validation.warnings.length > 0 ? (
                validation.warnings.map((warning) => (
                  <div key={warning} className='flex gap-2 text-sm text-amber-600'>
                    <AlertTriangle className='mt-0.5 size-4 shrink-0' />
                    <span>{warning}</span>
                  </div>
                ))
              ) : (
                <div className='flex gap-2 text-sm text-emerald-600'>
                  <CheckCircle2 className='size-4' /> All checks passed
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className='max-h-[280px] overflow-auto rounded bg-muted p-3 text-xs'>
                {JSON.stringify(payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
