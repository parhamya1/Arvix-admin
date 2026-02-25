import { useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Siren, TriangleAlert } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Severity = 'Normal' | 'Warning' | 'Critical'

type Suggestion = {
  cellId: string
  issue: string
  action: string
  confidence: number
}

type KPIRecord = {
  id: string
  name: string
  scope: string
  unit: '%' | 'Mbps' | 'ms' | 'score'
  current: number
  baseline: number
  status: Severity
  marker?: { x: number; y: number; siteId: string }
  events?: Array<{ time: string; source: string; description: string }>
  beforeAfter?: Array<{ kpi: string; before: string; after: string }>
  suggestions?: Suggestion[]
}

const severityStyles: Record<Severity, string> = {
  Normal:
    'border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-300',
  Warning:
    'border-amber-500/35 bg-amber-500/15 text-amber-700 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-300',
  Critical:
    'border-rose-500/35 bg-rose-500/15 text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/10 dark:text-rose-300',
}

const sharedDetails = {
  events: [
    { time: '09:10', source: 'Script', description: 'Auto-optimizer triggered' },
    { time: '09:14', source: 'CM', description: 'MaxUE +18%' },
    { time: '09:18', source: 'CM', description: 'DLBW2 -10%' },
    { time: '09:25', source: 'Log', description: 'Load imbalance detected' },
    { time: '09:32', source: 'CM', description: 'HO_Threshold -95 → -89' },
  ],
  beforeAfter: [
    { kpi: 'Drop Rate', before: '0.58%', after: '0.96%' },
    { kpi: 'Throughput', before: '108 Mbps', after: '79 Mbps' },
    { kpi: 'Latency', before: '22 ms', after: '31 ms' },
    { kpi: 'Handover SR', before: '99.1%', after: '98.4%' },
  ],
  suggestions: [
    { cellId: 'KFI-HEL-221', issue: 'MaxUE overload', action: 'Restore avg baseline', confidence: 0.84 },
    { cellId: 'KFI-HEL-305', issue: 'Bandwidth drift', action: 'Rollback DLBW2', confidence: 0.79 },
    { cellId: 'KFI-TKU-114', issue: 'HO threshold shift', action: 'Restore baseline', confidence: 0.72 },
    { cellId: 'KFI-TMP-087', issue: 'TxPower imbalance', action: 'Normalize to avg', confidence: 0.81 },
  ],
}

