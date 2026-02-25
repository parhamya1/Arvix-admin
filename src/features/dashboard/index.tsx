import { type ReactNode, useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

type Severity = 'Normal' | 'Warning' | 'Critical'
type Vendor = 'Huawei' | 'Nokia' | 'Ericsson'
type ReportingDomain = 'CM' | 'PM' | 'License' | 'Inventory' | 'User Log'

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
  Critical:
    'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
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

const kpiStatusRows = [
  ['Call Setup Success Rate', '2G', '99.42%', '99.30%', '+0.12%', 'Normal', '', 'NOKIA'],
  ['Handover Success Rate', '3G', '98.84%', '98.70%', '+0.14%', 'Normal', '', 'ERICSSON'],
  ['Paging Success Rate', '4G', '99.12%', '98.95%', '+0.17%', 'Normal', '', 'HUAWEI'],
  ['Packet Loss Rate', '5G', '0.46%', '0.55%', '-0.09%', 'Normal', '', 'NOKIA'],
  ['Core Session Success', 'Core', '99.81%', '99.70%', '+0.11%', 'Normal', '', 'ERICSSON'],
  ['VoLTE Setup SR', '4G', '98.76%', '98.60%', '+0.16%', 'Normal', '', 'HUAWEI'],
  ['PRB Utilization', '5G', '63.4%', '65.0%', '-1.6%', 'Normal', '', 'NOKIA'],
  ['RRC Connection SR', '4G', '99.01%', '98.90%', '+0.11%', 'Normal', '', 'ERICSSON'],
  ['Downlink Throughput', '4G', '92 Mbps', '105 Mbps', '-13 Mbps', 'Warning', 'Details', 'HUAWEI'],
  ['Uplink Throughput', '5G', '38 Mbps', '45 Mbps', '-7 Mbps', 'Warning', 'Details', 'NOKIA'],
  ['Average Latency', 'Core', '29 ms', '24 ms', '+5 ms', 'Warning', 'Details', 'ERICSSON'],
  ['Jitter Index', '5G', '11 ms', '8 ms', '+3 ms', 'Warning', 'Details', 'HUAWEI'],
  ['Data Session Retainability', '4G', '98.21%', '98.80%', '-0.59%', 'Warning', 'Details', 'NOKIA'],
  ['VoNR Call Drop Rate', '5G', '1.18%', '0.80%', '+0.38%', 'Warning', 'Details', 'ERICSSON'],
  ['CSFB Success Rate', '3G', '97.42%', '98.00%', '-0.58%', 'Warning', 'Details', 'HUAWEI'],
  ['Inter-RAT HO SR', '4G', '96.88%', '97.40%', '-0.52%', 'Warning', 'Details', 'NOKIA'],
  ['Core Attach Delay', 'Core', '1.7 s', '1.3 s', '+0.4 s', 'Warning', 'Details', 'ERICSSON'],
  ['Bearer Setup Time', '4G', '122 ms', '105 ms', '+17 ms', 'Warning', 'Details', 'HUAWEI'],
  ['Cell Availability', '2G', '95.2%', '98.5%', '-3.3%', 'Critical', 'Details', 'NOKIA'],
  ['Site Power Stability', 'Core', '89.7%', '96.0%', '-6.3%', 'Critical', 'Details', 'ERICSSON'],
  ['Backhaul Utilization', '5G', '93.0%', '80.0%', '+13.0%', 'Critical', 'Details', 'HUAWEI'],
  ['S1 Signaling Success', '4G', '94.8%', '98.2%', '-3.4%', 'Critical', 'Details', 'NOKIA'],
  ['X2 Handover Delay', '4G', '96 ms', '62 ms', '+34 ms', 'Critical', 'Details', 'ERICSSON'],
  ['VoIP MOS Score', 'Core', '2.9', '3.8', '-0.9', 'Critical', 'Details', 'HUAWEI'],
  ['Emergency Call Setup Time', '3G', '6.3 s', '4.2 s', '+2.1 s', 'Critical', 'Details', 'NOKIA'],
  ['Radio Link Failure Rate', '5G', '2.6%', '1.2%', '+1.4%', 'Critical', 'Details', 'ERICSSON'],
  ['Congestion Minutes', '2G', '214 min', '120 min', '+94 min', 'Critical', 'Details', 'HUAWEI'],
  ['TCH Traffic Load', '2G', '81 Erlang', '62 Erlang', '+19 Erlang', 'Critical', 'Details', 'NOKIA'],
  ['Active UE Sessions', '4G', '18200 Sessions', '14000 Sessions', '+4200 Sessions', 'Critical', 'Details', 'ERICSSON'],
  ['Signaling Load Index', 'Core', '74.5%', '58.0%', '+16.5%', 'Critical', 'Details', 'HUAWEI'],
]

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
  return (
    <>
      <Header>
        <div className='text-sm font-semibold tracking-wide text-muted-foreground'>
          ARVIX Finland Network Simulation
        </div>
        <div className='ms-auto flex items-center gap-3'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <GlobalContextBar showVendor />

        <Tabs defaultValue='overview' className='space-y-4'>
          <div className='w-full overflow-x-auto'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='guardrails'>Guardrails (Baselines)</TabsTrigger>
              <TabsTrigger value='violations'>Violations</TabsTrigger>
              <TabsTrigger value='investigation'>Investigation</TabsTrigger>
              <TabsTrigger value='decisions'>Decisions</TabsTrigger>
              <TabsTrigger value='reporting'>Reporting</TabsTrigger>
            </TabsList>
          </div>

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
                  <LineChart data={kpiTrendData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='time' />
                    <YAxis yAxisId='left' />
                    <YAxis yAxisId='right' orientation='right' />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId='left' type='monotone' dataKey='dropRate' name='Drop Rate (%)' stroke='#ef4444' />
                    <Line yAxisId='right' type='monotone' dataKey='throughput' name='Throughput (Mbps)' stroke='#2563eb' />
                    <Line yAxisId='right' type='monotone' dataKey='latency' name='Latency (ms)' stroke='#10b981' />
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
                    <Area type='monotone' dataKey='critical' stackId='1' stroke='#f43f5e' fill='#f43f5e' name='Critical' />
                    <Area type='monotone' dataKey='warning' stackId='1' stroke='#f59e0b' fill='#f59e0b' name='Warning' />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className='grid gap-4 lg:grid-cols-3'>
              <ChartCard title='Vendor Impact Split'>
                <ResponsiveContainer width='100%' height={240}>
                  <BarChart data={[{ vendor: 'Nokia', share: 52 }, { vendor: 'Ericsson', share: 48 }]}>
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
                    headers={['Region Name', 'Affected Cells', 'Maximum Severity']}
                    rows={[
                      ['Helsinki Metro', '412', 'Critical'],
                      ['Tampere', '188', 'Warning'],
                      ['Turku', '91', 'Warning'],
                    ]}
                    severityColumnIndex={2}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>KPI Status (Network & Regions)</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={['KPI Name', 'Technology', 'Current Value', 'Baseline Value', 'Delta', 'Health Status', 'Actions', 'Vendor']}
                  rows={kpiStatusRows}
                  severityColumnIndex={5}
                />
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
                  headers={['Vendor', 'Entity Level', 'Parameter Name', 'Baseline Method', 'Expected Baseline', 'Tolerance', 'Rule Scope']}
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
                  headers={['Cell ID', 'Vendor', 'Parameter Name', 'Expected Value', 'Current Value', 'Deviation', 'Severity']}
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
                <DataTable headers={['Event Time', 'Data Source', 'Change Description']} rows={cmTimelineRows} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>KPI Before / After</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable headers={['KPI Name', 'Before Change', 'After Change']} rows={beforeAfterRows} />
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
                  headers={['Cell ID', 'Detected Issue', 'Suggested Action', 'Confidence Score']}
                  rows={decisionRows}
                />
                <p className='mt-4 text-sm text-muted-foreground'>
                  Confidence logic (MVP): rule-based + historical similarity + recency weighting.
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
          ['2026-02-18 09:14', 'Nokia', 'CELL', 'KFI-HEL-221', 'MaxUE', 'avg', '+22%'],
          ['2026-02-18 09:18', 'Ericsson', 'CELL', 'KFI-HEL-305', 'DLBW2', 'avg', '-18%'],
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
          ['2026-02-18 09:15', 'Nokia', 'REGION', 'Helsinki', 'Throughput', '78 Mbps', '105 Mbps', 'Critical'],
          ['2026-02-18 09:15', 'Ericsson', 'NETWORK', 'Finland', 'Drop Rate', '0.82%', '0.60%', 'Warning'],
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
          ['2026-02-18 09:20', 'Nokia', 'NOD-HEL-01', '5G Carrier', '120', '112', '93%', 'Warning'],
          ['2026-02-18 09:20', 'Ericsson', 'NOD-TMP-03', 'LTE Capacity', '95', '95', '100%', 'Critical'],
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
          ['2026-02-18 08:10', 'Nokia', 'NOD-HEL-01', 'SW Version', '21B', '22A', 'ACTIVE'],
          ['2026-02-18 08:45', 'Huawei', 'NOD-TKU-12', 'Board Type', 'BBU3900', 'BBU5900', 'ACTIVE'],
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
        ['2026-02-18 09:10', 'Ericsson', 'op_hel_12', 'MODIFY', 'CELL', 'KFI-HEL-221', 'SUCCESS'],
        ['2026-02-18 09:13', 'Nokia', 'op_tmp_04', 'ROLLBACK', 'CELL', 'KFI-TMP-087', 'SUCCESS'],
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
            <Select value={domain} onValueChange={(value) => setDomain(value as ReportingDomain)}>
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

            <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'raw' | 'history')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='raw'>Raw Data</SelectItem>
                <SelectItem value='history'>History (Normalized)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vendor} onValueChange={(value) => setVendor(value as Vendor)} disabled={viewMode === 'history'}>
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

          <GlobalContextBar showVendor={viewMode === 'history'} compact />

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
                    : [['-', '-', '-', '-', '-', '-', '-', 'No rows in selected filter']]
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

function GlobalContextBar({
  showVendor,
  compact,
}: {
  showVendor?: boolean
  compact?: boolean
}) {
  return (
    <div className={`${compact ? '' : 'mb-4'} rounded-lg border bg-card p-4`}>
      <div className='mb-3 text-sm font-medium'>Global Context Bar</div>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <Select defaultValue='24h'>
          <SelectTrigger>
            <SelectValue placeholder='Time Range' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='24h'>Last 24h</SelectItem>
            <SelectItem value='7d'>Last 7d</SelectItem>
            <SelectItem value='custom'>Custom</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue='network'>
          <SelectTrigger>
            <SelectValue placeholder='Scope Level' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='network'>Network</SelectItem>
            <SelectItem value='region'>Region</SelectItem>
            <SelectItem value='site'>Site</SelectItem>
            <SelectItem value='node'>Node</SelectItem>
            <SelectItem value='cell'>Cell</SelectItem>
          </SelectContent>
        </Select>

        {showVendor ? (
          <Select defaultValue='all'>
            <SelectTrigger>
              <SelectValue placeholder='Vendor Filter' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Vendors</SelectItem>
              <SelectItem value='huawei'>Huawei</SelectItem>
              <SelectItem value='nokia'>Nokia</SelectItem>
              <SelectItem value='ericsson'>Ericsson</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input placeholder='Search: Cell / Site / Node / Region' />
        )}

        <Input placeholder='Search: Cell / Site / Node / Region' />
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
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
}: {
  headers: string[]
  rows: string[][]
  severityColumnIndex?: number
}) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[760px] text-left text-sm'>
        <thead>
          <tr className='border-b'>
            {headers.map((header) => (
              <th key={header} className='px-3 py-2 font-semibold'>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
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
  )
}
