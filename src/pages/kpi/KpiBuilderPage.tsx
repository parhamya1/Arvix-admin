import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, ChevronRight, Loader2, Plus, Save, Trash2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createKpi, deleteKpi, getKpi, listKpis, updateKpi } from '@/lib/kpiApi'

type Vendor = 'NOKIA' | 'ERICSSON' | 'HUAWEI'
type Tech = '2G' | '3G' | '4G' | '5G' | 'Core'
type Level = 'Cell' | 'Site' | 'Node' | 'BSC' | 'RNC' | 'NodeB' | 'eNodeB' | 'gNodeB'
type KpiType = 'Traffic' | 'Accessibility' | 'Retainability' | 'Mobility' | 'Availability' | 'Integrity'
type Aggregation = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT'
type ThresholdMode = 'range' | 'fixed'

type RuleOperator = '>=' | '<=' | '>' | '<' | 'between'

type WizardState = {
  basics: {
    name: string
    vendor: Vendor | ''
    technologies: Tech[]
  }
  scope: {
    level: Level | ''
  }
  targets: string[]
  kpiType: KpiType | ''
  counters: {
    selected: string[]
    reuseKpiId: string
    variables: Array<{ variableName: string; counterName: string }>
  }
  formula: {
    mode: 'preset' | 'structured'
    aggregation: Aggregation
    numeratorCounters: string[]
    denominatorCounters: string[]
    multiplier: string
  }
  thresholdsV2: {
    mode: ThresholdMode
    range: {
      success: { min: string; max: string }
      warning: { operator: RuleOperator; min: string; max: string; value: string }
      critical: { operator: RuleOperator; min: string; max: string; value: string }
    }
    fixed: {
      direction: 'higher-better' | 'lower-better'
      warning: string
      critical: string
    }
  }
  notes: string
}

type BuilderState = {
  metadata: {
    description: string
    category?: string
    vendor?: string
    tech?: string
    scope?: string
    level?: string
    technologies?: string[]
    kpiType?: string
  }
  mapping: {
    source: string
    numerator?: string
    denominator?: string
    additionalCounters?: string[]
    targets?: string[]
    counters?: string[]
    variables?: Array<{ variableName: string; counterName: string }>
    numeratorCounters?: string[]
    denominatorCounters?: string[]
  }
  formula: {
    expression: string
    type?: string
    mode?: 'preset' | 'structured'
    aggregation?: Aggregation
    multiplier?: string
  }
  thresholds: {
    warning: string
    critical: string
    direction?: 'higher-better' | 'lower-better'
    rules?: {
      warning: { operator: RuleOperator; value?: string; min?: string; max?: string }
      critical: { operator: RuleOperator; value?: string; min?: string; max?: string }
      success?: { operator: RuleOperator; value?: string; min?: string; max?: string }
    }
  }
  scope?: {
    level: string
    targets: string[]
  }
  type?: string
  counters?: string[]
  formulaV2?: WizardState['formula']
  thresholdsV2?: WizardState['thresholdsV2']
}

const steps = [
  'Basics',
  'Scope / Level',
  'Target Selection',
  'KPI Type',
  'Counters & Formula',
  'Thresholds',
  'Review & Save',
]

const vendorOptions: Vendor[] = ['NOKIA', 'ERICSSON', 'HUAWEI']
const techOptions: Tech[] = ['2G', '3G', '4G', '5G', 'Core']
const levelOptions: Level[] = ['Cell', 'Site', 'Node', 'BSC', 'RNC', 'NodeB', 'eNodeB', 'gNodeB']
const kpiTypeOptions: KpiType[] = ['Traffic', 'Accessibility', 'Retainability', 'Mobility', 'Availability', 'Integrity']