const initialKpis: KPIRecord[] = [
  { id: 'k1', name: 'Drop Rate', scope: 'Network', unit: '%', current: 0.82, baseline: 0.6, status: 'Warning', marker: { x: 52, y: 30, siteId: 'KFI-NET-001' }, ...sharedDetails },
  { id: 'k2', name: 'Throughput', scope: 'Network', unit: 'Mbps', current: 94, baseline: 110, status: 'Warning', marker: { x: 46, y: 37, siteId: 'KFI-NET-017' }, ...sharedDetails },
  { id: 'k3', name: 'Latency', scope: 'Network', unit: 'ms', current: 27, baseline: 22, status: 'Warning', marker: { x: 60, y: 42, siteId: 'KFI-NET-025' }, ...sharedDetails },
  { id: 'k4', name: 'Call Setup SR', scope: 'Network', unit: '%', current: 99.43, baseline: 99.3, status: 'Normal' },
  { id: 'k5', name: 'Handover SR', scope: 'Network', unit: '%', current: 99.1, baseline: 99.0, status: 'Normal' },
  { id: 'k6', name: 'Packet Loss', scope: 'Network', unit: '%', current: 0.22, baseline: 0.18, status: 'Warning', marker: { x: 63, y: 51, siteId: 'KFI-NET-035' }, ...sharedDetails },
  { id: 'k7', name: 'Drop Rate', scope: 'Region Helsinki', unit: '%', current: 0.95, baseline: 0.6, status: 'Warning', marker: { x: 58, y: 28, siteId: 'KFI-HEL-221' }, ...sharedDetails },
  { id: 'k8', name: 'Throughput', scope: 'Region Helsinki', unit: 'Mbps', current: 78, baseline: 105, status: 'Critical', marker: { x: 55, y: 24, siteId: 'KFI-HEL-305' }, ...sharedDetails },
  { id: 'k9', name: 'Latency', scope: 'Region Helsinki', unit: 'ms', current: 31, baseline: 22, status: 'Critical', marker: { x: 62, y: 26, siteId: 'KFI-HEL-188' }, ...sharedDetails },
  { id: 'k10', name: 'RRC Setup SR', scope: 'Region Helsinki', unit: '%', current: 98.7, baseline: 99.2, status: 'Warning', marker: { x: 57, y: 33, siteId: 'KFI-HEL-411' }, ...sharedDetails },
  { id: 'k11', name: 'UL Interference', scope: 'Region Tampere', unit: 'score', current: 71, baseline: 55, status: 'Critical', marker: { x: 49, y: 43, siteId: 'KFI-TMP-087' }, ...sharedDetails },
  { id: 'k12', name: 'Throughput', scope: 'Region Tampere', unit: 'Mbps', current: 86, baseline: 109, status: 'Critical', marker: { x: 50, y: 46, siteId: 'KFI-TMP-133' }, ...sharedDetails },
  { id: 'k13', name: 'Latency', scope: 'Region Tampere', unit: 'ms', current: 29, baseline: 21, status: 'Warning', marker: { x: 46, y: 49, siteId: 'KFI-TMP-214' }, ...sharedDetails },
  { id: 'k14', name: 'Drop Rate', scope: 'Region Tampere', unit: '%', current: 1.21, baseline: 0.64, status: 'Critical', marker: { x: 53, y: 41, siteId: 'KFI-TMP-404' }, ...sharedDetails },
  { id: 'k15', name: 'Handover Failure', scope: 'Region Turku', unit: '%', current: 2.7, baseline: 1.1, status: 'Critical', marker: { x: 40, y: 55, siteId: 'KFI-TKU-114' }, ...sharedDetails },
  { id: 'k16', name: 'Latency', scope: 'Region Turku', unit: 'ms', current: 30, baseline: 23, status: 'Warning', marker: { x: 38, y: 58, siteId: 'KFI-TKU-209' }, ...sharedDetails },
  { id: 'k17', name: 'DL PRB Utilization', scope: 'Region Turku', unit: '%', current: 88, baseline: 72, status: 'Critical', marker: { x: 43, y: 61, siteId: 'KFI-TKU-310' }, ...sharedDetails },
  { id: 'k18', name: 'CQI Score', scope: 'Region Turku', unit: 'score', current: 45, baseline: 62, status: 'Critical', marker: { x: 35, y: 63, siteId: 'KFI-TKU-418' }, ...sharedDetails },
  { id: 'k19', name: 'VoLTE MOS', scope: 'Region Oulu', unit: 'score', current: 3.6, baseline: 3.8, status: 'Warning', marker: { x: 62, y: 13, siteId: 'KFI-OUL-021' }, ...sharedDetails },
  { id: 'k20', name: 'Drop Rate', scope: 'Region Oulu', unit: '%', current: 1.02, baseline: 0.58, status: 'Critical', marker: { x: 67, y: 16, siteId: 'KFI-OUL-099' }, ...sharedDetails },
  { id: 'k21', name: 'Throughput', scope: 'Region Oulu', unit: 'Mbps', current: 80, baseline: 104, status: 'Critical', marker: { x: 71, y: 11, siteId: 'KFI-OUL-210' }, ...sharedDetails },
  { id: 'k22', name: 'Latency', scope: 'Region Oulu', unit: 'ms', current: 26, baseline: 22, status: 'Warning', marker: { x: 59, y: 19, siteId: 'KFI-OUL-344' }, ...sharedDetails },
  { id: 'k23', name: 'Site Availability', scope: 'Region Helsinki', unit: '%', current: 99.41, baseline: 99.3, status: 'Normal' },
  { id: 'k24', name: 'Site Availability', scope: 'Region Tampere', unit: '%', current: 99.33, baseline: 99.2, status: 'Normal' },
  { id: 'k25', name: 'Site Availability', scope: 'Region Turku', unit: '%', current: 99.37, baseline: 99.2, status: 'Normal' },
  { id: 'k26', name: 'RACH Success', scope: 'Network', unit: '%', current: 98.7, baseline: 99.1, status: 'Warning', marker: { x: 51, y: 35, siteId: 'KFI-NET-550' }, ...sharedDetails },
  { id: 'k27', name: 'S1 Setup Failure', scope: 'Network', unit: '%', current: 1.4, baseline: 0.5, status: 'Critical', marker: { x: 57, y: 48, siteId: 'KFI-NET-602' }, ...sharedDetails },
  { id: 'k28', name: 'CPU Load', scope: 'Region Helsinki', unit: '%', current: 72, baseline: 58, status: 'Critical', marker: { x: 61, y: 30, siteId: 'KFI-HEL-612' }, ...sharedDetails },
  { id: 'k29', name: 'Backhaul Jitter', scope: 'Region Tampere', unit: 'ms', current: 14, baseline: 8, status: 'Warning', marker: { x: 47, y: 52, siteId: 'KFI-TMP-618' }, ...sharedDetails },
  { id: 'k30', name: 'Energy Efficiency', scope: 'Network', unit: 'score', current: 87, baseline: 86, status: 'Normal' },
]

