import { type ReactNode, useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

type Severity = 'Normal' | 'Warning' | 'Critical'
type Vendor = 'Huawei' | 'Nokia' | 'Ericsson'
type ReportingDomain = 'CM' | 'PM' | 'License' | 'Inventory' | 'User Log'
type KpiVendor = 'NOKIA' | 'ERICSSON' | 'HUAWEI'
type KpiRow = [
  string,
  string,
  string,
  string,
  string,
  KpiVendor,
  Severity,
  string,
]

type CmParameter = {
  parameter: string
  target: string
  current: string
  previous: string
  changedBy: 'Script' | 'User' | 'Policy'
  command: string
}

type CounterImpact = {
  name: string
  direction: '↑' | '↓'
  note: string
}

type TimelineRow = {
  time: string
  actor: 'Script' | 'User' | 'Policy'
  source: 'CM' | 'Log' | 'Policy'
  command: string
  parameter: string
  beforeAfter: string
  counterImpact: string
}

type SuggestedFix = {
  targetId: string
  detectedIssue: string
  action: string
  confidence: string
  expectedOutcome: string
  parameter: string
  suggestedValue: string
}

type KpiDetails = {
  cmParameters: CmParameter[]
  counters: CounterImpact[]
  timeline: TimelineRow[]
  suggestions: SuggestedFix[]
}

type RawFileRow = {
  ingestionDateUtc: string
  fileCoverageUtc: string
  parserStatus: 'OK' | 'PARTIAL' | 'FAILED'
  extractedRecordCount: number
}

type RawExtractedRow = {
  recordTimeUtc: string
  networkEntityType: 'REGION' | 'SITE' | 'NODE' | 'CELL'
  vendorEntityId: string
  nativeObjectType: string
  nativeParameterName: string
  extractedValue: string
  measurementUnit: string
}

const severityClass: Record<Severity, string> = {
  Normal:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  Warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  Critical: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
}

const networkSummary = [
  { label: 'Network Health Score', value: '82 / 100' },
  { label: 'Cells with Active Violations', value: '1,342 (6.8%)' },
  { label: 'Regions Degraded', value: '2 / 8' },
  { label: 'Automated CM Changes (24h)', value: '417' },
  { label: 'Decisions Pending Approval', value: '19' },
]

const kpiTrendData = [
  { time: '00:00', dropRate: 0.62, throughput: 109, latency: 22 },
  { time: '04:00', dropRate: 0.66, throughput: 103, latency: 23 },
  { time: '08:00', dropRate: 0.74, throughput: 97, latency: 25 },
  { time: '12:00', dropRate: 0.82, throughput: 94, latency: 27 },
  { time: '16:00', dropRate: 0.86, throughput: 90, latency: 29 },
  { time: '20:00', dropRate: 0.79, throughput: 96, latency: 26 },
]

const violationTrendData = [
  { time: '00:00', critical: 518, warning: 574 },
  { time: '04:00', critical: 538, warning: 593 },
  { time: '08:00', critical: 566, warning: 620 },
  { time: '12:00', critical: 611, warning: 645 },
  { time: '16:00', critical: 633, warning: 662 },
  { time: '20:00', critical: 602, warning: 643 },
]

const kpiStatusRows: KpiRow[] = [
  [
    'Call Setup Success Rate',
    '2G',
    '99.42%',
    '99.30%',
    '+0.12%',
    'NOKIA',
    'Normal',
    '',
  ],
  [
    'Downlink Throughput',
    '4G',
    '92 Mbps',
    '105 Mbps',
    '-13 Mbps',
    'HUAWEI',
    'Warning',
    'Details',
  ],
  [
    'Cell Availability',
    '2G',
    '95.2%',
    '98.5%',
    '-3.3%',
    'NOKIA',
    'Critical',
    'Details',
  ],
  [
    'Handover Success Rate',
    '3G',
    '98.84%',
    '98.70%',
    '+0.14%',
    'ERICSSON',
    'Normal',
    '',
  ],
  [
    'Uplink Throughput',
    '5G',
    '38 Mbps',
    '45 Mbps',
    '-7 Mbps',
    'NOKIA',
    'Warning',
    'Details',
  ],
  [
    'Site Power Stability',
    'Core',
    '89.7%',
    '96.0%',
    '-6.3%',
    'ERICSSON',
    'Critical',
    'Details',
  ],
  [
    'Paging Success Rate',
    '4G',
    '99.12%',
    '98.95%',
    '+0.17%',
    'HUAWEI',
    'Normal',
    '',
  ],
  [
    'Average Latency',
    'Core',
    '29 ms',
    '24 ms',
    '+5 ms',
    'ERICSSON',
    'Warning',
    'Details',
  ],
  [
    'Backhaul Utilization',
    '5G',
    '93.0%',
    '80.0%',
    '+13.0%',
    'HUAWEI',
    'Critical',
    'Details',
  ],
  ['Packet Loss Rate', '5G', '0.46%', '0.55%', '-0.09%', 'NOKIA', 'Normal', ''],
  [
    'Jitter Index',
    '5G',
    '11 ms',
    '8 ms',
    '+3 ms',
    'HUAWEI',
    'Warning',
    'Details',
  ],
  [
    'S1 Signaling Success',
    '4G',
    '94.8%',
    '98.2%',
    '-3.4%',
    'NOKIA',
    'Critical',
    'Details',
  ],
  [
    'Core Session Success',
    'Core',
    '99.81%',
    '99.70%',
    '+0.11%',
    'ERICSSON',
    'Normal',
    '',
  ],
  [
    'Data Session Retainability',
    '4G',
    '98.21%',
    '98.80%',
    '-0.59%',
    'NOKIA',
    'Warning',
    'Details',
  ],
  [
    'X2 Handover Delay',
    '4G',
    '96 ms',
    '62 ms',
    '+34 ms',
    'ERICSSON',
    'Critical',
    'Details',
  ],
  [
    'VoLTE Setup SR',
    '4G',
    '98.76%',
    '98.60%',
    '+0.16%',
    'HUAWEI',
    'Normal',
    '',
  ],
  [
    'VoNR Call Drop Rate',
    '5G',
    '1.18%',
    '0.80%',
    '+0.38%',
    'ERICSSON',
    'Warning',
    'Details',
  ],
  [
    'VoIP MOS Score',
    'Core',
    '2.9',
    '3.8',
    '-0.9',
    'HUAWEI',
    'Critical',
    'Details',
  ],
  ['PRB Utilization', '5G', '63.4%', '65.0%', '-1.6%', 'NOKIA', 'Normal', ''],
  [
    'CSFB Success Rate',
    '3G',
    '97.42%',
    '98.00%',
    '-0.58%',
    'HUAWEI',
    'Warning',
    'Details',
  ],
  [
    'Emergency Call Setup Time',
    '3G',
    '6.3 s',
    '4.2 s',
    '+2.1 s',
    'NOKIA',
    'Critical',
    'Details',
  ],
  [
    'RRC Connection SR',
    '4G',
    '99.01%',
    '98.90%',
    '+0.11%',
    'ERICSSON',
    'Normal',
    '',
  ],
  [
    'Inter-RAT HO SR',
    '4G',
    '96.88%',
    '97.40%',
    '-0.52%',
    'NOKIA',
    'Warning',
    'Details',
  ],
  [
    'Radio Link Failure Rate',
    '5G',
    '2.6%',
    '1.2%',
    '+1.4%',
    'ERICSSON',
    'Critical',
    'Details',
  ],
  [
    'Core Attach Delay',
    'Core',
    '1.7 s',
    '1.3 s',
    '+0.4 s',
    'ERICSSON',
    'Warning',
    'Details',
  ],
  [
    'Congestion Minutes',
    '2G',
    '214 min',
    '120 min',
    '+94 min',
    'HUAWEI',
    'Critical',
    'Details',
  ],
  [
    'Bearer Setup Time',
    '4G',
    '122 ms',
    '105 ms',
    '+17 ms',
    'HUAWEI',
    'Warning',
    'Details',
  ],
  [
    'TCH Traffic Load',
    '2G',
    '81 Erlang',
    '62 Erlang',
    '+19 Erlang',
    'NOKIA',
    'Critical',
    'Details',
  ],
  [
    'Active UE Sessions',
    '4G',
    '18200 Sessions',
    '14000 Sessions',
    '+4200 Sessions',
    'ERICSSON',
    'Critical',
    'Details',
  ],
  [
    'Signaling Load Index',
    'Core',
    '74.5%',
    '58.0%',
    '+16.5%',
    'HUAWEI',
    'Critical',
    'Details',
  ],
]

function seededNumber(input: string) {
  return Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function parseValueWithUnit(value: string) {
  const match = value.match(/-?\d+(?:\.\d+)?/)
  if (!match) {
    return { value: 0, decimals: 0, unit: '' }
  }

  const numeric = Number(match[0])
  const decimals = (match[0].split('.')[1] ?? '').length
  const unit = value.replace(match[0], '').trim()

  return { value: numeric, decimals, unit }
}

function formatValue(value: number, decimals: number, unit: string) {
  const numberText = value.toFixed(decimals)

  return unit ? `${numberText} ${unit}`.replace(' %', '%') : numberText
}

function formatDelta(value: number, decimals: number, unit: string) {
  const sign = value >= 0 ? '+' : ''

  return `${sign}${formatValue(value, decimals, unit)}`
}

function generateKpiDetails(row: KpiRow): KpiDetails {
  const [kpiName, technology, currentValue, baselineValue, delta, vendor] = row
  const seed = seededNumber(kpiName)
  const parameterPool = [
    'MaxUE',
    'DLBW2',
    'HO_Threshold',
    'TxPower',
    'A3Offset',
    'QrxLevMin',
    'RachPreamble',
    'P0NominalPUSCH',
    'ULPowerControl',
    'CellReselectionPriority',
  ]
  const actors: Array<'Script' | 'User' | 'Policy'> = [
    'Script',
    'User',
    'Policy',
  ]
  const targets = ['Cell', 'Site', 'Node']

  const cmParameters = Array.from({ length: 5 }, (_, index) => {
    const parameter = parameterPool[(seed + index) % parameterPool.length]
    const previous = String(20 + ((seed + index * 7) % 45))
    const current = String(
      Number(previous) + (index % 2 === 0 ? 1 : -1) * ((seed % 4) + 1)
    )

    return {
      parameter,
      target: `${vendor}-${technology}-${targets[(seed + index) % targets.length]}-${100 + ((seed + index * 13) % 900)}`,
      current,
      previous,
      changedBy: actors[(seed + index) % actors.length],
      command: `set ${parameter} ${current}`,
    }
  })

  const counterPool = [
    'erabDropCount',
    'dlThroughputAvg',
    'ulThroughputAvg',
    'rrcConnEstabSucc',
    'rachFailRate',
    'handoverFailCount',
    'packetDelayAvg',
    'attachSuccessRate',
    'pagingDiscardCount',
    'radioLinkFailures',
  ]
  const counters = Array.from({ length: 8 }, (_, index) => {
    const name = counterPool[(seed + index) % counterPool.length]
    const direction: '↑' | '↓' = index % 2 === 0 ? '↑' : '↓'

    return {
      name,
      direction,
      note:
        direction === '↑'
          ? `Increase observed after ${cmParameters[index % 5].parameter}`
          : `Drop linked to ${cmParameters[index % 5].parameter} tuning`,
    }
  })

  const timeline = Array.from({ length: 8 }, (_, index) => {
    const parameter = cmParameters[index % cmParameters.length]
    const counterA = counters[index % counters.length]
    const counterB = counters[(index + 1) % counters.length]

    return {
      time: `09:${String(8 + index * 3).padStart(2, '0')}`,
      actor: actors[(seed + index) % actors.length],
      source: (['CM', 'Log', 'Policy'] as const)[(seed + index) % 3],
      command:
        index % 2 === 0 ? parameter.command : `validate ${parameter.parameter}`,
      parameter: parameter.parameter,
      beforeAfter: `${parameter.previous} → ${parameter.current}`,
      counterImpact: `${counterA.name} ${counterA.direction}, ${counterB.name} ${counterB.direction}`,
    }
  })

  const suggestions = cmParameters.slice(0, 4).map((parameter, index) => {
    const suggestedValue =
      index % 2 === 0
        ? parameter.previous
        : String((Number(parameter.previous) + Number(parameter.current)) / 2)

    return {
      targetId: parameter.target,
      detectedIssue: `${parameter.parameter} drift pushed ${kpiName}`,
      action: `Apply ${parameter.parameter} = ${suggestedValue}`,
      confidence: (0.74 + ((seed + index) % 18) / 100).toFixed(2),
      expectedOutcome: `${kpiName} moves toward baseline ${baselineValue}`,
      parameter: parameter.parameter,
      suggestedValue,
    }
  })

  timeline.push({
    time: '09:40',
    actor: 'Policy',
    source: 'Policy',
    command: `mark KPI ${kpiName} as degraded`,
    parameter: '-',
    beforeAfter: `${currentValue} vs ${baselineValue} (${delta})`,
    counterImpact: `${counters[0].name} ${counters[0].direction}`,
  })

  return { cmParameters, counters, timeline, suggestions }
}

const guardrailRows = [
  ['Nokia', 'Cell', 'MaxUE', 'Average', 'avg(14d)', '+15%', 'Region Helsinki'],
  ['Ericsson', 'Cell', 'DLBW2', 'Average', 'avg(30d)', '±10%', 'All'],
  ['Nokia', 'Cell', 'HO_Threshold', 'Manual', '-95', '±5', 'All'],
  ['Ericsson', 'Cell', 'Qoffset', 'Average', 'avg(30d)', '±10%', 'All'],
  ['Nokia', 'Cell', 'TxPower', 'Average', 'avg(14d)', '±8%', 'Region Tampere'],
]

const violationRows = [
  ['KFI-HEL-221', 'Nokia', 'MaxUE', 'avg', '+22%', '+22%', 'Critical'],
  ['KFI-HEL-305', 'Ericsson', 'DLBW2', 'avg', '-18%', '-18%', 'Warning'],
  ['KFI-TKU-114', 'Nokia', 'HO_Threshold', '-95', '-89', '+6', 'Warning'],
  ['KFI-HEL-402', 'Ericsson', 'Qoffset', 'avg', '+14%', '+14%', 'Warning'],
]

const cmTimelineRows = [
  ['09:10', 'Script', 'Auto-optimizer triggered'],
  ['09:14', 'CM', 'MaxUE +18%'],
  ['09:18', 'CM', 'DLBW2 -10%'],
  ['09:25', 'Log', 'Load imbalance detected'],
  ['09:32', 'CM', 'HO_Threshold -95 → -89'],
]

const beforeAfterRows = [
  ['Drop Rate', '0.58%', '0.96%'],
  ['Throughput', '108 Mbps', '79 Mbps'],
  ['Latency', '22 ms', '31 ms'],
  ['Handover SR', '99.1%', '98.4%'],
]

const decisionRows = [
  ['KFI-HEL-221', 'MaxUE overload', 'Restore avg baseline', '0.84'],
  ['KFI-HEL-305', 'Bandwidth drift', 'Rollback DLBW2', '0.79'],
  ['KFI-TKU-114', 'HO threshold shift', 'Restore baseline', '0.72'],
  ['KFI-TMP-087', 'TxPower imbalance', 'Normalize to avg', '0.81'],
]

const reportingDomains: ReportingDomain[] = [
  'CM',
  'PM',
  'License',
  'Inventory',
  'User Log',
]

const rawFiles: Record<ReportingDomain, Record<Vendor, RawFileRow[]>> = {
  CM: {
    Huawei: [
      {
        ingestionDateUtc: '2026-02-18 09:35',
        fileCoverageUtc: '09:00 → 09:30',
        parserStatus: 'OK',
        extractedRecordCount: 13224,
      },
    ],
    Nokia: [
      {
        ingestionDateUtc: '2026-02-18 09:36',
        fileCoverageUtc: '09:00 → 09:30',
        parserStatus: 'OK',
        extractedRecordCount: 15440,
      },
    ],
    Ericsson: [
      {
        ingestionDateUtc: '2026-02-18 09:37',
        fileCoverageUtc: '09:00 → 09:30',
        parserStatus: 'PARTIAL',
        extractedRecordCount: 12870,
      },
    ],
  },
  PM: {
    Huawei: [
      {
        ingestionDateUtc: '2026-02-18 09:31',
        fileCoverageUtc: '09:00 → 09:15',
        parserStatus: 'OK',
        extractedRecordCount: 22051,
      },
    ],
    Nokia: [
      {
        ingestionDateUtc: '2026-02-18 09:32',
        fileCoverageUtc: '09:00 → 09:15',
        parserStatus: 'OK',
        extractedRecordCount: 24812,
      },
    ],
    Ericsson: [
      {
        ingestionDateUtc: '2026-02-18 09:33',
        fileCoverageUtc: '09:00 → 09:15',
        parserStatus: 'OK',
        extractedRecordCount: 23990,
      },
    ],
  },
  License: { Huawei: [], Nokia: [], Ericsson: [] },
  Inventory: { Huawei: [], Nokia: [], Ericsson: [] },
  'User Log': { Huawei: [], Nokia: [], Ericsson: [] },
}

const rawRows: Record<ReportingDomain, Record<Vendor, RawExtractedRow[]>> = {
  CM: {
    Huawei: [
      {
        recordTimeUtc: '2026-02-18 09:14',
        networkEntityType: 'CELL',
        vendorEntityId: 'HFI-HEL-102',
        nativeObjectType: 'EUtranCellFDD',
        nativeParameterName: 'MaxUE',
        extractedValue: '121',
        measurementUnit: 'users',
      },
    ],
    Nokia: [
      {
        recordTimeUtc: '2026-02-18 09:14',
        networkEntityType: 'CELL',
        vendorEntityId: 'KFI-HEL-221',
        nativeObjectType: 'LNCEL',
        nativeParameterName: 'MaxUE',
        extractedValue: '+22%',
        measurementUnit: '%',
      },
      {
        recordTimeUtc: '2026-02-18 09:18',
        networkEntityType: 'CELL',
        vendorEntityId: 'KFI-TMP-087',
        nativeObjectType: 'LNCEL',
        nativeParameterName: 'TxPower',
        extractedValue: '-12%',
        measurementUnit: '%',
      },
    ],
    Ericsson: [
      {
        recordTimeUtc: '2026-02-18 09:18',
        networkEntityType: 'CELL',
        vendorEntityId: 'EFI-HEL-305',
        nativeObjectType: 'EUtranCellFDD',
        nativeParameterName: 'DLBW2',
        extractedValue: '-18%',
        measurementUnit: '%',
      },
    ],
  },
  PM: {
    Huawei: [],
    Nokia: [
      {
        recordTimeUtc: '2026-02-18 09:15',
        networkEntityType: 'REGION',
        vendorEntityId: 'Region Helsinki',
        nativeObjectType: 'KPI',
        nativeParameterName: 'Throughput',
        extractedValue: '78',
        measurementUnit: 'Mbps',
      },
    ],
    Ericsson: [],
  },
  License: { Huawei: [], Nokia: [], Ericsson: [] },
  Inventory: { Huawei: [], Nokia: [], Ericsson: [] },
  'User Log': { Huawei: [], Nokia: [], Ericsson: [] },
}

export function Dashboard() {
  const [kpiRows, setKpiRows] = useState<KpiRow[]>(kpiStatusRows)
  const [selectedStatuses, setSelectedStatuses] = useState<Severity[]>([
    'Normal',
    'Warning',
    'Critical',
  ])
  const [selectedVendors, setSelectedVendors] = useState<KpiVendor[]>([
    'HUAWEI',
    'NOKIA',
    'ERICSSON',
  ])

  const filteredKpiRows = useMemo(
    () =>
      kpiRows.filter(
        (row) =>
          selectedStatuses.includes(row[6]) && selectedVendors.includes(row[5])
      ),
    [kpiRows, selectedStatuses, selectedVendors]
  )

  const handleApplyKpiSuggestion = (kpiName: string) => {
    setKpiRows((previousRows) =>
      previousRows.map((row) => {
        if (row[0] !== kpiName) {
          return row
        }

        const current = parseValueWithUnit(row[2])
        const baseline = parseValueWithUnit(row[3])
        const nextCurrent =
          current.value + (baseline.value - current.value) * 0.35
        const nextCurrentText = formatValue(
          nextCurrent,
          current.decimals,
          current.unit || baseline.unit
        )
        const nextDeltaText = formatDelta(
          nextCurrent - baseline.value,
          Math.max(current.decimals, baseline.decimals),
          baseline.unit || current.unit
        )

        let nextStatus: Severity = row[6]
        if (row[6] === 'Critical') {
          nextStatus = 'Warning'
        } else if (
          row[6] === 'Warning' &&
          Math.abs(nextCurrent - baseline.value) <
            Math.abs(current.value - baseline.value) * 0.55
        ) {
          nextStatus = 'Normal'
        }

        return [
          row[0],
          row[1],
          nextCurrentText,
          row[3],
          nextDeltaText,
          row[5],
          nextStatus,
          nextStatus === 'Normal' ? '' : 'Details',
        ]
      })
    )

    toast.success('Change queued')
  }

  return (
    <>
      <Header>
        <div className='text-sm font-semibold tracking-wide text-muted-foreground'>
          ARVIX Network Solution
        </div>
        <div className='ms-auto flex items-center gap-3'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <MarqueeKeyframes />
        <AlarmMarquee rows={filteredKpiRows} />

        <Tabs defaultValue='overview' className='space-y-4'>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
              {networkSummary.map((metric) => (
                <Card key={metric.label}>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-medium text-muted-foreground'>
                      {metric.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{metric.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
              <ChartCard title='Network KPI Trends'>
                <ResponsiveContainer width='100%' height={280}>
                  <LineChart
                    data={kpiTrendData}
                    margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='time' />
                    <YAxis yAxisId='left' />
                    <YAxis yAxisId='right' orientation='right' />
                    <Tooltip />
                    <Legend
                      verticalAlign='top'
                      height={36}
                      wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
                    />
                    <Line
                      yAxisId='left'
                      type='monotone'
                      dataKey='dropRate'
                      name='Drop Rate (%)'
                      stroke='#ef4444'
                    />
                    <Line
                      yAxisId='right'
                      type='monotone'
                      dataKey='throughput'
                      name='Throughput (Mbps)'
                      stroke='#2563eb'
                    />
                    <Line
                      yAxisId='right'
                      type='monotone'
                      dataKey='latency'
                      name='Latency (ms)'
                      stroke='#10b981'
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title='Active Violations Over Time'>
                <ResponsiveContainer width='100%' height={280}>
                  <AreaChart data={violationTrendData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='time' />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type='monotone'
                      dataKey='critical'
                      stackId='1'
                      stroke='#f43f5e'
                      fill='#f43f5e'
                      name='Critical'
                    />
                    <Area
                      type='monotone'
                      dataKey='warning'
                      stackId='1'
                      stroke='#f59e0b'
                      fill='#f59e0b'
                      name='Warning'
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className='grid gap-4 lg:grid-cols-3'>
              <ChartCard title='Vendor Impact Split'>
                <ResponsiveContainer width='100%' height={240}>
                  <BarChart
                    data={[
                      { vendor: 'Nokia', share: 41 },
                      { vendor: 'Ericsson', share: 34 },
                      { vendor: 'Huawei', share: 25 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='vendor' />
                    <YAxis unit='%' />
                    <Tooltip />
                    <Bar dataKey='share' fill='#6366f1' radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <Card className='lg:col-span-2'>
                <CardHeader>
                  <CardTitle>Top Degraded Regions</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    headers={[
                      'Region Name',
                      'Affected Cells',
                      'Maximum Severity',
                    ]}
                    rows={[
                      ['Helsinki Metro', '412', 'Critical'],
                      ['Tampere', '188', 'Warning'],
                      ['Turku', '91', 'Warning'],
                      ['Oulu', '77', 'Warning'],
                      ['Lahti', '56', 'Critical'],
                    ]}
                    severityColumnIndex={2}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>KPI Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='mb-4 flex flex-wrap gap-2'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline'>
                        Status Filter ({selectedStatuses.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='start' className='w-56'>
                      <DropdownMenuLabel>Select Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {(['Normal', 'Warning', 'Critical'] as Severity[]).map(
                        (status) => (
                          <DropdownMenuCheckboxItem
                            key={status}
                            checked={selectedStatuses.includes(status)}
                            onCheckedChange={() =>
                              setSelectedStatuses((previous) =>
                                previous.includes(status)
                                  ? previous.filter((item) => item !== status)
                                  : [...previous, status]
                              )
                            }
                          >
                            {status}
                          </DropdownMenuCheckboxItem>
                        )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline'>
                        Vendor Filter ({selectedVendors.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='start' className='w-56'>
                      <DropdownMenuLabel>Select Vendor</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {[
                        { label: 'Huawei', value: 'HUAWEI' as const },
                        { label: 'Nokia', value: 'NOKIA' as const },
                        { label: 'Ericsson', value: 'ERICSSON' as const },
                      ].map((vendorOption) => (
                        <DropdownMenuCheckboxItem
                          key={vendorOption.value}
                          checked={selectedVendors.includes(vendorOption.value)}
                          onCheckedChange={() =>
                            setSelectedVendors((previous) =>
                              previous.includes(vendorOption.value)
                                ? previous.filter(
                                    (item) => item !== vendorOption.value
                                  )
                                : [...previous, vendorOption.value]
                            )
                          }
                        >
                          {vendorOption.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className='max-h-[520px] overflow-auto'>
                  <DataTable
                    headers={[
                      'KPI Name',
                      'Technology',
                      'Current Value',
                      'Baseline Value',
                      'Delta',
                      'Vendor',
                      'Health Status',
                      'Actions',
                    ]}
                    rows={filteredKpiRows}
                    severityColumnIndex={6}
                    actionColumnIndex={7}
                    expandableDetails
                    onApplySuggestion={handleApplyKpiSuggestion}
                    sortable
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='guardrails'>
            <Card>
              <CardHeader>
                <CardTitle>Guardrails – Baseline Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={[
                    'Vendor',
                    'Entity Level',
                    'Parameter Name',
                    'Baseline Method',
                    'Expected Baseline',
                    'Tolerance',
                    'Rule Scope',
                  ]}
                  rows={guardrailRows}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='violations'>
            <Card>
              <CardHeader>
                <CardTitle>Violations – Baseline Breaches</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={[
                    'Cell ID',
                    'Vendor',
                    'Parameter Name',
                    'Expected Value',
                    'Current Value',
                    'Deviation',
                    'Severity',
                  ]}
                  rows={violationRows}
                  severityColumnIndex={6}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='investigation' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>CM Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={['Event Time', 'Data Source', 'Change Description']}
                  rows={cmTimelineRows}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>KPI Before / After</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={['KPI Name', 'Before Change', 'After Change']}
                  rows={beforeAfterRows}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='decisions'>
            <Card>
              <CardHeader>
                <CardTitle>Decision Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={[
                    'Cell ID',
                    'Detected Issue',
                    'Suggested Action',
                    'Confidence Score',
                  ]}
                  rows={decisionRows}
                />
                <p className='mt-4 text-sm text-muted-foreground'>
                  Confidence logic (MVP): rule-based + historical similarity +
                  recency weighting.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='reporting'>
            <ReportingWorkspace />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

function ReportingWorkspace() {
  const [domain, setDomain] = useState<ReportingDomain>('CM')
  const [viewMode, setViewMode] = useState<'raw' | 'history'>('raw')
  const [vendor, setVendor] = useState<Vendor>('Nokia')

  const fileRows = rawFiles[domain][vendor]
  const extractedRows = rawRows[domain][vendor]

  const historyDataset = useMemo(() => {
    if (domain === 'CM') {
      return {
        headers: [
          'Change Time (UTC)',
          'Vendor',
          'Entity Type',
          'Entity ID',
          'Logical Parameter',
          'Old Value',
          'New Value',
        ],
        rows: [
          [
            '2026-02-18 09:14',
            'Nokia',
            'CELL',
            'KFI-HEL-221',
            'MaxUE',
            'avg',
            '+22%',
          ],
          [
            '2026-02-18 09:18',
            'Ericsson',
            'CELL',
            'KFI-HEL-305',
            'DLBW2',
            'avg',
            '-18%',
          ],
        ],
      }
    }

    if (domain === 'PM') {
      return {
        headers: [
          'KPI Time (UTC)',
          'Vendor',
          'Scope',
          'Scope ID',
          'KPI Name',
          'Current KPI Value',
          'Baseline',
          'Status',
        ],
        rows: [
          [
            '2026-02-18 09:15',
            'Nokia',
            'REGION',
            'Helsinki',
            'Throughput',
            '78 Mbps',
            '105 Mbps',
            'Critical',
          ],
          [
            '2026-02-18 09:15',
            'Ericsson',
            'NETWORK',
            'Finland',
            'Drop Rate',
            '0.82%',
            '0.60%',
            'Warning',
          ],
        ],
      }
    }

    if (domain === 'License') {
      return {
        headers: [
          'Snapshot Time (UTC)',
          'Vendor',
          'Node ID',
          'License Type',
          'Entitlement',
          'Used',
          'Utilization',
          'Risk Flag',
        ],
        rows: [
          [
            '2026-02-18 09:20',
            'Nokia',
            'NOD-HEL-01',
            '5G Carrier',
            '120',
            '112',
            '93%',
            'Warning',
          ],
          [
            '2026-02-18 09:20',
            'Ericsson',
            'NOD-TMP-03',
            'LTE Capacity',
            '95',
            '95',
            '100%',
            'Critical',
          ],
        ],
      }
    }

    if (domain === 'Inventory') {
      return {
        headers: [
          'Change Time (UTC)',
          'Vendor',
          'Node ID',
          'Changed Field',
          'Old Value',
          'New Value',
          'Lifecycle Status',
        ],
        rows: [
          [
            '2026-02-18 08:10',
            'Nokia',
            'NOD-HEL-01',
            'SW Version',
            '21B',
            '22A',
            'ACTIVE',
          ],
          [
            '2026-02-18 08:45',
            'Huawei',
            'NOD-TKU-12',
            'Board Type',
            'BBU3900',
            'BBU5900',
            'ACTIVE',
          ],
        ],
      }
    }

    return {
      headers: [
        'Event Time (UTC)',
        'Vendor',
        'User ID',
        'Action Type',
        'Target Type',
        'Target ID',
        'Execution Result',
      ],
      rows: [
        [
          '2026-02-18 09:10',
          'Ericsson',
          'op_hel_12',
          'MODIFY',
          'CELL',
          'KFI-HEL-221',
          'SUCCESS',
        ],
        [
          '2026-02-18 09:13',
          'Nokia',
          'op_tmp_04',
          'ROLLBACK',
          'CELL',
          'KFI-TMP-087',
          'SUCCESS',
        ],
      ],
    }
  }, [domain])

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Reporting Interface</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 lg:grid-cols-4'>
            <Select
              value={domain}
              onValueChange={(value) => setDomain(value as ReportingDomain)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportingDomains.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'raw' | 'history')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='raw'>Raw Data</SelectItem>
                <SelectItem value='history'>History (Normalized)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={vendor}
              onValueChange={(value) => setVendor(value as Vendor)}
              disabled={viewMode === 'history'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='Huawei'>Huawei</SelectItem>
                <SelectItem value='Nokia'>Nokia</SelectItem>
                <SelectItem value='Ericsson'>Ericsson</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue='50'>
              <SelectTrigger>
                <SelectValue placeholder='Page size' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='25'>25 rows</SelectItem>
                <SelectItem value='50'>50 rows</SelectItem>
                <SelectItem value='100'>100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AlarmMarquee rows={kpiRows} compact />

          <div className='flex flex-wrap gap-2'>
            <Button variant='outline'>Export CSV</Button>
            <Button variant='outline'>Export XLSX</Button>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'raw' ? (
        <div className='grid gap-4 xl:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>
                Raw File Registry — {domain} / {vendor}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                headers={[
                  'Ingestion Date (UTC)',
                  'File Coverage (UTC)',
                  'Parse Status',
                  'Extracted Record Count',
                  'File Actions',
                ]}
                rows={
                  fileRows.length > 0
                    ? fileRows.map((file) => [
                        file.ingestionDateUtc,
                        file.fileCoverageUtc,
                        file.parserStatus,
                        `${file.extractedRecordCount}`,
                        'View Payload / Download',
                      ])
                    : [['-', '-', '-', '-', 'No files in selected range']]
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Raw KV Index Rows — {domain} / {vendor}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                headers={[
                  'Record Time (UTC)',
                  'Entity Type',
                  'Entity ID (Native)',
                  'Object Type (Native)',
                  'Parameter Name (Native)',
                  'Extracted Value',
                  'Unit',
                  'Row Action',
                ]}
                rows={
                  extractedRows.length > 0
                    ? extractedRows.map((row) => [
                        row.recordTimeUtc,
                        row.networkEntityType,
                        row.vendorEntityId,
                        row.nativeObjectType,
                        row.nativeParameterName,
                        row.extractedValue,
                        row.measurementUnit,
                        'Open payload around row',
                      ])
                    : [
                        [
                          '-',
                          '-',
                          '-',
                          '-',
                          '-',
                          '-',
                          '-',
                          'No rows in selected filter',
                        ],
                      ]
                }
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{domain} History (Normalized)</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              headers={historyDataset.headers}
              rows={historyDataset.rows}
              severityColumnIndex={domain === 'PM' ? 7 : undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MarqueeKeyframes() {
  return (
    <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }`}</style>
  )
}

type AlertMarqueeItem = {
  kpiName: string
  status: 'Critical' | 'Warning'
  vendor: KpiVendor
  lastUpdated: string
  detail: string
}

function AlarmMarquee({
  rows,
  compact,
}: {
  rows: KpiRow[]
  compact?: boolean
}) {
  const alertItems = useMemo<AlertMarqueeItem[]>(
    () =>
      rows
        .filter((row) => row[6] === 'Critical' || row[6] === 'Warning')
        .map((row, index) => ({
          kpiName: row[0],
          status: row[6] as 'Critical' | 'Warning',
          vendor: row[5],
          lastUpdated: `${4 + ((index * 3) % 12)} min ago`,
          detail: `${row[1]} • Current ${row[2]} vs Baseline ${row[3]}`,
        })),
    [rows]
  )

  if (alertItems.length === 0) {
    return null
  }

  const firstRow = alertItems.slice(0, Math.ceil(alertItems.length / 2))
  const prioritizedItems = [...alertItems].sort((a, b) =>
    a.status === b.status
      ? a.kpiName.localeCompare(b.kpiName)
      : a.status === 'Critical'
        ? -1
        : 1
  )

  return (
    <div
      className={cn(
        compact ? '' : 'mb-4',
        'relative overflow-hidden rounded-lg border bg-card p-2'
      )}
    >
      <div className='mb-2 flex items-center justify-between px-2'>
        <div className='flex items-center gap-2 text-sm font-semibold tracking-wide'>
          <AlertTriangle className='size-4 text-amber-500' />
          ALARM
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button className='text-sm font-semibold text-black hover:text-black/80 dark:text-white dark:hover:text-white/80'>
              View all <ChevronRight className='inline size-4' />
            </button>
          </SheetTrigger>
          <SheetContent
            side='right'
            className='w-full border-slate-200 p-0 sm:max-w-2xl dark:border-white/10'
          >
            <SheetHeader className='border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-6 dark:border-white/10 dark:from-slate-900 dark:to-slate-950'>
              <SheetTitle className='text-left text-lg font-semibold tracking-wide text-slate-900 dark:text-white'>
                All Active KPI Alarms
              </SheetTitle>
              <p className='text-left text-sm text-slate-600 dark:text-slate-300'>
                Critical and warning KPIs from the dashboard table.
              </p>
            </SheetHeader>
            <div className='h-[calc(100vh-110px)] overflow-y-auto p-4 sm:p-6'>
              <div className='mb-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300'>
                <span className='rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'>
                  {
                    prioritizedItems.filter(
                      (item) => item.status === 'Critical'
                    ).length
                  }{' '}
                  Critical
                </span>
                <span className='rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'>
                  {
                    prioritizedItems.filter((item) => item.status === 'Warning')
                      .length
                  }{' '}
                  Warning
                </span>
              </div>
              <div className='space-y-3'>
                {prioritizedItems.map((item, index) => {
                  const isCritical = item.status === 'Critical'
                  return (
                    <article
                      key={`${item.kpiName}-${item.status}-${index}`}
                      className={cn(
                        'rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-slate-950/70',
                        isCritical
                          ? 'shadow-[inset_3px_0_0_0_#f43f5e]'
                          : 'shadow-[inset_3px_0_0_0_#f59e0b]'
                      )}
                    >
                      <div className='mb-1 flex items-center justify-between'>
                        <div className='flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white'>
                          <span
                            className={cn(
                              'inline-block size-2 rounded-full',
                              isCritical ? 'bg-rose-500' : 'bg-amber-400'
                            )}
                          />
                          {item.status}
                        </div>
                        <span className='text-xs text-slate-500 dark:text-slate-400'>
                          {item.lastUpdated}
                        </span>
                      </div>
                      <p className='text-base font-semibold text-slate-900 dark:text-white'>
                        {item.kpiName}
                      </p>
                      <p className='mt-1 text-sm text-slate-700 dark:text-slate-300'>
                        {item.vendor} • {item.detail}
                      </p>
                    </article>
                  )
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <MarqueeRow items={firstRow} />

      <div className='pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background' />
      <div className='pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background' />
    </div>
  )
}

function MarqueeRow({
  items,
  reverse,
}: {
  items: AlertMarqueeItem[]
  reverse?: boolean
}) {
  const orderedItems = reverse ? [...items].reverse() : items

  return (
    <div className='group relative flex overflow-hidden py-1'>
      <div
        className={cn(
          'flex min-w-max shrink-0 animate-[marquee_35s_linear_infinite] gap-3 pe-3 group-hover:[animation-play-state:paused]',
          reverse && '[animation-direction:reverse]'
        )}
      >
        {orderedItems.map((item) => (
          <AlertCard key={`${item.kpiName}-${item.status}`} item={item} />
        ))}
      </div>
      <div
        aria-hidden
        className={cn(
          'flex min-w-max shrink-0 animate-[marquee_35s_linear_infinite] gap-3 pe-3 group-hover:[animation-play-state:paused]',
          reverse && '[animation-direction:reverse]'
        )}
      >
        {orderedItems.map((item) => (
          <AlertCard key={`${item.kpiName}-${item.status}-dup`} item={item} />
        ))}
      </div>
    </div>
  )
}

function AlertCard({ item }: { item: AlertMarqueeItem }) {
  const isCritical = item.status === 'Critical'

  return (
    <article
      className={cn(
        'w-[320px] rounded-xl border border-slate-300 bg-[#f3f3f3] px-4 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-950/90 dark:text-white',
        isCritical
          ? 'shadow-[inset_3px_0_0_0_#f43f5e]'
          : 'shadow-[inset_3px_0_0_0_#f59e0b]'
      )}
    >
      <div className='mb-1 flex items-center justify-between text-sm'>
        <div className='flex items-center gap-2 font-semibold'>
          <span
            className={cn(
              'inline-block size-2 rounded-full',
              isCritical ? 'bg-rose-500' : 'bg-amber-400'
            )}
          />
          {item.status}
        </div>
        <span className='text-xs text-slate-700 dark:text-slate-400'>
          {item.lastUpdated}
        </span>
      </div>
      <p className='truncate text-base font-medium'>{item.kpiName}</p>
      <p className='truncate text-sm text-slate-800 dark:text-slate-300'>
        {item.vendor} • {item.detail}
      </p>
    </article>
  )
}

function ChartCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function DataTable({
  headers,
  rows,
  severityColumnIndex,
  actionColumnIndex,
  expandableDetails,
  onApplySuggestion,
  sortable,
}: {
  headers: string[]
  rows: string[][]
  severityColumnIndex?: number
  actionColumnIndex?: number
  expandableDetails?: boolean
  onApplySuggestion?: (kpiName: string) => void
  sortable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [selectedKpiKey, setSelectedKpiKey] = useState<string | null>(null)
  const [detailsByKpi, setDetailsByKpi] = useState<Record<string, KpiDetails>>(
    {}
  )

  const selectedRow = selectedKpiKey
    ? (rows.find((row) => row[0] === selectedKpiKey) as KpiRow | undefined)
    : undefined
  const selectedDetails = selectedRow
    ? (detailsByKpi[selectedRow[0]] ?? generateKpiDetails(selectedRow))
    : undefined

  const [sortByIndex, setSortByIndex] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const sortedRows = useMemo(() => {
    if (!sortable || sortByIndex === null) {
      return rows
    }

    const severityRank: Record<string, number> = {
      Normal: 1,
      Warning: 2,
      Critical: 3,
    }
    const sortableValue = (value: string) => {
      if (value in severityRank) {
        return severityRank[value]
      }

      const parsed = parseValueWithUnit(value)
      return /\d/.test(value) ? parsed.value : value.toLowerCase()
    }

    return [...rows].sort((a, b) => {
      const aValue = sortableValue(a[sortByIndex] ?? '')
      const bValue = sortableValue(b[sortByIndex] ?? '')
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortByIndex, sortDirection, sortable])

  const handleSort = (columnIndex: number) => {
    if (!sortable) return
    if (sortByIndex === columnIndex) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortByIndex(columnIndex)
    setSortDirection('asc')
  }

  const handleOpenDetails = (row: string[]) => {
    const typedRow = row as KpiRow

    setDetailsByKpi((previous) =>
      previous[typedRow[0]]
        ? previous
        : {
            ...previous,
            [typedRow[0]]: generateKpiDetails(typedRow),
          }
    )
    setSelectedKpiKey(typedRow[0])
    setOpen(true)
  }

  const handleApplySuggestion = (suggestion: SuggestedFix) => {
    if (!selectedRow || !selectedDetails) {
      return
    }

    onApplySuggestion?.(selectedRow[0])

    setDetailsByKpi((previous) => {
      const nextDetails =
        previous[selectedRow[0]] ?? generateKpiDetails(selectedRow)
      const updatedParameters = nextDetails.cmParameters.map((parameter) =>
        parameter.parameter === suggestion.parameter
          ? {
              ...parameter,
              previous: parameter.current,
              current: suggestion.suggestedValue,
              changedBy: 'User' as const,
              command: `apply ${suggestion.parameter} ${suggestion.suggestedValue}`,
            }
          : parameter
      )

      const nextTimeline: TimelineRow = {
        time: 'Now',
        actor: 'User',
        source: 'Policy',
        command: `Apply suggestion ${suggestion.action}`,
        parameter: suggestion.parameter,
        beforeAfter: `→ ${suggestion.suggestedValue}`,
        counterImpact: 'kpiRecoveryIndex ↑, erabDropCount ↓',
      }

      return {
        ...previous,
        [selectedRow[0]]: {
          ...nextDetails,
          cmParameters: updatedParameters,
          timeline: [...nextDetails.timeline, nextTimeline],
        },
      }
    })
  }

  return (
    <>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[760px] text-left text-sm'>
          <thead>
            <tr className='border-b'>
              {headers.map((header, index) => (
                <th key={header} className='px-3 py-2 text-xs font-medium'>
                  {sortable ? (
                    <button
                      type='button'
                      className='inline-flex items-center gap-2'
                      onClick={() => handleSort(index)}
                    >
                      <span>{header}</span>
                      <span className='text-[10px] text-muted-foreground/60'>
                        {sortByIndex === index
                          ? sortDirection === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </button>
                  ) : (
                    header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`} className='border-b'>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className='px-3 py-2'>
                    {cellIndex === severityColumnIndex &&
                    ['Normal', 'Warning', 'Critical'].includes(cell) ? (
                      <Badge
                        variant='secondary'
                        className={severityClass[cell as Severity]}
                      >
                        {cell}
                      </Badge>
                    ) : expandableDetails &&
                      cellIndex === actionColumnIndex &&
                      cell === 'Details' ? (
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleOpenDetails(row)}
                      >
                        Details
                      </Button>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className='w-full overflow-y-auto sm:max-w-[920px]'>
          {selectedRow && selectedDetails && (
            <div className='space-y-6'>
              <SheetHeader>
                <SheetTitle>KPI Details</SheetTitle>
              </SheetHeader>

              <Card>
                <CardHeader>
                  <CardTitle>KPI Overview</CardTitle>
                </CardHeader>
                <CardContent className='grid gap-2 sm:grid-cols-2'>
                  <div>
                    <span className='font-medium'>KPI Name:</span>{' '}
                    {selectedRow[0]}
                  </div>
                  <div>
                    <span className='font-medium'>Vendor:</span>{' '}
                    {selectedRow[5]}
                  </div>
                  <div>
                    <span className='font-medium'>Technology:</span>{' '}
                    {selectedRow[1]}
                  </div>
                  <div>
                    <span className='font-medium'>
                      Current / Baseline / Delta:
                    </span>{' '}
                    {selectedRow[2]} / {selectedRow[3]} / {selectedRow[4]}
                  </div>
                  <div className='sm:col-span-2'>
                    <span className='me-2 font-medium'>Health Status:</span>
                    <Badge
                      variant='secondary'
                      className={severityClass[selectedRow[6] as Severity]}
                    >
                      {selectedRow[6]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Related CM Parameters & Counters</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <div className='mb-2 font-medium'>A) CM Parameters</div>
                    <table className='w-full text-left text-sm'>
                      <thead>
                        <tr className='border-b'>
                          <th className='px-2 py-1'>Parameter</th>
                          <th className='px-2 py-1'>Scope Target</th>
                          <th className='px-2 py-1'>Current</th>
                          <th className='px-2 py-1'>Previous</th>
                          <th className='px-2 py-1'>Last changed by</th>
                          <th className='px-2 py-1'>Command</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetails.cmParameters.map((parameter) => (
                          <tr
                            key={`${parameter.parameter}-${parameter.target}`}
                            className='border-b'
                          >
                            <td className='px-2 py-1'>{parameter.parameter}</td>
                            <td className='px-2 py-1'>{parameter.target}</td>
                            <td className='px-2 py-1'>{parameter.current}</td>
                            <td className='px-2 py-1'>{parameter.previous}</td>
                            <td className='px-2 py-1'>{parameter.changedBy}</td>
                            <td className='px-2 py-1'>{parameter.command}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <div className='mb-2 font-medium'>B) Related Counters</div>
                    <table className='w-full text-left text-sm'>
                      <thead>
                        <tr className='border-b'>
                          <th className='px-2 py-1'>Counter</th>
                          <th className='px-2 py-1'>Impact</th>
                          <th className='px-2 py-1'>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetails.counters.map((counter) => (
                          <tr key={counter.name} className='border-b'>
                            <td className='px-2 py-1'>{counter.name}</td>
                            <td className='px-2 py-1'>{counter.direction}</td>
                            <td className='px-2 py-1'>{counter.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Change Timeline (Causal Chain)</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className='w-full text-left text-sm'>
                    <thead>
                      <tr className='border-b'>
                        <th className='px-2 py-1'>Time</th>
                        <th className='px-2 py-1'>Actor</th>
                        <th className='px-2 py-1'>Data Source</th>
                        <th className='px-2 py-1'>Command/Action</th>
                        <th className='px-2 py-1'>Parameter</th>
                        <th className='px-2 py-1'>Before → After</th>
                        <th className='px-2 py-1'>Counter Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetails.timeline.map((event, index) => (
                        <tr key={`${event.time}-${index}`} className='border-b'>
                          <td className='px-2 py-1'>{event.time}</td>
                          <td className='px-2 py-1'>{event.actor}</td>
                          <td className='px-2 py-1'>{event.source}</td>
                          <td className='px-2 py-1'>{event.command}</td>
                          <td className='px-2 py-1'>{event.parameter}</td>
                          <td className='px-2 py-1'>{event.beforeAfter}</td>
                          <td className='px-2 py-1'>{event.counterImpact}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Suggested Fix (Decision Suggestions)</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className='w-full text-left text-sm'>
                    <thead>
                      <tr className='border-b'>
                        <th className='px-2 py-1'>Target ID</th>
                        <th className='px-2 py-1'>Detected Issue</th>
                        <th className='px-2 py-1'>Suggested Action</th>
                        <th className='px-2 py-1'>Confidence</th>
                        <th className='px-2 py-1'>Expected Outcome</th>
                        <th className='px-2 py-1'>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetails.suggestions.map((suggestion) => (
                        <tr
                          key={`${suggestion.targetId}-${suggestion.parameter}`}
                          className='border-b'
                        >
                          <td className='px-2 py-1'>{suggestion.targetId}</td>
                          <td className='px-2 py-1'>
                            {suggestion.detectedIssue}
                          </td>
                          <td className='px-2 py-1'>{suggestion.action}</td>
                          <td className='px-2 py-1'>{suggestion.confidence}</td>
                          <td className='px-2 py-1'>
                            {suggestion.expectedOutcome}
                          </td>
                          <td className='px-2 py-1'>
                            <Button
                              size='sm'
                              onClick={() => handleApplySuggestion(suggestion)}
                            >
                              Apply Change
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
