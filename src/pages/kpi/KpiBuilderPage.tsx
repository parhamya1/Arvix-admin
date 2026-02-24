import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createKpi, deleteKpi, getKpi, updateKpi } from '@/lib/kpiApi'

const ENABLE_DYNAMIC_PM_DISCOVERY = false

type ThresholdOperator = '<' | '<=' | '>' | '>=' | 'between'

type ThresholdRule = {
  operator: ThresholdOperator
  value?: string
  min?: string
  max?: string
}

type BuilderState = {
  metadata: {
    description: string
    category?: string
    vendor?: string
    tech?: string
    techList?: string[]
    scope?: string
    moClass?: string
    moClasses?: string[]
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
    numeratorVar?: string
    denominatorVar?: string
    sumVar?: string
    variables?: Array<{ variableName: string; counterName: string }>
  }
  formula: {
    expression: string
    type?: 'Success Rate (%)' | 'Drop Rate (%)' | 'Availability (%)' | 'Sum' | 'Ratio (generic A/B * K)' | 'Ratio' | 'Difference'
    multiplier?: string
  }
  thresholds: {
    warning: string
    critical: string
    rules?: {
      warning: ThresholdRule
      critical: ThresholdRule
      success?: ThresholdRule
    }
  }
}

const defaultState: BuilderState = {
  metadata: {
    description: '',
    category: '',
    vendor: 'Nokia',
    tech: '4G',
    techList: ['4G'],
    scope: 'Network',
    moClass: '',
    moClasses: [],
  },
  mapping: {
    source: 'STATIC_CATALOG',
    tableId: '',
    numerator: '',
    denominator: '',
    additionalCounters: [],
    vendor: 'Nokia',
    tech: '4G',
    moClass: '',
    numeratorVar: '',
    denominatorVar: '',
    sumVar: '',
    variables: [],
  },
  formula: { expression: '', type: 'Success Rate (%)', multiplier: '100' },
  thresholds: {
    warning: '',
    critical: '',
    rules: {
      warning: { operator: '<', value: '' },
      critical: { operator: '<', value: '' },
      success: { operator: '>=', value: '' },
    },
  },
}

const steps = [
  { id: 1, title: 'Define KPI', icon: Target },
  { id: 2, title: 'Data Scope', icon: Layers },
  { id: 3, title: 'Map Counters', icon: ArrowRightLeft },
  { id: 4, title: 'Formula & Thresholds', icon: FlaskConical },
  { id: 5, title: 'Preview & Save', icon: Eye },
]

const vendorOptions = ['Nokia', 'Ericsson', 'Huawei', 'ZTE']
const techOptions = ['2G', '3G', '4G', '5G']
const scopeOptions = ['Network', 'Node', 'Site', 'Cell']

const moClassCatalog: Record<string, Record<string, string[]>> = {
  Nokia: {
    '2G': ['BSC', 'BCF', 'BTS', 'TRX', 'CELL'],
    '3G': ['RNC', 'WBTS', 'WCEL', 'HSDPA'],
    '4G': ['MRBTS', 'LNBTS', 'LNCEL', 'LNCEL_FDD', 'LNCEL_TDD'],
    '5G': ['NRBTS', 'NRCELL', 'NRCELL_FDD', 'NRCELL_TDD'],
  },
  Ericsson: {
    '2G': ['BSC', 'BTS', 'TRX', 'GeranCell'],
    '3G': ['RNC', 'NodeB', 'UtranCell', 'Hsdsch'],
    '4G': ['ENodeB', 'EUtranCellFDD', 'EUtranCellTDD', 'ERBS'],
    '5G': ['GNBDU', 'GNBCU', 'NRCellDU', 'NRCellCU'],
  },
  Huawei: {
    '2G': ['BSC', 'BTS', 'Cell', 'TRX'],
    '3G': ['RNC', 'NodeB', 'Cell', 'UCELL'],
    '4G': ['eNodeB', 'Cell', 'EUtranCell', 'LNCEL'],
    '5G': ['gNodeB', 'NRCell', 'NRCELL'],
  },
  ZTE: {
    '2G': ['BSC', 'BTS', 'Cell'],
    '3G': ['RNC', 'NodeB', 'Cell'],
    '4G': ['eNodeB', 'Cell', 'EUtranCell'],
    '5G': ['gNodeB', 'NRCell'],
  },
}