const trendData = [
  { time: '00:00', dropRate: 0.62, throughput: 109, latency: 22 },
  { time: '04:00', dropRate: 0.66, throughput: 103, latency: 23 },
  { time: '08:00', dropRate: 0.74, throughput: 97, latency: 25 },
  { time: '12:00', dropRate: 0.82, throughput: 94, latency: 27 },
  { time: '16:00', dropRate: 0.86, throughput: 90, latency: 29 },
  { time: '20:00', dropRate: 0.79, throughput: 96, latency: 26 },
]

const violationData = [
  { time: '00:00', critical: 518, warning: 574 },
  { time: '04:00', critical: 538, warning: 593 },
  { time: '08:00', critical: 566, warning: 620 },
  { time: '12:00', critical: 611, warning: 645 },
  { time: '16:00', critical: 633, warning: 662 },
  { time: '20:00', critical: 602, warning: 643 },
]

const vendorImpact = [
  { vendor: 'Nokia', share: 52 },
  { vendor: 'Ericsson', share: 31 },
  { vendor: 'Huawei', share: 17 },
]

const infoCards = [
  ['Network Health Score', '82 / 100'],
  ['Cells with Active Violations', '1,342 / 6.8%'],
  ['Regions Degraded', '2 / 8'],
  ['Automated CM Changes', '417'],
  ['Decisions Pending Approval', '19'],
]

const regionRows = [
  ['Helsinki Metro', '412', 'Critical'],
  ['Tampere', '188', 'Warning'],
  ['Turku', '91', 'Warning'],
]

function formatValue(unit: KPIRecord['unit'], value: number) {
  if (unit === '%') return `${value.toFixed(value > 10 ? 1 : 2)}%`
  if (unit === 'Mbps') return `${Math.round(value)} Mbps`
  if (unit === 'ms') return `${Math.round(value)} ms`
  return `${value.toFixed(1)}`
}

function downgradeStatus(status: Severity): Severity {
  if (status === 'Critical') return 'Warning'
  if (status === 'Warning') return 'Normal'
  return 'Normal'
}