const counterLibrary: Record<KpiType, Record<Exclude<Tech, 'Core'> | 'Core', string[]>> = {
  Accessibility: {
    '2G': ['sdcchSeizureAtt', 'sdcchSeizureSucc', 'tchSeizureAtt', 'tchSeizureSucc', 'attachReq', 'attachSucc', 'cmServiceReq', 'cmServiceSucc', 'pagingAtt', 'pagingSucc'],
    '3G': ['rrcConnReq', 'rrcConnSucc', 'csRabEstabAtt', 'csRabEstabSucc', 'psRabEstabAtt', 'psRabEstabSucc', 'pagingAtt', 'pagingSucc', 'serviceReqAtt', 'serviceReqSucc'],
    '4G': ['rrcConnEstabAtt', 'rrcConnEstabSucc', 'erabEstabAtt', 'erabEstabSucc', 'pagingAtt', 'pagingSucc', 's1SetupAtt', 's1SetupSucc', 'nasAttachAtt', 'nasAttachSucc'],
    '5G': ['rrcResumeAtt', 'rrcResumeSucc', 'pduSessionEstabAtt', 'pduSessionEstabSucc', 'regAtt', 'regSucc', 'serviceReqAtt', 'serviceReqSucc', 'ranConnAtt', 'ranConnSucc'],
    Core: ['attachAttempt', 'attachSuccess', 'sessionCreateAttempt', 'sessionCreateSuccess', 'authAttempt', 'authSuccess', 'pagingAttempt', 'pagingSuccess', 'registrationAttempt', 'registrationSuccess'],
  },
  Mobility: {
    '2G': ['hoAtt', 'hoSucc', 'intraBtsHoAtt', 'intraBtsHoSucc', 'interBscHoAtt', 'interBscHoSucc', 'cellReselAtt', 'cellReselSucc', 'redirAtt', 'redirSucc'],
    '3G': ['softHoAtt', 'softHoSucc', 'hardHoAtt', 'hardHoSucc', 'interRatHoAtt', 'interRatHoSucc', 'cellUpdateAtt', 'cellUpdateSucc', 'redirAtt', 'redirSucc'],
    '4G': ['hoAtt', 'hoSucc', 'interRatHoAtt', 'interRatHoSucc', 'x2HoAtt', 'x2HoSucc', 's1HoAtt', 's1HoSucc', 'redirAtt', 'redirSucc'],
    '5G': ['nrHoAtt', 'nrHoSucc', 'xnHoAtt', 'xnHoSucc', 'ngHoAtt', 'ngHoSucc', 'interRatHoAtt', 'interRatHoSucc', 'sessionMoveAtt', 'sessionMoveSucc'],
    Core: ['mobilityRegUpdateAtt', 'mobilityRegUpdateSucc', 'amfRelocAtt', 'amfRelocSucc', 'smfRelocAtt', 'smfRelocSucc', 'policyUpdateAtt', 'policyUpdateSucc', 'locationUpdateAtt', 'locationUpdateSucc'],
  },
  Traffic: {
    '2G': ['tchTrafficErlang', 'gprsDataMb', 'edgeDataMb', 'activeUsers', 'usersMax', 'sessionCount', 'voiceMinutes', 'smsCount', 'psTrafficDlMb', 'psTrafficUlMb'],
    '3G': ['hsDataVolumeMb', 'hsThroughputAvg', 'usersAvg', 'usersMax', 'sessionCount', 'csTrafficErlang', 'psTrafficDlMb', 'psTrafficUlMb', 'voiceMinutes', 'smsCount'],
    '4G': ['dlDataVolumeMb', 'ulDataVolumeMb', 'dlThroughputAvg', 'ulThroughputAvg', 'prbUtilDlPct', 'prbUtilUlPct', 'erlangTraffic', 'usersAvg', 'usersMax', 'sessionCount'],
    '5G': ['nrDlDataVolumeMb', 'nrUlDataVolumeMb', 'nrDlThroughputAvg', 'nrUlThroughputAvg', 'prbUtilDlPct', 'prbUtilUlPct', 'usersAvg', 'usersMax', 'pduSessionCount', 'qosFlowCount'],
    Core: ['coreDlVolumeMb', 'coreUlVolumeMb', 'activeSessions', 'sessionCount', 'trafficPeakMbps', 'trafficAvgMbps', 'bearerCount', 'subscriberCount', 'voiceSessionCount', 'videoSessionCount'],
  },
  Retainability: {
    '2G': ['dropCount', 'dropRate', 'tchDropCount', 'sdcchDropCount', 'abnormalRelease', 'callReleaseFail', 'rlfCount', 'reestabAtt', 'reestabSucc', 'retainabilityScore'],
    '3G': ['dropCount', 'dropRate', 'csDropCount', 'psDropCount', 'abnormalRelease', 'rlfCount', 'rlfRate', 'reestabAtt', 'reestabSucc', 'retainabilityScore'],
    '4G': ['dropCount', 'dropRate', 'rlfCount', 'rlfRate', 'erabDropCount', 'erabDropRate', 'csDropCount', 'psDropCount', 'abnormalRelease', 'reestabSucc'],
    '5G': ['dropCount', 'dropRate', 'rlfCount', 'rlfRate', 'pduDropCount', 'pduDropRate', 'abnormalRelease', 'reestabAtt', 'reestabSucc', 'retainabilityScore'],
    Core: ['sessionDropCount', 'sessionDropRate', 'releaseAbnormal', 'bearerDropCount', 'bearerDropRate', 'pagingFailRelease', 'timeoutRelease', 'reconnectAtt', 'reconnectSucc', 'retainabilityScore'],
  },
  Availability: {
    '2G': ['cellAvailPct', 'nodeAvailPct', 'downtimeMin', 'outageCount', 'unavailTime', 'plannedOutageMin', 'unplannedOutageMin', 'alarmCount', 'criticalAlarmCount', 'availabilityScore'],
    '3G': ['cellAvailPct', 'nodeAvailPct', 'downtimeMin', 'outageCount', 'unavailTime', 'plannedOutageMin', 'unplannedOutageMin', 'alarmCount', 'criticalAlarmCount', 'availabilityScore'],
    '4G': ['cellAvailPct', 'nodeAvailPct', 'downtimeMin', 'outageCount', 'unavailTime', 'plannedOutageMin', 'unplannedOutageMin', 'alarmCount', 'criticalAlarmCount', 'availabilityScore'],
    '5G': ['cellAvailPct', 'nodeAvailPct', 'downtimeMin', 'outageCount', 'unavailTime', 'plannedOutageMin', 'unplannedOutageMin', 'alarmCount', 'criticalAlarmCount', 'availabilityScore'],
    Core: ['serviceAvailPct', 'nodeAvailPct', 'downtimeMin', 'outageCount', 'unavailTime', 'plannedOutageMin', 'unplannedOutageMin', 'alarmCount', 'criticalAlarmCount', 'availabilityScore'],
  },
  Integrity: {
    '2G': ['packetLossPct', 'latencyMs', 'jitterMs', 'retransPct', 'sinrAvg', 'rxLevAvg', 'rxQualAvg', 'ber', 'blerDl', 'blerUl'],
    '3G': ['packetLossPct', 'latencyMs', 'jitterMs', 'retransPct', 'ecNoAvg', 'rscpAvg', 'rsrqAvg', 'ber', 'blerDl', 'blerUl'],
    '4G': ['packetLossPct', 'latencyMs', 'jitterMs', 'retransPct', 'sinrAvg', 'rsrpAvg', 'rsrqAvg', 'ber', 'blerDl', 'blerUl'],
    '5G': ['packetLossPct', 'latencyMs', 'jitterMs', 'retransPct', 'sinrAvg', 'ssRsrpAvg', 'ssRsrqAvg', 'ber', 'blerDl', 'blerUl'],
    Core: ['packetLossPct', 'latencyMs', 'jitterMs', 'retransPct', 'tcpRetransPct', 'udpLossPct', 'serviceDelayMs', 'errorRate', 'protocolFailRate', 'integrityScore'],
  },
}