const staticCounterCatalog: Record<string, Record<string, string[]>> = {
  Nokia: {
    '2G': ['tchSeizureAttempts', 'tchSeizureSuccess', 'sdcchSeizureAttempts', 'sdcchSeizureSuccess', 'callDrops', 'tchTrafficErlang'],
    '3G': ['rrcConnReq', 'rrcConnSucc', 'csRabEstabAtt', 'csRabEstabSucc', 'psRabEstabAtt', 'psRabEstabSucc', 'rlfEvents', 'hsDataVolumeMb'],
    '4G': ['rrcConnEstabAtt', 'rrcConnEstabSucc', 'erabEstabAtt', 'erabEstabSucc', 'hoAtt', 'hoSucc', 'dlDataVolumeMb', 'ulDataVolumeMb', 'prbUtilizationPct'],
    '5G': ['rrcResumeAtt', 'rrcResumeSucc', 'pduSessionEstabAtt', 'pduSessionEstabSucc', 'nrDlDataVolumeMb', 'nrUlDataVolumeMb'],
  },
  Ericsson: {
    '2G': ['tchSeizureAttempts', 'tchSeizureSuccess', 'sdcchSeizureAttempts', 'sdcchSeizureSuccess', 'callDrops', 'tchTrafficErlang'],
    '3G': ['rrcConnReq', 'rrcConnSucc', 'csRabEstabAtt', 'csRabEstabSucc', 'psRabEstabAtt', 'psRabEstabSucc', 'rlfEvents', 'hsDataVolumeMb'],
    '4G': ['rrcConnEstabAtt', 'rrcConnEstabSucc', 'erabEstabAtt', 'erabEstabSucc', 'hoAtt', 'hoSucc', 'dlDataVolumeMb', 'ulDataVolumeMb', 'prbUtilizationPct'],
    '5G': ['rrcResumeAtt', 'rrcResumeSucc', 'pduSessionEstabAtt', 'pduSessionEstabSucc', 'nrDlDataVolumeMb', 'nrUlDataVolumeMb'],
  },
  Huawei: {
    '2G': ['tchSeizureAttempts', 'tchSeizureSuccess', 'sdcchSeizureAttempts', 'sdcchSeizureSuccess', 'callDrops', 'tchTrafficErlang'],
    '3G': ['rrcConnReq', 'rrcConnSucc', 'csRabEstabAtt', 'csRabEstabSucc', 'psRabEstabAtt', 'psRabEstabSucc', 'rlfEvents', 'hsDataVolumeMb'],
    '4G': ['rrcConnEstabAtt', 'rrcConnEstabSucc', 'erabEstabAtt', 'erabEstabSucc', 'hoAtt', 'hoSucc', 'dlDataVolumeMb', 'ulDataVolumeMb', 'prbUtilizationPct'],
    '5G': ['rrcResumeAtt', 'rrcResumeSucc', 'pduSessionEstabAtt', 'pduSessionEstabSucc', 'nrDlDataVolumeMb', 'nrUlDataVolumeMb'],
  },
  ZTE: {
    '2G': ['tchSeizureAttempts', 'tchSeizureSuccess', 'sdcchSeizureAttempts', 'sdcchSeizureSuccess', 'callDrops', 'tchTrafficErlang'],
    '3G': ['rrcConnReq', 'rrcConnSucc', 'csRabEstabAtt', 'csRabEstabSucc', 'psRabEstabAtt', 'psRabEstabSucc', 'rlfEvents', 'hsDataVolumeMb'],
    '4G': ['rrcConnEstabAtt', 'rrcConnEstabSucc', 'erabEstabAtt', 'erabEstabSucc', 'hoAtt', 'hoSucc', 'dlDataVolumeMb', 'ulDataVolumeMb', 'prbUtilizationPct'],
    '5G': ['rrcResumeAtt', 'rrcResumeSucc', 'pduSessionEstabAtt', 'pduSessionEstabSucc', 'nrDlDataVolumeMb', 'nrUlDataVolumeMb'],
  },
}

const recipes = [
  { label: 'Success Rate (%)', numerator: 'rrcConnEstabSucc', denominator: 'rrcConnEstabAtt', type: 'Success Rate (%)' as const },
  { label: 'Drop Rate (%)', numerator: 'callDrops', denominator: 'tchSeizureAttempts', type: 'Drop Rate (%)' as const },
  { label: 'Availability (%)', numerator: 'upTimeMinutes', denominator: 'totalTimeMinutes', type: 'Availability (%)' as const },
]