export function Dashboard() {
  const [kpis, setKpis] = useState(initialKpis)
  const [activeStatuses, setActiveStatuses] = useState<Severity[]>(['Normal', 'Warning', 'Critical'])
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null)

  const statusCount = useMemo(
    () => ({
      Normal: kpis.filter((kpi) => kpi.status === 'Normal').length,
      Warning: kpis.filter((kpi) => kpi.status === 'Warning').length,
      Critical: kpis.filter((kpi) => kpi.status === 'Critical').length,
    }),
    [kpis],
  )

  const markers = useMemo(
    () => kpis.filter((kpi) => kpi.status !== 'Normal' && kpi.marker),
    [kpis],
  )

  const alerts = useMemo(
    () => kpis.filter((kpi) => kpi.status !== 'Normal').slice(0, 14),
    [kpis],
  )

  const filteredRows = useMemo(
    () => kpis.filter((kpi) => activeStatuses.includes(kpi.status)),
    [activeStatuses, kpis],
  )

  const selectedKpi = useMemo(
    () => kpis.find((kpi) => kpi.id === selectedKpiId) ?? null,
    [kpis, selectedKpiId],
  )

  const handleApplySuggestion = (kpiId: string) => {
    setKpis((prev) =>
      prev.map((kpi) => {
        if (kpi.id !== kpiId) return kpi
        const nudgedCurrent = kpi.current + (kpi.baseline - kpi.current) * 0.45
        return {
          ...kpi,
          current: nudgedCurrent,
          status: downgradeStatus(kpi.status),
        }
      }),
    )
    toast.success('Change queued')
  }

  return (
    <>
      <Header>
        <div className='text-sm font-semibold tracking-wide text-muted-foreground'>
          ARVIX Network Simulation
        </div>
        <div className='ms-auto flex items-center gap-3'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-4 bg-background text-foreground'>
        <section className='rounded-xl border border-border bg-card/95 p-4 shadow-sm dark:border-cyan-400/20 dark:bg-gradient-to-r dark:from-slate-900/95 dark:via-slate-900 dark:to-slate-800/80 dark:shadow-[0_0_40px_-24px_rgba(34,211,238,0.8)]'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-500/10 text-cyan-300'>
                <Siren className='h-5 w-5' />
              </div>
              <div>
                <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-cyan-200/70'>Dashboard Header</p>
                <h2 className='text-lg font-semibold text-foreground dark:text-slate-100'>NOC Operations Monitor</h2>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <StatusPill label='Normal (Success)' count={statusCount.Normal} status='Normal' />
              <StatusPill label='Warning' count={statusCount.Warning} status='Warning' />
              <StatusPill label='Critical' count={statusCount.Critical} status='Critical' />
              <Badge variant='outline' className='border-border bg-muted/60 text-foreground dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100'>
                <Clock3 className='me-1 h-3.5 w-3.5' /> 2026-02-18 09:37 UTC
              </Badge>
              <Badge className='bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'>
                <CheckCircle2 className='me-1 h-3.5 w-3.5' /> System OK
              </Badge>
            </div>
          </div>
        </section>

        <section className='rounded-xl border border-border bg-card/80 p-4 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/70'>
          <div className='relative h-[390px] overflow-hidden rounded-2xl border border-cyan-300/25 bg-[radial-gradient(circle_at_22%_20%,rgba(8,145,178,0.35),transparent_38%),radial-gradient(circle_at_80%_25%,rgba(37,99,235,0.20),transparent_42%),linear-gradient(120deg,#06112a_10%,#0b2b54_48%,#06112a_100%)] shadow-[inset_0_0_80px_rgba(34,211,238,0.18)]'>
            <div className='absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.08)_1px,transparent_1px)] bg-[size:42px_42px] opacity-30' />
            <div className='absolute bottom-0 left-[-8%] h-48 w-[72%] -skew-x-[28deg] rounded-[56px] border border-cyan-200/15 bg-gradient-to-r from-cyan-950/40 via-cyan-500/12 to-transparent' />
            <div className='absolute bottom-14 left-[18%] h-[1px] w-[48%] rotate-[18deg] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent' />
            <div className='absolute bottom-16 left-[24%] h-[1px] w-[46%] rotate-[18deg] bg-gradient-to-r from-transparent via-sky-300/35 to-transparent' />

            <div className='absolute inset-x-0 bottom-8 flex items-end justify-around px-10'>
              {[34, 52, 44, 60, 48, 67].map((height, index) => (
                <div
                  key={`tower-${index}`}
                  className='w-12 rounded-t-lg border border-cyan-200/10 bg-gradient-to-t from-cyan-500/20 via-sky-200/18 to-slate-100/30 shadow-[0_0_30px_rgba(34,211,238,0.25)]'
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>

            <div className='absolute left-6 top-6 z-10 rounded-2xl border border-cyan-200/20 bg-slate-950/55 px-6 py-5 backdrop-blur'>
              <p className='text-sm text-slate-300/90'>Active fault map · Warning/Critical only</p>
              <p className='mt-2 text-4xl font-semibold uppercase tracking-[0.14em] text-slate-100'>Network Topology</p>
              <p className='mt-2 text-2xl text-slate-300/90'>Smart fault corridors & anomaly radar</p>
            </div>

            <div className='absolute right-8 top-8 rounded-2xl border border-cyan-200/20 bg-slate-950/55 px-5 py-4 text-xs text-slate-300 backdrop-blur'>
              <p className='text-sm uppercase tracking-[0.22em] text-cyan-200'>Telemetry</p>
              <p className='mt-2 font-mono text-xl text-cyan-100'>Sites 410 • Nodes 92 • Cells 2,840</p>
            </div>

            {markers.map((kpi) => (
              <div key={kpi.id} className='group absolute -translate-x-1/2 -translate-y-1/2' style={{ left: `${kpi.marker?.x}%`, top: `${kpi.marker?.y}%` }}>
                <div className={`absolute inset-0 rounded-full animate-ping ${kpi.status === 'Critical' ? 'bg-rose-500/40' : 'bg-amber-400/45'}`} />
                <div className={`relative h-4 w-4 rounded-full border-2 ${kpi.status === 'Critical' ? 'border-rose-300 bg-rose-500' : 'border-amber-200 bg-amber-400'} shadow-[0_0_20px_rgba(34,211,238,0.45)]`} />
                <div className='pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-200 shadow-lg group-hover:block'>
                  <p className='font-semibold'>{kpi.marker?.siteId}</p>
                  <p className='mt-1'>Status: <span className={kpi.status === 'Critical' ? 'text-rose-300' : 'text-amber-300'}>{kpi.status}</span></p>
                  <p className='mt-1 text-slate-400'>Cells: 2,840 | Sites: 410 | Nodes: 92</p>
                </div>
              </div>
            ))}

            <div className='absolute bottom-7 left-7 flex items-center gap-7 rounded-2xl border border-cyan-300/20 bg-slate-950/75 px-6 py-3 text-sm text-slate-200 backdrop-blur'>
              <span className='inline-flex items-center gap-2'>
                <span className='h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]' />
                Warning
              </span>
              <span className='inline-flex items-center gap-2'>
                <span className='h-3 w-3 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.95)]' />
                Critical
              </span>
              <span className='inline-flex items-center gap-2'>
                <span className='h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.85)]' />
                Maintenance
              </span>
            </div>
          </div>
        </section>

        <section className='grid gap-4 xl:grid-cols-3'>
          <div className='space-y-4 xl:col-span-2'>
            <Card className='border-border bg-card/95 transition-all hover:-translate-y-0.5 dark:border-slate-700/80 dark:bg-slate-900/75 dark:hover:shadow-[0_0_36px_-22px_rgba(56,189,248,0.75)]'>
              <CardHeader><CardTitle className='text-foreground dark:text-slate-100'>Network KPI Trends</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid stroke='#334155' strokeDasharray='3 3' />
                    <XAxis dataKey='time' stroke='#94a3b8' />
                    <YAxis yAxisId='left' stroke='#94a3b8' />
                    <YAxis yAxisId='right' orientation='right' stroke='#94a3b8' />
                    <Tooltip />
                    <Line yAxisId='left' type='monotone' dataKey='dropRate' stroke='#fb7185' strokeWidth={2} dot={false} />
                    <Line yAxisId='right' type='monotone' dataKey='throughput' stroke='#38bdf8' strokeWidth={2} dot={false} />
                    <Line yAxisId='right' type='monotone' dataKey='latency' stroke='#22d3ee' strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className='grid gap-4 lg:grid-cols-2'>
              <Card className='border-border bg-card/95 dark:border-slate-700/80 dark:bg-slate-900/75'>
                <CardHeader><CardTitle className='text-foreground dark:text-slate-100'>Active Violations Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width='100%' height={220}>
                    <AreaChart data={violationData}>
                      <CartesianGrid stroke='#334155' strokeDasharray='3 3' />
                      <XAxis dataKey='time' stroke='#94a3b8' />
                      <YAxis stroke='#94a3b8' />
                      <Tooltip />
                      <Area type='monotone' dataKey='critical' stroke='#f43f5e' fill='#f43f5e66' />
                      <Area type='monotone' dataKey='warning' stroke='#f59e0b' fill='#f59e0b55' />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className='border-border bg-card/95 dark:border-slate-700/80 dark:bg-slate-900/75'>
                <CardHeader><CardTitle className='text-foreground dark:text-slate-100'>Vendor Impact Split</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width='100%' height={220}>
                    <BarChart data={vendorImpact}>
                      <CartesianGrid stroke='#334155' strokeDasharray='3 3' />
                      <XAxis dataKey='vendor' stroke='#94a3b8' />
                      <YAxis stroke='#94a3b8' unit='%' />
                      <Tooltip />
                      <Bar dataKey='share' fill='#22d3ee' radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className='border-border bg-card/95 dark:border-slate-700/80 dark:bg-slate-900/75'>
              <CardHeader><CardTitle className='text-foreground dark:text-slate-100'>Top Degraded Regions</CardTitle></CardHeader>
              <CardContent>
                <div className='overflow-x-auto'>
                  <table className='w-full text-left text-sm'>
                    <thead className='bg-muted/70 text-muted-foreground dark:bg-slate-800/70 dark:text-slate-300'>
                      <tr>
                        <th className='px-3 py-2'>Region Name</th>
                        <th className='px-3 py-2'>Affected Cells</th>
                        <th className='px-3 py-2'>Maximum Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regionRows.map(([region, cells, status]) => (
                        <tr key={region} className='border-t border-border text-foreground/90 dark:border-slate-800 dark:text-slate-200'>
                          <td className='px-3 py-2'>{region}</td>
                          <td className='px-3 py-2 tabular-nums'>{cells}</td>
                          <td className='px-3 py-2'><Badge className={severityStyles[status as Severity]}>{status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='space-y-4'>
            {infoCards.map(([label, value]) => (
              <Card key={label} className='border-border bg-card/95 transition-all hover:-translate-y-0.5 dark:border-slate-700/80 dark:bg-slate-900/70 dark:hover:border-cyan-400/40'>
                <CardContent className='pt-6'>
                  <p className='text-xs uppercase tracking-[0.18em] text-muted-foreground'>{label}</p>
                  <p className='mt-2 font-mono text-2xl font-semibold text-cyan-700 dark:text-cyan-200'>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className='rounded-xl border border-border bg-card/95 p-4 dark:border-slate-700/80 dark:bg-slate-900/70'>
          <div className='mb-3 flex items-center justify-between'>
            <h3 className='text-sm font-semibold uppercase tracking-[0.2em] text-foreground dark:text-slate-200'>Alarm Section</h3>
            <Dialog>
              <DialogTrigger asChild><Button variant='ghost' className='text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200'>View all</Button></DialogTrigger>
              <DialogContent className='max-w-2xl bg-background text-foreground dark:bg-slate-950 dark:text-slate-100'>
                <DialogHeader><DialogTitle>All Active Alerts</DialogTitle></DialogHeader>
                <div className='max-h-[420px] overflow-auto space-y-2'>
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`rounded-lg border p-3 ${severityStyles[alert.status]}`}>
                      <p className='text-xs font-semibold uppercase'>{alert.status}</p>
                      <p className='text-sm'>{alert.scope} · {alert.name} deviated from baseline</p>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className='flex gap-3 overflow-x-auto pb-2'>
            {alerts.map((alert, index) => (
              <div key={alert.id} className={`min-w-[260px] rounded-lg border-l-4 border border-border bg-card p-3 dark:border-slate-700 dark:bg-slate-950/75 ${alert.status === 'Critical' ? 'border-l-rose-400' : 'border-l-amber-300'}`}>
                <div className='flex items-center justify-between'>
                  <Badge className={severityStyles[alert.status]}>{alert.status}</Badge>
                  <span className='text-xs text-muted-foreground'>{5 + index} min ago</span>
                </div>
                <p className='mt-2 text-sm text-foreground dark:text-slate-100'>
                  {alert.scope} {alert.name} drift detected ({formatValue(alert.unit, alert.current)} vs {formatValue(alert.unit, alert.baseline)})
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className='rounded-xl border border-border bg-card/95 p-4 dark:border-slate-700/80 dark:bg-slate-900/70'>
          <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
            <h3 className='text-lg font-semibold text-foreground dark:text-slate-100'>KPI Status (Network & Regions)</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' className='border-border bg-background text-foreground dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'>Filter Status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='bg-popover text-popover-foreground dark:bg-slate-900 dark:text-slate-100'>
                {(['Normal', 'Warning', 'Critical'] as Severity[]).map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={activeStatuses.includes(status)}
                    onCheckedChange={(checked) => {
                      setActiveStatuses((prev) => {
                        if (checked) return Array.from(new Set([...prev, status]))
                        if (prev.length === 1) return prev
                        return prev.filter((item) => item !== status)
                      })
                    }}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className='max-h-[440px] overflow-auto rounded-lg border border-border dark:border-slate-800'>
            <table className='w-full text-left text-sm'>
              <thead className='sticky top-0 z-10 bg-background dark:bg-slate-900'>
                <tr className='border-b border-border text-xs uppercase tracking-wider text-muted-foreground dark:border-slate-700 dark:text-slate-400'>
                  <th className='px-3 py-3'>KPI Name</th>
                  <th className='px-3 py-3'>Scope</th>
                  <th className='px-3 py-3'>Current Value</th>
                  <th className='px-3 py-3'>Baseline Value</th>
                  <th className='px-3 py-3'>Delta</th>
                  <th className='px-3 py-3'>Health Status</th>
                  <th className='px-3 py-3'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const delta = row.current - row.baseline
                  const deltaDisplay = `${delta > 0 ? '+' : ''}${row.unit === '%' ? delta.toFixed(2) : Math.round(delta)}`
                  return (
                    <tr key={row.id} className='border-b border-border text-foreground hover:bg-muted/50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800/40'>
                      <td className='px-3 py-2'>{row.name}</td>
                      <td className='px-3 py-2 text-muted-foreground dark:text-slate-300'>{row.scope}</td>
                      <td className='px-3 py-2 font-mono'>{formatValue(row.unit, row.current)}</td>
                      <td className='px-3 py-2 font-mono text-muted-foreground dark:text-slate-300'>{formatValue(row.unit, row.baseline)}</td>
                      <td className='px-3 py-2 font-mono'>{deltaDisplay}</td>
                      <td className='px-3 py-2'><Badge className={severityStyles[row.status]}>{row.status}</Badge></td>
                      <td className='px-3 py-2'>
                        {row.status === 'Normal' ? (
                          <Button size='sm' variant='ghost' disabled className='text-muted-foreground'>Details</Button>
                        ) : (
                          <Button size='sm' variant='outline' className='border-border text-foreground dark:border-slate-500 dark:text-slate-100' onClick={() => setSelectedKpiId(row.id)}>
                            Details
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <Sheet open={Boolean(selectedKpi)} onOpenChange={(open) => !open && setSelectedKpiId(null)}>
          <SheetContent side='right' className='w-full overflow-auto bg-background text-foreground dark:bg-slate-950 dark:text-slate-100 sm:max-w-2xl'>
            <SheetHeader>
              <SheetTitle>{selectedKpi?.name} · {selectedKpi?.scope}</SheetTitle>
              <SheetDescription className='text-muted-foreground dark:text-slate-400'>Investigation details and automated recommendations.</SheetDescription>
            </SheetHeader>

            {selectedKpi && (
              <div className='mt-4 space-y-5'>
                <DetailTable
                  title='Event Timeline'
                  headers={['Event Time', 'Data Source', 'Change Description']}
                  rows={(selectedKpi.events ?? []).map((event) => [event.time, event.source, event.description])}
                />
                <DetailTable
                  title='KPI Before / After'
                  headers={['KPI Name', 'Before Change', 'After Change']}
                  rows={(selectedKpi.beforeAfter ?? []).map((item) => [item.kpi, item.before, item.after])}
                />

                <div className='rounded-lg border border-border dark:border-slate-800'>
                  <div className='border-b border-border px-3 py-2 text-sm font-semibold text-foreground dark:border-slate-800 dark:text-slate-100'>Decision Suggestions</div>
                  <div className='overflow-auto'>
                    <table className='w-full text-left text-xs'>
                      <thead className='bg-muted/60 text-muted-foreground dark:bg-slate-900 dark:text-slate-400'>
                        <tr>
                          <th className='px-3 py-2'>Cell ID</th>
                          <th className='px-3 py-2'>Detected Issue</th>
                          <th className='px-3 py-2'>Suggested Action</th>
                          <th className='px-3 py-2'>Confidence Score</th>
                          <th className='px-3 py-2'>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedKpi.suggestions ?? []).map((suggestion) => (
                          <tr key={`${selectedKpi.id}-${suggestion.cellId}`} className='border-t border-border text-foreground/90 dark:border-slate-800 dark:text-slate-200'>
                            <td className='px-3 py-2'>{suggestion.cellId}</td>
                            <td className='px-3 py-2'>{suggestion.issue}</td>
                            <td className='px-3 py-2'>{suggestion.action}</td>
                            <td className='px-3 py-2 font-mono'>{suggestion.confidence.toFixed(2)}</td>
                            <td className='px-3 py-2'>
                              <Button size='sm' className='bg-cyan-600 hover:bg-cyan-500' onClick={() => handleApplySuggestion(selectedKpi.id)}>
                                Apply
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </Main>
    </>
  )
}

function StatusPill({ label, count, status }: { label: string; count: number; status: Severity }) {
  return (
    <Badge className={`${severityStyles[status]} border px-2.5 py-1 font-medium`}>
      {status === 'Critical' ? <Siren className='me-1 h-3.5 w-3.5' /> : status === 'Warning' ? <TriangleAlert className='me-1 h-3.5 w-3.5' /> : <CheckCircle2 className='me-1 h-3.5 w-3.5' />}
      {label}: <span className='ms-1 font-mono'>{count}</span>
    </Badge>
  )
}

function DetailTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div className='rounded-lg border border-border dark:border-slate-800'>
      <div className='border-b border-border px-3 py-2 text-sm font-semibold text-foreground dark:border-slate-800 dark:text-slate-100'>{title}</div>
      <div className='overflow-auto'>
        <table className='w-full text-left text-xs'>
          <thead className='bg-muted/60 text-muted-foreground dark:bg-slate-900 dark:text-slate-400'>
            <tr>{headers.map((header) => <th key={header} className='px-3 py-2'>{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className='border-t border-border text-foreground/90 dark:border-slate-800 dark:text-slate-200'>
                {row.map((cell, cellIndex) => <td key={`${title}-${index}-${cellIndex}`} className='px-3 py-2'>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