const defaultWizard: WizardState = {
  basics: { name: '', vendor: '', technologies: [] },
  scope: { level: '' },
  targets: [],
  kpiType: '',
  counters: { selected: [], reuseKpiId: '', variables: [] },
  formula: { mode: 'preset', aggregation: 'SUM', numeratorCounters: [], denominatorCounters: [], multiplier: '100' },
  thresholdsV2: {
    mode: 'range',
    range: {
      success: { min: '', max: '' },
      warning: { operator: 'between', min: '', max: '', value: '' },
      critical: { operator: 'between', min: '', max: '', value: '' },
    },
    fixed: { direction: 'higher-better', warning: '', critical: '' },
  },
  notes: '',
}

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return Math.abs(hash >>> 0)
}

function generateTargets(vendor: Vendor | '', techs: Tech[], level: Level | ''): string[] {
  if (!vendor || !level || techs.length === 0) return []
  const key = `${vendor}-${techs.sort().join('-')}-${level}`
  const seed = hashString(key)
  const count = 30
  const list: string[] = []
  const prefixes: Record<Level, string> = {
    Cell: 'SP',
    Site: 'EMDL',
    Node: 'EM',
    BSC: 'B',
    RNC: 'RNC',
    NodeB: 'NB',
    eNodeB: 'ENB_',
    gNodeB: 'GNB_',
  }
  const vendorCode = vendor.slice(0, 2)
  const techCode = techs.join('').replace(/[^0-9A-Za-z]/g, '').slice(0, 2) || 'TX'

  for (let i = 0; i < count; i += 1) {
    const value = (seed + i * 7919) % 999999
    if (level === 'Cell') list.push(`${prefixes[level]}${vendorCode}${techCode}${String(value).slice(0, 4)}A`)
    else if (level === 'Site') list.push(`${prefixes[level]}${String(value).slice(0, 4)}`)
    else if (level === 'Node') list.push(`${prefixes[level]}${String(value).slice(0, 4)}`)
    else if (level === 'BSC') list.push(`${prefixes[level]}${String(value).slice(0, 3)}${String.fromCharCode(65 + ((value + i) % 26))}`)
    else if (level === 'RNC') list.push(`${prefixes[level]}${String(value).slice(0, 3).padStart(3, '0')}`)
    else if (level === 'NodeB') list.push(`${prefixes[level]}${String(value).slice(0, 4).padStart(4, '0')}`)
    else if (level === 'eNodeB') list.push(`${prefixes[level]}${String(value).slice(0, 5).padStart(5, '0')}`)
    else list.push(`${prefixes[level]}${String(value).slice(0, 6).padStart(6, '0')}`)
  }

  return Array.from(new Set(list)).slice(0, 35)
}