function SearchablePicker({ label, value, onSelect, options }: { label: string; value: string; onSelect: (next: string) => void; options: string[] }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())), [options, search])

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
          <Input placeholder='Search...' value={search} onChange={(event) => setSearch(event.target.value)} className='mb-3' />
          <ScrollArea className='h-56'>
            <div className='space-y-1'>
              {filtered.length > 0 ? filtered.map((option) => (
                <Button key={option} variant='ghost' className='w-full justify-start' onClick={() => onSelect(option)}>
                  {option}
                </Button>
              )) : <div className='text-sm text-muted-foreground'>No options found.</div>}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function MultiSelectChips({ label, selected, options, onToggle }: { label: string; selected: string[]; options: string[]; onToggle: (value: string) => void }) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <div className='flex flex-wrap gap-2'>
        {options.map((option) => {
          const active = selected.includes(option)
          return (
            <Button key={option} type='button' variant={active ? 'default' : 'outline'} size='sm' onClick={() => onToggle(option)}>
              {option}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function RuleEditor({ title, rule, onChange, required }: { title: string; rule: ThresholdRule; onChange: (next: ThresholdRule) => void; required?: boolean }) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>
          {title} {required ? <span className='text-destructive'>*</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        <Select value={rule.operator} onValueChange={(value) => onChange({ ...rule, operator: value as ThresholdOperator })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value='<'>{'Less than (<)'}</SelectItem>
            <SelectItem value='<='>{'Less than or equal (<=)'}</SelectItem>
            <SelectItem value='>'>{'Greater than (>)'}</SelectItem>
            <SelectItem value='>='>{'Greater than or equal (>=)'}</SelectItem>
            <SelectItem value='between'>Between (inclusive)</SelectItem>
          </SelectContent>
        </Select>
        {rule.operator === 'between' ? (
          <div className='grid grid-cols-2 gap-2'>
            <Input placeholder='Min' value={rule.min || ''} onChange={(e) => onChange({ ...rule, min: e.target.value })} />
            <Input placeholder='Max' value={rule.max || ''} onChange={(e) => onChange({ ...rule, max: e.target.value })} />
          </div>
        ) : (
          <Input placeholder='Value' value={rule.value || ''} onChange={(e) => onChange({ ...rule, value: e.target.value })} />
        )}
      </CardContent>
    </Card>
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
  const [savedAt, setSavedAt] = useState<string>('')

  useEffect(() => {
    if (!id) return
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await getKpi(id)
        if (!mounted) return
        setName(data.name)
        setSavedAt(data.updatedAt)
        const payload = data.payload as Partial<BuilderState>
        const metadata = (payload.metadata || {}) as BuilderState['metadata']
        const mapping = (payload.mapping || {}) as BuilderState['mapping']
        const formula = (payload.formula || {}) as BuilderState['formula']
        const thresholds = (payload.thresholds || {}) as BuilderState['thresholds']
        const techList = Array.isArray(metadata.techList) ? metadata.techList : metadata.tech ? metadata.tech.split(',').map((t) => t.trim()).filter(Boolean) : ['4G']
        const moClasses = Array.isArray(metadata.moClasses) ? metadata.moClasses : metadata.moClass ? metadata.moClass.split(',').map((m) => m.trim()).filter(Boolean) : []
        setBuilderState({
          metadata: {
            description: metadata.description ?? '',
            category: metadata.category ?? '',
            vendor: metadata.vendor ?? 'Nokia',
            tech: metadata.tech ?? techList.join(','),
            techList,
            scope: metadata.scope ?? 'Network',
            moClass: metadata.moClass ?? moClasses.join(','),
            moClasses,
          },
          mapping: {
            source: mapping.source ?? 'STATIC_CATALOG',
            tableId: mapping.tableId ?? '',
            numerator: mapping.numerator ?? '',
            denominator: mapping.denominator ?? '',
            additionalCounters: mapping.additionalCounters ?? [],
            vendor: mapping.vendor ?? metadata.vendor ?? 'Nokia',
            tech: mapping.tech ?? metadata.tech ?? techList.join(','),
            moClass: mapping.moClass ?? metadata.moClass ?? moClasses.join(','),
            numeratorVar: mapping.numeratorVar ?? '',
            denominatorVar: mapping.denominatorVar ?? '',
            sumVar: mapping.sumVar ?? '',
            variables: mapping.variables ?? [],
          },
          formula: {
            expression: formula.expression ?? '',
            type: formula.type ?? 'Success Rate (%)',
            multiplier: formula.multiplier ?? '100',
          },
          thresholds: {
            warning: thresholds.warning ?? '',
            critical: thresholds.critical ?? '',
            rules: thresholds.rules ?? {
              warning: { operator: '<', value: thresholds.warning ?? '' },
              critical: { operator: '<', value: thresholds.critical ?? '' },
              success: { operator: '>=', value: '' },
            },
          },
        })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load KPI')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [id])

  const selectedVendor = builderState.metadata.vendor || 'Nokia'
  const selectedTechs = builderState.metadata.techList || []

  const moClassOptions = useMemo(() => {
    const byVendor = moClassCatalog[selectedVendor] || {}
    return Array.from(new Set(selectedTechs.flatMap((tech) => byVendor[tech] || []))).sort()
  }, [selectedVendor, selectedTechs])

  const countersByVendorTech = useMemo(() => {
    return Array.from(new Set(selectedTechs.flatMap((tech) => staticCounterCatalog[selectedVendor]?.[tech] || []))).sort()
  }, [selectedVendor, selectedTechs])

  const genericCounterOptions = useMemo(() => {
    return Array.from(new Set(selectedTechs.flatMap((tech) => vendorOptions.flatMap((vendor) => staticCounterCatalog[vendor]?.[tech] || [])))).sort()
  }, [selectedTechs])

  const variableNames = useMemo(() => (builderState.mapping.variables || []).map((v) => v.variableName).filter(Boolean), [builderState.mapping.variables])

  useEffect(() => {
    const type = builderState.formula.type || 'Success Rate (%)'
    const multiplier = builderState.formula.multiplier || '100'
    const vars = builderState.mapping.variables || []
    const numeratorVar = builderState.mapping.numeratorVar || vars[0]?.variableName || 'numerator'
    const denominatorVar = builderState.mapping.denominatorVar || vars[1]?.variableName || 'denominator'
    const sumVar = builderState.mapping.sumVar || vars[0]?.variableName || 'x'
    let expr = 'safeDivide(SUM(numerator), SUM(denominator)) * 100'
    if (type === 'Sum') expr = `SUM(${sumVar})`
    if (type === 'Ratio (generic A/B * K)') expr = `safeDivide(SUM(${numeratorVar}), SUM(${denominatorVar})) * ${multiplier}`
    if (type === 'Success Rate (%)') expr = `safeDivide(SUM(${numeratorVar}), SUM(${denominatorVar})) * 100`
    if (type === 'Drop Rate (%)') expr = `safeDivide(SUM(${numeratorVar}), SUM(${denominatorVar})) * 100`
    if (type === 'Availability (%)') expr = `safeDivide(SUM(${numeratorVar}), SUM(${denominatorVar})) * 100`

    setBuilderState((prev) => ({
      ...prev,
      formula: { ...prev.formula, expression: expr },
      metadata: { ...prev.metadata, tech: (prev.metadata.techList || []).join(','), moClass: (prev.metadata.moClasses || []).join(',') },
      mapping: { ...prev.mapping, vendor: prev.metadata.vendor, tech: (prev.metadata.techList || []).join(','), moClass: (prev.metadata.moClasses || []).join(',') },
    }))
  }, [builderState.formula.type, builderState.formula.multiplier, builderState.mapping.numeratorVar, builderState.mapping.denominatorVar, builderState.mapping.sumVar, builderState.mapping.variables, builderState.metadata.vendor, builderState.metadata.techList, builderState.metadata.moClasses])

  useEffect(() => {
    if (!ENABLE_DYNAMIC_PM_DISCOVERY) {
      setBuilderState((prev) => ({ ...prev, mapping: { ...prev.mapping, source: 'STATIC_CATALOG', tableId: '' } }))
    }
  }, [])

  const validationMessages = useMemo(() => {
    const list: string[] = []
    if (!name.trim()) list.push('KPI name is required')
    if (!builderState.mapping.numerator) list.push('Numerator counter is required')
    if (!builderState.mapping.denominator) list.push('Denominator counter is required')
    if (!(builderState.metadata.techList || []).length) list.push('Select at least one technology')
    if (!(builderState.metadata.moClasses || []).length) list.push('Select at least one MO Class')

    const warningRule = builderState.thresholds.rules?.warning
    const criticalRule = builderState.thresholds.rules?.critical
    const warningValid = warningRule ? warningRule.operator === 'between' ? !!warningRule.min && !!warningRule.max : !!warningRule.value : false
    const criticalValid = criticalRule ? criticalRule.operator === 'between' ? !!criticalRule.min && !!criticalRule.max : !!criticalRule.value : false
    if (!warningValid) list.push('Warning rule is required')
    if (!criticalValid) list.push('Critical rule is required')

    const vars = builderState.mapping.variables || []
    const names = vars.map((v) => v.variableName.trim()).filter(Boolean)
    if (new Set(names).size !== names.length) list.push('Variable names must be unique')
    if (vars.some((v) => !v.variableName.trim() || !v.counterName.trim())) list.push('All counter variables need variable name and counter name')
    return list
  }, [name, builderState])

  const payload = useMemo(() => ({
    metadata: builderState.metadata,
    mapping: builderState.mapping,
    formula: builderState.formula,
    thresholds: {
      ...builderState.thresholds,
      warning: builderState.thresholds.warning || builderState.thresholds.rules?.warning?.value || builderState.thresholds.rules?.warning?.max || '',
      critical: builderState.thresholds.critical || builderState.thresholds.rules?.critical?.value || builderState.thresholds.rules?.critical?.max || '',
    },
  }), [builderState])

  const saveKpi = async () => {
    if (!name.trim()) return toast.error('Name is required')
    setIsSaving(true)
    try {
      if (isEditMode && id) await updateKpi(id, { name: name.trim(), payload })
      else await createKpi({ name: name.trim(), payload })
      setSavedAt(new Date().toISOString())
      toast.success('Saved')
      void navigate({ to: '/kpi/list' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save KPI')
    } finally {
      setIsSaving(false)
    }
  }

  const removeKpi = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await deleteKpi(id)
      toast.success('Deleted')
      void navigate({ to: '/kpi/list' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete KPI')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setBuilderState(defaultState)
    setName('')
    setActiveStep(1)
  }

  const activeCounterOptions = useMemo(() => countersByVendorTech.length ? countersByVendorTech : genericCounterOptions, [countersByVendorTech, genericCounterOptions])

  if (isLoading) {
    return <div className='flex items-center gap-2 p-6 text-muted-foreground'><Loader2 className='size-4 animate-spin' /> Loading KPI...</div>
  }

  return (
    <div className='space-y-4 p-4'>
      <Card className='sticky top-0 z-10 border bg-background/95 backdrop-blur'>
        <CardContent className='flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-xs text-muted-foreground'>KPI / Builder</p>
            <h1 className='text-2xl font-semibold tracking-tight'>KPI Builder</h1>
            <div className='mt-2 flex items-center gap-2 text-xs text-muted-foreground'>
              <Badge variant='secondary' className='gap-1'><CheckCircle2 className='size-3' /> {savedAt ? 'Saved' : 'Draft'}</Badge>
              {savedAt && <span>Last updated: {new Date(savedAt).toLocaleString()}</span>}
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' onClick={resetForm}>Reset</Button>
            {isEditMode && <Button variant='destructive' onClick={removeKpi} disabled={isDeleting}>{isDeleting ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Trash2 className='mr-2 size-4' />}Delete</Button>}
            <Button onClick={saveKpi} disabled={isSaving} className='transition-all hover:translate-y-[-1px]'>{isSaving ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />}Save KPI</Button>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[260px_1fr_360px]'>
        <Card className='h-fit sticky top-24'>
          <CardHeader className='pb-2'><CardTitle className='text-base'>Steps</CardTitle></CardHeader>
          <CardContent className='space-y-2'>
            {steps.map((step) => {
              const Icon = step.icon
              const active = step.id === activeStep
              return <Button key={step.id} variant={active ? 'default' : 'ghost'} className='w-full justify-start gap-2' onClick={() => setActiveStep(step.id)}><Icon className='size-4' /><span className='truncate'>{step.id}. {step.title}</span></Button>
            })}
          </CardContent>
        </Card>

        <div className='space-y-4'>
          {activeStep === 1 && <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'><CardHeader><CardTitle>Define KPI</CardTitle><CardDescription>Capture KPI identity and business context.</CardDescription></CardHeader><CardContent className='grid gap-4 md:grid-cols-2'><div className='space-y-2'><Label htmlFor='kpi-name'>KPI Name</Label><Input id='kpi-name' value={name} onChange={(e) => setName(e.target.value)} /></div><div className='space-y-2'><Label>Category</Label><Input value={builderState.metadata.category || ''} onChange={(e) => setBuilderState((prev) => ({ ...prev, metadata: { ...prev.metadata, category: e.target.value } }))} placeholder='Accessibility / Retainability / Mobility' /></div><div className='space-y-2 md:col-span-2'><Label>Description</Label><Textarea value={builderState.metadata.description} onChange={(e) => setBuilderState((prev) => ({ ...prev, metadata: { ...prev.metadata, description: e.target.value } }))} placeholder='What this KPI measures and why it matters' /></div></CardContent></Card>}

          {activeStep === 2 && <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'><CardHeader><CardTitle>Data Scope (Static MVP)</CardTitle><CardDescription>Dropdown options are static for now. Dynamic PM discovery is disabled.</CardDescription></CardHeader><CardContent className='space-y-4'><div className='grid gap-4 md:grid-cols-3'><div className='space-y-2'><Label>Vendor</Label><Select value={builderState.metadata.vendor || 'Nokia'} onValueChange={(value) => setBuilderState((prev) => ({ ...prev, metadata: { ...prev.metadata, vendor: value, moClasses: [] } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{vendorOptions.map((vendor) => <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>)}</SelectContent></Select></div><div className='space-y-2'><Label>Scope</Label><Select value={builderState.metadata.scope || 'Network'} onValueChange={(value) => setBuilderState((prev) => ({ ...prev, metadata: { ...prev.metadata, scope: value } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{scopeOptions.map((scope) => <SelectItem key={scope} value={scope}>{scope}</SelectItem>)}</SelectContent></Select></div><div className='space-y-2'><Label>KPI Recipes</Label><Select onValueChange={(value) => { const recipe = recipes.find((r) => r.label === value); if (!recipe) return; setBuilderState((prev) => ({ ...prev, formula: { ...prev.formula, type: recipe.type }, mapping: { ...prev.mapping, numerator: prev.mapping.numerator || recipe.numerator, denominator: prev.mapping.denominator || recipe.denominator } })) }}><SelectTrigger><SelectValue placeholder='Apply recipe' /></SelectTrigger><SelectContent>{recipes.map((recipe) => <SelectItem key={recipe.label} value={recipe.label}>{recipe.label}</SelectItem>)}</SelectContent></Select></div></div>

            <MultiSelectChips label='Technology (multi)' selected={builderState.metadata.techList || []} options={techOptions} onToggle={(value) => setBuilderState((prev) => { const list = prev.metadata.techList || []; const next = list.includes(value) ? list.filter((i) => i !== value) : [...list, value]; return { ...prev, metadata: { ...prev.metadata, techList: next } } })} />

            <div className='space-y-2'><SearchablePicker label='MO Class (search + multi via add button)' value='' options={moClassOptions} onSelect={(value) => setBuilderState((prev) => { const list = prev.metadata.moClasses || []; if (list.includes(value)) return prev; return { ...prev, metadata: { ...prev.metadata, moClasses: [...list, value] } } })} /><div className='flex flex-wrap gap-2'>{(builderState.metadata.moClasses || []).map((cls) => <Badge key={cls} className='gap-2'>{cls}<button type='button' onClick={() => setBuilderState((prev) => ({ ...prev, metadata: { ...prev.metadata, moClasses: (prev.metadata.moClasses || []).filter((item) => item !== cls) } }))}>×</button></Badge>)}</div></div>

            <Card className='border-dashed'><CardContent className='p-3 text-xs text-muted-foreground'><p className='font-medium text-foreground mb-1'>What is this?</p><p>Numerator = Success (or event of interest)</p><p>Denominator = Attempts (or baseline)</p><p>Rate KPIs computed as SUM(numer) / SUM(denom) * 100 using safeDivide</p></CardContent></Card>
          </CardContent></Card>}

          {activeStep === 3 && <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'><CardHeader><CardTitle>Map Counters</CardTitle><CardDescription>Select numerator/denominator and define counter variables.</CardDescription></CardHeader><CardContent className='space-y-4'><Tabs defaultValue='generic'><TabsList><TabsTrigger value='generic'>Generic</TabsTrigger><TabsTrigger value='Nokia'>Nokia</TabsTrigger><TabsTrigger value='Ericsson'>Ericsson</TabsTrigger><TabsTrigger value='Huawei'>Huawei</TabsTrigger></TabsList>{['generic', 'Nokia', 'Ericsson', 'Huawei'].map((tab) => { const options = tab === 'generic' ? genericCounterOptions : Array.from(new Set(selectedTechs.flatMap((tech) => staticCounterCatalog[tab]?.[tech] || []))).sort(); return <TabsContent key={tab} value={tab} className='space-y-4'><div className='grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end'><SearchablePicker label='Numerator' value={builderState.mapping.numerator || ''} options={options} onSelect={(value) => setBuilderState((prev) => ({ ...prev, mapping: { ...prev.mapping, numerator: value } }))} /><Button variant='outline' size='icon' aria-label='Swap numerator and denominator' onClick={() => setBuilderState((prev) => ({ ...prev, mapping: { ...prev.mapping, numerator: prev.mapping.denominator, denominator: prev.mapping.numerator } }))}><ArrowRightLeft className='size-4' /></Button><SearchablePicker label='Denominator' value={builderState.mapping.denominator || ''} options={options} onSelect={(value) => setBuilderState((prev) => ({ ...prev, mapping: { ...prev.mapping, denominator: value } }))} /></div></TabsContent> })}</Tabs>

            <Separator />

            <div className='space-y-3'><div className='flex items-center justify-between'><Label>Add counter variable</Label><Button type='button' variant='outline' size='sm' onClick={() => setBuilderState((prev) => ({ ...prev, mapping: { ...prev.mapping, variables: [...(prev.mapping.variables || []), { variableName: '', counterName: '' }] } }))}>+ Add variable</Button></div><div className='space-y-2'>{(builderState.mapping.variables || []).map((variable, index) => <Card key={`${index}-${variable.variableName}`}><CardContent className='p-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]'><Input placeholder='variableName' value={variable.variableName} onChange={(e) => setBuilderState((prev) => { const next = [...(prev.mapping.variables || [])]; next[index] = { ...next[index], variableName: e.target.value }; return { ...prev, mapping: { ...prev.mapping, variables: next } } })} /><SearchablePicker label='counterName' value={variable.counterName} options={activeCounterOptions} onSelect={(value) => setBuilderState((prev) => { const next = [...(prev.mapping.variables || [])]; next[index] = { ...next[index], counterName: value }; return { ...prev, mapping: { ...prev.mapping, variables: next } } })} /><Button type='button' variant='ghost' className='self-end' onClick={() => setBuilderState((prev) => ({ ...prev, mapping: { ...prev.mapping, variables: (prev.mapping.variables || []).filter((_, i) => i !== index) } }))}>Remove</Button></CardContent></Card>)}</div></div>
          </CardContent></Card>}

          {activeStep === 4 && <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'><CardHeader><CardTitle>Formula & Thresholds</CardTitle><CardDescription>Professional KPI types with safe expression builder.</CardDescription></CardHeader><CardContent className='space-y-4'><div className='space-y-2'><Label>KPI Type</Label><Select value={builderState.formula.type || 'Success Rate (%)'} onValueChange={(value) => setBuilderState((prev) => ({ ...prev, formula: { ...prev.formula, type: value as BuilderState['formula']['type'] } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='Success Rate (%)'>Success Rate (%)</SelectItem><SelectItem value='Drop Rate (%)'>Drop Rate (%)</SelectItem><SelectItem value='Availability (%)'>Availability (%)</SelectItem><SelectItem value='Sum'>Sum</SelectItem><SelectItem value='Ratio (generic A/B * K)'>Ratio (generic A/B * K)</SelectItem></SelectContent></Select></div>

            <div className='grid gap-3 md:grid-cols-3'><div className='space-y-2'><Label>Numerator variable</Label><Select value={builderState.mapping.numeratorVar || ''} onValueChange={(value) => setBuilderState((prev) => ({ ...prev, mapping: { ...prev.mapping, numeratorVar: value } }))}><SelectTrigger><SelectValue placeholder='Select variable' /></SelectTrigger><SelectContent>{variableNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div><div className='space-y-2'><Label>Denominator variable</Label><Select value={builderState.mapping.denominatorVar || ''} onValueChange={(value) => setBuilderState((prev) => ({ ...prev, mapping: { ...prev.mapping, denominatorVar: value } }))}><SelectTrigger><SelectValue placeholder='Select variable' /></SelectTrigger><SelectContent>{variableNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div><div className='space-y-2'><Label>Multiplier K</Label><Input value={builderState.formula.multiplier || '100'} onChange={(e) => setBuilderState((prev) => ({ ...prev, formula: { ...prev.formula, multiplier: e.target.value } }))} /></div></div>

            <div className='space-y-2'><Label>Computed Formula (safe)</Label><Input value={builderState.formula.expression} readOnly /></div>

            <Separator />

            <div className='space-y-3'><Label>Threshold Rules</Label><div className='grid gap-3 md:grid-cols-3'><RuleEditor title='Warning Rule' required rule={builderState.thresholds.rules?.warning || { operator: '<', value: '' }} onChange={(next) => setBuilderState((prev) => ({ ...prev, thresholds: { ...prev.thresholds, warning: next.value || next.max || prev.thresholds.warning, rules: { ...prev.thresholds.rules!, warning: next } } }))} /><RuleEditor title='Critical Rule' required rule={builderState.thresholds.rules?.critical || { operator: '<', value: '' }} onChange={(next) => setBuilderState((prev) => ({ ...prev, thresholds: { ...prev.thresholds, critical: next.value || next.max || prev.thresholds.critical, rules: { ...prev.thresholds.rules!, critical: next } } }))} /><RuleEditor title='Success Rule (optional)' rule={builderState.thresholds.rules?.success || { operator: '>=', value: '' }} onChange={(next) => setBuilderState((prev) => ({ ...prev, thresholds: { ...prev.thresholds, rules: { ...prev.thresholds.rules!, success: next } } }))} /></div></div>
          </CardContent></Card>}

          {activeStep === 5 && <Card className='animate-in fade-in-0 slide-in-from-bottom-1 duration-200'><CardHeader><CardTitle>Preview & Save</CardTitle><CardDescription>Review payload, checks, and save.</CardDescription></CardHeader><CardContent className='space-y-4'><div className='grid gap-3 sm:grid-cols-3'>{[{ label: 'Variables', value: String((builderState.mapping.variables || []).length) }, { label: 'Techs', value: String((builderState.metadata.techList || []).length) }, { label: 'MO Classes', value: String((builderState.metadata.moClasses || []).length) }].map((item) => <Card key={item.label}><CardContent className='p-4'><p className='text-xs text-muted-foreground'>{item.label}</p><p className='text-2xl font-semibold'>{item.value}</p></CardContent></Card>)}</div><details className='rounded-md border p-3'><summary className='cursor-pointer text-sm font-medium'>KPI JSON Preview</summary><pre className='mt-3 overflow-x-auto rounded bg-muted p-3 text-xs'>{JSON.stringify(payload, null, 2)}</pre></details><Button onClick={saveKpi} disabled={isSaving}>{isSaving ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Sparkles className='mr-2 size-4' />}Save KPI</Button></CardContent></Card>}
        </div>

        <div className='space-y-4'>
          <Card><CardHeader><CardTitle>Live Summary</CardTitle></CardHeader><CardContent className='space-y-2 text-sm'><div className='flex items-center justify-between'><span className='text-muted-foreground'>Name</span><span className='font-medium'>{name || 'Untitled KPI'}</span></div><div className='flex items-center justify-between'><span className='text-muted-foreground'>Vendor</span><span>{builderState.metadata.vendor || '--'}</span></div><div className='flex items-center justify-between'><span className='text-muted-foreground'>Tech</span><span>{(builderState.metadata.techList || []).join(', ') || '--'}</span></div><div className='flex items-center justify-between'><span className='text-muted-foreground'>Scope</span><span>{builderState.metadata.scope || '--'}</span></div></CardContent></Card>

          <Card><CardHeader><CardTitle>Validation</CardTitle></CardHeader><CardContent className='space-y-2'>{validationMessages.length ? validationMessages.map((msg) => <div key={msg} className='flex gap-2 text-sm text-amber-600'><AlertTriangle className='mt-0.5 size-4 shrink-0' /><span>{msg}</span></div>) : <div className='flex gap-2 text-sm text-emerald-600'><CheckCircle2 className='size-4' /> All checks passed</div>}</CardContent></Card>

          <Card><CardHeader><CardTitle>Preview</CardTitle></CardHeader><CardContent><pre className='max-h-[280px] overflow-auto rounded bg-muted p-3 text-xs'>{JSON.stringify(payload, null, 2)}</pre></CardContent></Card>
        </div>
      </div>
    </div>
  )
}