function SearchableMulti({
  label,
  selected,
  options,
  onChange,
  placeholder,
}: {
  label: string
  selected: string[]
  options: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(selected)

  useEffect(() => {
    if (!open) setDraft(selected)
  }, [selected, open])

  const filtered = useMemo(() => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())), [options, search])

  const toggleDraft = (value: string) => {
    setDraft((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant='outline' className='w-full justify-between'>
            <span className='truncate'>{selected.length ? `${selected.length} selected` : placeholder}</span>
            <ChevronRight className='size-4 opacity-60' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[380px] p-3' align='start'>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search...' className='mb-2' />
          <ScrollArea className='h-56'>
            <div className='space-y-1'>
              {filtered.map((option) => (
                <Button key={option} variant={draft.includes(option) ? 'default' : 'ghost'} className='w-full justify-start' onClick={() => toggleDraft(option)}>
                  {option}
                </Button>
              ))}
            </div>
          </ScrollArea>
          <div className='mt-3 flex justify-end'>
            <Button size='sm' onClick={() => { onChange(draft); setOpen(false) }}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
      <div className='flex flex-wrap gap-2'>
        {selected.map((item) => (
          <Badge key={item} className='gap-2'>
            {item}
            <button type='button' onClick={() => onChange(selected.filter((v) => v !== item))}>×</button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

function SearchableSingle({ label, value, options, onChange, placeholder }: { label: string; value: string; options: string[]; onChange: (value: string) => void; placeholder: string }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!open) setDraft(value)
  }, [value, open])

  const filtered = useMemo(() => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())), [options, search])

  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant='outline' className='w-full justify-between'>
            <span className='truncate'>{value || placeholder}</span>
            <ChevronRight className='size-4 opacity-60' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[340px] p-3' align='start'>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search...' className='mb-2' />
          <ScrollArea className='h-52'>
            <div className='space-y-1'>
              {filtered.map((option) => (
                <Button key={option} variant={draft === option ? 'default' : 'ghost'} className='w-full justify-start' onClick={() => setDraft(option)}>
                  {option}
                </Button>
              ))}
            </div>
          </ScrollArea>
          <div className='mt-3 flex justify-end'>
            <Button size='sm' onClick={() => { onChange(draft); setOpen(false) }}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function KpiBuilderPage({ id }: { id?: string }) {
  const navigate = useNavigate()
  const isEditMode = Boolean(id)
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [savedAt, setSavedAt] = useState('')
  const [wizard, setWizard] = useState<WizardState>(defaultWizard)
  const [description, setDescription] = useState('')
  const [existingKpis, setExistingKpis] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    const loadExisting = async () => {
      const kpis = await listKpis()
      setExistingKpis(kpis.map((k) => ({ id: k.id, name: k.name })))
    }
    void loadExisting()
  }, [])

  useEffect(() => {
    if (!id) return
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await getKpi(id)
        if (!mounted) return
        setSavedAt(data.updatedAt)
        const payload = (data.payload || {}) as BuilderState
        const techs = payload.metadata?.technologies || (payload.metadata?.tech ? payload.metadata.tech.split(',').filter(Boolean) : [])
        const targets = payload.scope?.targets || payload.mapping?.targets || []
        setWizard((prev) => ({
          ...prev,
          basics: {
            name: data.name,
            vendor: ((payload.metadata?.vendor || '') as Vendor | '') || '',
            technologies: techs as Tech[],
          },
          scope: {
            level: ((payload.scope?.level || payload.metadata?.level || payload.metadata?.scope || '') as Level | '') || '',
          },
          targets,
          kpiType: ((payload.type || payload.metadata?.kpiType || payload.formula?.type || '') as KpiType | '') || '',
          counters: {
            selected: payload.counters || payload.mapping?.counters || payload.mapping?.additionalCounters || [],
            reuseKpiId: '',
            variables: payload.mapping?.variables || [],
          },
          formula: payload.formulaV2 || {
            mode: payload.formula?.mode || 'preset',
            aggregation: (payload.formula?.aggregation as Aggregation) || 'SUM',
            numeratorCounters: payload.mapping?.numeratorCounters || (payload.mapping?.numerator ? [payload.mapping.numerator] : []),
            denominatorCounters: payload.mapping?.denominatorCounters || (payload.mapping?.denominator ? [payload.mapping.denominator] : []),
            multiplier: payload.formula?.multiplier || '100',
          },
          thresholdsV2: payload.thresholdsV2 || {
            mode: payload.thresholds?.direction ? 'fixed' : 'range',
            range: {
              success: { min: '', max: '' },
              warning: { operator: 'between', min: '', max: payload.thresholds?.warning || '', value: payload.thresholds?.warning || '' },
              critical: { operator: 'between', min: '', max: payload.thresholds?.critical || '', value: payload.thresholds?.critical || '' },
            },
            fixed: {
              direction: payload.thresholds?.direction || 'higher-better',
              warning: payload.thresholds?.warning || '',
              critical: payload.thresholds?.critical || '',
            },
          },
          notes: payload.metadata?.description || '',
        }))
        setDescription(payload.metadata?.description || '')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load KPI')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [id])

  const targetOptions = useMemo(
    () => generateTargets(wizard.basics.vendor, wizard.basics.technologies, wizard.scope.level),
    [wizard.basics.vendor, wizard.basics.technologies, wizard.scope.level]
  )

  const counterOptions = useMemo(() => {
    if (!wizard.kpiType || !wizard.basics.technologies.length) return []
    const byType = counterLibrary[wizard.kpiType]
    const union = wizard.basics.technologies.flatMap((tech) => byType[tech] || [])
    return Array.from(new Set(union)).slice(0, 120)
  }, [wizard.kpiType, wizard.basics.technologies])

  const formulaPreview = useMemo(() => {
    if (wizard.formula.mode === 'preset') {
      return `${wizard.formula.aggregation}(${wizard.counters.selected.join(', ') || 'counter'})`
    }
    const n = wizard.formula.numeratorCounters.length ? wizard.formula.numeratorCounters.join(' + ') : 'A'
    const d = wizard.formula.denominatorCounters.length ? wizard.formula.denominatorCounters.join(' + ') : 'B'
    const k = wizard.formula.multiplier || '100'
    return `safeDivide((${n}), (${d})) * ${k}`
  }, [wizard])

  const stepValidations = useMemo(() => {
    return [
      wizard.basics.name.trim().length > 0 && !!wizard.basics.vendor && wizard.basics.technologies.length > 0,
      !!wizard.scope.level,
      wizard.targets.length >= 2,
      !!wizard.kpiType,
      wizard.counters.selected.length > 0,
      wizard.thresholdsV2.mode === 'range'
        ? ((wizard.thresholdsV2.range.warning.operator === 'between'
          ? !!wizard.thresholdsV2.range.warning.min && !!wizard.thresholdsV2.range.warning.max
          : !!wizard.thresholdsV2.range.warning.value) &&
          (wizard.thresholdsV2.range.critical.operator === 'between'
            ? !!wizard.thresholdsV2.range.critical.min && !!wizard.thresholdsV2.range.critical.max
            : !!wizard.thresholdsV2.range.critical.value))
        : !!wizard.thresholdsV2.fixed.warning && !!wizard.thresholdsV2.fixed.critical,
      true,
    ]
  }, [wizard])

  const completedStepCount = stepValidations.filter(Boolean).length

  const goNext = () => {
    if (!stepValidations[step]) return
    setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  const goBack = () => setStep((s) => Math.max(0, s - 1))

  const canGoToStep = (targetStep: number) => targetStep <= step || stepValidations.slice(0, targetStep).every(Boolean)

  const applyReuseKpi = async (reuseId: string) => {
    setWizard((prev) => ({ ...prev, counters: { ...prev.counters, reuseKpiId: reuseId } }))
    if (!reuseId) return
    const reuse = await getKpi(reuseId)
    const payload = reuse.payload as BuilderState
    const imported = payload.counters || payload.mapping?.counters || payload.mapping?.additionalCounters || []
    setWizard((prev) => ({
      ...prev,
      counters: {
        ...prev.counters,
        selected: Array.from(new Set([...prev.counters.selected, ...imported])),
      },
      formula: payload.formulaV2 ? payload.formulaV2 : prev.formula,
    }))
  }

  const save = async () => {
    if (!stepValidations.slice(0, 6).every(Boolean)) {
      toast.error('Please complete required fields')
      return
    }

    setIsSaving(true)
    const payload: BuilderState = {
      metadata: {
        description,
        vendor: wizard.basics.vendor,
        technologies: wizard.basics.technologies,
        tech: wizard.basics.technologies.join(','),
        scope: wizard.scope.level,
        level: wizard.scope.level,
        kpiType: wizard.kpiType,
      },
      mapping: {
        source: 'STATIC_MVP',
        numerator: wizard.formula.numeratorCounters[0] || wizard.counters.selected[0] || '',
        denominator: wizard.formula.denominatorCounters[0] || wizard.counters.selected[1] || '',
        additionalCounters: wizard.counters.selected,
        targets: wizard.targets,
        counters: wizard.counters.selected,
        variables: wizard.counters.variables,
        numeratorCounters: wizard.formula.numeratorCounters,
        denominatorCounters: wizard.formula.denominatorCounters,
      },
      formula: {
        expression: formulaPreview,
        type: wizard.kpiType,
        mode: wizard.formula.mode,
        aggregation: wizard.formula.aggregation,
        multiplier: wizard.formula.multiplier,
      },
      thresholds: {
        warning: wizard.thresholdsV2.mode === 'fixed' ? wizard.thresholdsV2.fixed.warning : (wizard.thresholdsV2.range.warning.value || wizard.thresholdsV2.range.warning.max || ''),
        critical: wizard.thresholdsV2.mode === 'fixed' ? wizard.thresholdsV2.fixed.critical : (wizard.thresholdsV2.range.critical.value || wizard.thresholdsV2.range.critical.max || ''),
        direction: wizard.thresholdsV2.fixed.direction,
        rules: {
          warning: {
            operator: wizard.thresholdsV2.range.warning.operator,
            value: wizard.thresholdsV2.range.warning.value,
            min: wizard.thresholdsV2.range.warning.min,
            max: wizard.thresholdsV2.range.warning.max,
          },
          critical: {
            operator: wizard.thresholdsV2.range.critical.operator,
            value: wizard.thresholdsV2.range.critical.value,
            min: wizard.thresholdsV2.range.critical.min,
            max: wizard.thresholdsV2.range.critical.max,
          },
          success: {
            operator: 'between',
            min: wizard.thresholdsV2.range.success.min,
            max: wizard.thresholdsV2.range.success.max,
          },
        },
      },
      scope: { level: wizard.scope.level || '', targets: wizard.targets },
      type: wizard.kpiType,
      counters: wizard.counters.selected,
      formulaV2: wizard.formula,
      thresholdsV2: wizard.thresholdsV2,
    }

    try {
      if (isEditMode && id) await updateKpi(id, { name: wizard.basics.name, payload: payload as Record<string, unknown> })
      else await createKpi({ name: wizard.basics.name, payload: payload as Record<string, unknown> })
      toast.success('KPI saved')
      void navigate({ to: '/kpi/list' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await deleteKpi(id)
      toast.success('Deleted')
      void navigate({ to: '/kpi/list' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) return <div className='p-6 text-muted-foreground'>Loading...</div>

  return (
    <div className='space-y-4 p-4'>
      <Card>
        <CardContent className='flex items-center justify-between p-4'>
          <div>
            <p className='text-xs text-muted-foreground'>KPI / Builder</p>
            <h1 className='text-2xl font-semibold'>KPI Builder Wizard</h1>
            {savedAt ? <p className='text-xs text-muted-foreground'>Last updated: {new Date(savedAt).toLocaleString()}</p> : null}
          </div>
          <div className='flex gap-2'>
            {isEditMode ? <Button variant='destructive' onClick={remove} disabled={isDeleting}>{isDeleting ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Trash2 className='mr-2 size-4' />}Delete</Button> : null}
            <Button onClick={save} disabled={isSaving}>{isSaving ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />}Save</Button>
          </div>
        </CardContent>
      </Card>

      <div className='md:hidden'>
        <Card>
          <CardContent className='p-4 space-y-2'>
            <div className='flex justify-between text-sm'><span>Progress</span><span>{completedStepCount}/{steps.length}</span></div>
            <div className='h-2 rounded bg-muted'><div className='h-2 rounded bg-primary' style={{ width: `${Math.round((completedStepCount / steps.length) * 100)}%` }} /></div>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 md:grid-cols-[260px_1fr]'>
        <Card className='hidden md:block h-fit sticky top-24'>
          <CardHeader><CardTitle className='text-base'>Steps</CardTitle></CardHeader>
          <CardContent className='space-y-2'>
            {steps.map((title, index) => {
              const done = stepValidations[index]
              const active = index === step
              return (
                <Button
                  key={title}
                  variant={active ? 'default' : 'ghost'}
                  className='w-full justify-start gap-2'
                  onClick={() => canGoToStep(index) && setStep(index)}
                  disabled={!canGoToStep(index)}
                >
                  {done ? <CheckCircle2 className='size-4' /> : <span className='size-4 rounded-full border text-[10px] flex items-center justify-center'>{index + 1}</span>}
                  <span className='truncate'>{title}</span>
                </Button>
              )
            })}
          </CardContent>
        </Card>

        <Card className='transition-all duration-200'>
          <CardHeader>
            <CardTitle>{steps[step]}</CardTitle>
            <CardDescription>Complete this step to continue.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            {step === 0 ? (
              <>
                <div className='space-y-2'>
                  <Label>KPI Name *</Label>
                  <Input value={wizard.basics.name} onChange={(e) => setWizard((prev) => ({ ...prev, basics: { ...prev.basics, name: e.target.value } }))} />
                </div>
                <SearchableSingle
                  label='Vendor *'
                  value={wizard.basics.vendor}
                  options={vendorOptions}
                  onChange={(value) => setWizard((prev) => ({ ...prev, basics: { ...prev.basics, vendor: value as Vendor } }))}
                  placeholder='Select vendor'
                />
                <SearchableMulti
                  label='Technology *'
                  selected={wizard.basics.technologies}
                  options={techOptions}
                  onChange={(next) => setWizard((prev) => ({ ...prev, basics: { ...prev.basics, technologies: next as Tech[] } }))}
                  placeholder='Select technologies'
                />
              </>
            ) : null}

            {step === 1 ? (
              <div className='space-y-2'>
                <Label>Level *</Label>
                <Select value={wizard.scope.level} onValueChange={(value) => setWizard((prev) => ({ ...prev, scope: { level: value as Level }, targets: [] }))}>
                  <SelectTrigger><SelectValue placeholder='Select level' /></SelectTrigger>
                  <SelectContent>{levelOptions.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : null}

            {step === 2 ? (
              <SearchableMulti
                label='Targets * (min 2)'
                selected={wizard.targets}
                options={targetOptions}
                onChange={(next) => setWizard((prev) => ({ ...prev, targets: next }))}
                placeholder='Select targets'
              />
            ) : null}

            {step === 3 ? (
              <SearchableSingle
                label='KPI Type *'
                value={wizard.kpiType}
                options={kpiTypeOptions}
                onChange={(value) => setWizard((prev) => ({ ...prev, kpiType: value as KpiType, counters: { ...prev.counters, selected: [] } }))}
                placeholder='Select KPI type'
              />
            ) : null}

            {step === 4 ? (
              <>
                <SearchableMulti
                  label='Counters *'
                  selected={wizard.counters.selected}
                  options={counterOptions}
                  onChange={(next) => setWizard((prev) => ({ ...prev, counters: { ...prev.counters, selected: next } }))}
                  placeholder='Select counters'
                />

                <div className='space-y-2'>
                  <Label>Reuse Existing KPI (optional)</Label>
                  <Select value={wizard.counters.reuseKpiId || 'none'} onValueChange={(value) => void applyReuseKpi(value === 'none' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder='Select KPI to reuse' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>None</SelectItem>
                      {existingKpis.filter((k) => k.id !== id).map((kpi) => <SelectItem key={kpi.id} value={kpi.id}>{kpi.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label>Formula Mode</Label>
                  <div className='flex gap-2'>
                    <Button variant={wizard.formula.mode === 'preset' ? 'default' : 'outline'} onClick={() => setWizard((p) => ({ ...p, formula: { ...p.formula, mode: 'preset' } }))}>Preset</Button>
                    <Button variant={wizard.formula.mode === 'structured' ? 'default' : 'outline'} onClick={() => setWizard((p) => ({ ...p, formula: { ...p.formula, mode: 'structured' } }))}>Structured</Button>
                  </div>
                </div>

                {wizard.formula.mode === 'preset' ? (
                  <div className='space-y-2'>
                    <Label>Aggregation</Label>
                    <Select value={wizard.formula.aggregation} onValueChange={(value) => setWizard((prev) => ({ ...prev, formula: { ...prev.formula, aggregation: value as Aggregation } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['SUM', 'AVG', 'MIN', 'MAX', 'COUNT'].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <SearchableMulti label='Numerator expression counters' selected={wizard.formula.numeratorCounters} options={wizard.counters.selected} onChange={(next) => setWizard((prev) => ({ ...prev, formula: { ...prev.formula, numeratorCounters: next } }))} placeholder='Select numerator counters' />
                    <SearchableMulti label='Denominator expression counters' selected={wizard.formula.denominatorCounters} options={wizard.counters.selected} onChange={(next) => setWizard((prev) => ({ ...prev, formula: { ...prev.formula, denominatorCounters: next } }))} placeholder='Select denominator counters' />
                    <div className='space-y-2'>
                      <Label>Multiplier</Label>
                      <Input value={wizard.formula.multiplier} onChange={(e) => setWizard((prev) => ({ ...prev, formula: { ...prev.formula, multiplier: e.target.value } }))} />
                    </div>
                  </>
                )}

                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label>Counter Variables (optional)</Label>
                    <Button variant='outline' size='sm' onClick={() => setWizard((prev) => ({ ...prev, counters: { ...prev.counters, variables: [...prev.counters.variables, { variableName: '', counterName: '' }] } }))}><Plus className='size-4 mr-1' />Add</Button>
                  </div>
                  {wizard.counters.variables.map((variable, idx) => (
                    <div key={`${idx}-${variable.variableName}`} className='grid gap-2 md:grid-cols-2'>
                      <Input placeholder='variableName' value={variable.variableName} onChange={(e) => setWizard((prev) => { const next = [...prev.counters.variables]; next[idx] = { ...next[idx], variableName: e.target.value }; return { ...prev, counters: { ...prev.counters, variables: next } } })} />
                      <SearchableSingle label='counterName' value={variable.counterName} options={wizard.counters.selected} onChange={(v) => setWizard((prev) => { const next = [...prev.counters.variables]; next[idx] = { ...next[idx], counterName: v }; return { ...prev, counters: { ...prev.counters, variables: next } } })} placeholder='Select counter' />
                    </div>
                  ))}
                </div>

                <div className='rounded-md border p-3 text-sm text-muted-foreground'>Formula preview: <span className='font-medium text-foreground'>{formulaPreview}</span></div>
              </>
            ) : null}

            {step === 5 ? (
              <>
                <div className='flex items-center gap-2'>
                  <Switch checked={wizard.thresholdsV2.mode === 'fixed'} onCheckedChange={(checked) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, mode: checked ? 'fixed' : 'range' } }))} />
                  <Label>Use fixed thresholds</Label>
                </div>

                {wizard.thresholdsV2.mode === 'range' ? (
                  <div className='space-y-4'>
                    <div className='grid gap-3 md:grid-cols-2'>
                      <Input placeholder='Success min (optional)' value={wizard.thresholdsV2.range.success.min} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, success: { ...prev.thresholdsV2.range.success, min: e.target.value } } } }))} />
                      <Input placeholder='Success max (optional)' value={wizard.thresholdsV2.range.success.max} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, success: { ...prev.thresholdsV2.range.success, max: e.target.value } } } }))} />
                    </div>
                    <div className='rounded h-3 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500' />

                    <div className='grid gap-2 md:grid-cols-4'>
                      <Select value={wizard.thresholdsV2.range.warning.operator} onValueChange={(value) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, warning: { ...prev.thresholdsV2.range.warning, operator: value as RuleOperator } } } }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{['>=', '<=', '>', '<', 'between'].map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
                      </Select>
                      {wizard.thresholdsV2.range.warning.operator === 'between' ? <><Input placeholder='Warning min' value={wizard.thresholdsV2.range.warning.min} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, warning: { ...prev.thresholdsV2.range.warning, min: e.target.value } } } }))} /><Input placeholder='Warning max' value={wizard.thresholdsV2.range.warning.max} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, warning: { ...prev.thresholdsV2.range.warning, max: e.target.value } } } }))} /></> : <Input placeholder='Warning value' value={wizard.thresholdsV2.range.warning.value} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, warning: { ...prev.thresholdsV2.range.warning, value: e.target.value } } } }))} />}
                    </div>

                    <div className='grid gap-2 md:grid-cols-4'>
                      <Select value={wizard.thresholdsV2.range.critical.operator} onValueChange={(value) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, critical: { ...prev.thresholdsV2.range.critical, operator: value as RuleOperator } } } }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{['>=', '<=', '>', '<', 'between'].map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
                      </Select>
                      {wizard.thresholdsV2.range.critical.operator === 'between' ? <><Input placeholder='Critical min' value={wizard.thresholdsV2.range.critical.min} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, critical: { ...prev.thresholdsV2.range.critical, min: e.target.value } } } }))} /><Input placeholder='Critical max' value={wizard.thresholdsV2.range.critical.max} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, critical: { ...prev.thresholdsV2.range.critical, max: e.target.value } } } }))} /></> : <Input placeholder='Critical value' value={wizard.thresholdsV2.range.critical.value} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, range: { ...prev.thresholdsV2.range, critical: { ...prev.thresholdsV2.range.critical, value: e.target.value } } } }))} />}
                    </div>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    <Select value={wizard.thresholdsV2.fixed.direction} onValueChange={(value) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, fixed: { ...prev.thresholdsV2.fixed, direction: value as 'higher-better' | 'lower-better' } } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value='higher-better'>Higher is better</SelectItem><SelectItem value='lower-better'>Lower is better</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder='Warning threshold' value={wizard.thresholdsV2.fixed.warning} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, fixed: { ...prev.thresholdsV2.fixed, warning: e.target.value } } }))} />
                    <Input placeholder='Critical threshold' value={wizard.thresholdsV2.fixed.critical} onChange={(e) => setWizard((prev) => ({ ...prev, thresholdsV2: { ...prev.thresholdsV2, fixed: { ...prev.thresholdsV2.fixed, critical: e.target.value } } }))} />
                  </div>
                )}
              </>
            ) : null}

            {step === 6 ? (
              <div className='space-y-3'>
                <div className='grid gap-2 md:grid-cols-2'>
                  <Card><CardContent className='p-3 text-sm space-y-1'><p><b>KPI Name:</b> {wizard.basics.name}</p><p><b>Vendor:</b> {wizard.basics.vendor}</p><p><b>Technologies:</b> {wizard.basics.technologies.join(', ')}</p><p><b>Level:</b> {wizard.scope.level}</p></CardContent></Card>
                  <Card><CardContent className='p-3 text-sm space-y-1'><p><b>Targets:</b> {wizard.targets.length}</p><p><b>KPI Type:</b> {wizard.kpiType}</p><p><b>Counters:</b> {wizard.counters.selected.length}</p><p><b>Formula mode:</b> {wizard.formula.mode}</p><p><b>Threshold mode:</b> {wizard.thresholdsV2.mode}</p></CardContent></Card>
                </div>
                <div className='space-y-2'>
                  <Label>Description / Notes</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <Card>
                  <CardContent className='p-3'>
                    {stepValidations.slice(0, 6).every(Boolean) ? <p className='text-emerald-600 text-sm'>All validations passed. Ready to save.</p> : <p className='text-amber-600 text-sm'>Some required fields are missing in previous steps.</p>}
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <Separator />

            <div className='flex items-center justify-between'>
              <Button variant='outline' onClick={goBack} disabled={step === 0}>Back</Button>
              {step < steps.length - 1 ? <Button onClick={goNext} disabled={!stepValidations[step]}>Next</Button> : <Button onClick={save} disabled={isSaving || !stepValidations.slice(0, 6).every(Boolean)}>{isSaving ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}Save KPI</Button>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
