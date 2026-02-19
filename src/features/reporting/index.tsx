import { type ReactNode } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
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

export type ReportingDomain = 'cm' | 'pm' | 'license' | 'inventory' | 'user-log'
export type ReportingVendor = 'huawei' | 'nokia' | 'ericsson'

type RawRow = {
  node: string
  site: string
  cell: string
  index: string
  parameter: string
  value: string
  date: string
}

type HistoryRow = {
  node: string
  site: string
  cell: string
  index: string
  parameter: string
  oldValue: string
  newValue: string
  date: string
}

type PmRawRow = {
  id: string
  node: string
  site: string
  cell: string
  measTime: string
  granularityMin: string
  counterName: string
  counterValue: string
  fileReadTime: string
}

type PmHistoryRow = {
  id: string
  vendor: string
  node: string
  site: string
  cell: string
  counterName: string
  measTime: string
  previousValue: string
  currentValue: string
  delta: string
  changeDetectedTime: string
}

const labels = {
  cm: 'CM',
  pm: 'PM',
  license: 'License',
  inventory: 'Inventory',
  'user-log': 'User Log',
  huawei: 'Huawei',
  nokia: 'Nokia',
  ericsson: 'Ericsson',
} as const

const cmRawByVendor: Record<ReportingVendor, RawRow[]> = {
  huawei: [['THDL006A', 'HW-CM-THDL006A-20260218-0800', 'MaxUE', '210', '2026-02-18 08:00']].map(
    ([cell, index, parameter, value, date]) => ({ node: 'TH006', site: 'THDL006', cell, index, parameter, value, date })
  ),
  nokia: [['THDL006A', 'NO-CM-THDL006A-20260218-0800', 'maxNumUe', '200', '2026-02-18 08:00']].map(
    ([cell, index, parameter, value, date]) => ({ node: 'TH006', site: 'THDL006', cell, index, parameter, value, date })
  ),
  ericsson: [['THDL006A', 'ER-CM-THDL006A-20260218-0800', 'maxNumActUE', '180', '2026-02-18 08:00']].map(
    ([cell, index, parameter, value, date]) => ({ node: 'TH006', site: 'THDL006', cell, index, parameter, value, date })
  ),
}

const pmRawByVendor: Record<ReportingVendor, PmRawRow[]> = {
  nokia: [
    ['n-1', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 14:00', '60', 'pmCellThpDl', '96.4', '2026-02-18 14:10'],
    ['n-2', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 14:00', '60', 'pmPrbUtilDl', '71.2', '2026-02-18 14:10'],
    ['n-3', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 15:00', '60', 'pmCellThpDl', '82.1', '2026-02-18 15:10'],
    ['n-4', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 15:00', '60', 'pmPrbUtilDl', '88.5', '2026-02-18 15:10'],
    ['n-5', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 14:00', '60', 'pmCellThpDl', '73.8', '2026-02-18 14:10'],
    ['n-6', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 15:00', '60', 'pmCellThpDl', '69.5', '2026-02-18 15:10'],
    ['n-7', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 14:00', '60', 'pmErabDropRate', '0.33', '2026-02-18 14:10'],
    ['n-8', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 15:00', '60', 'pmErabDropRate', '0.58', '2026-02-18 15:10'],
    ['n-9', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 15:00', '60', 'pmErabDropRate', '0.91', '2026-02-18 15:10'],
    ['n-10', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 14:00', '60', 'pmHoSuccRate', '97.6', '2026-02-18 14:10'],
  ].map(([id, node, site, cell, measTime, granularityMin, counterName, counterValue, fileReadTime]) => ({ id, node, site, cell, measTime, granularityMin, counterName, counterValue, fileReadTime })),
  ericsson: [
    ['e-1', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 14:00', '60', 'dlThroughput', '88.2', '2026-02-18 14:12'],
    ['e-2', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 14:00', '60', 'prbUtilDl', '69.4', '2026-02-18 14:12'],
    ['e-3', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 15:00', '60', 'dlThroughput', '74.6', '2026-02-18 15:12'],
    ['e-4', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 15:00', '60', 'prbUtilDl', '85.3', '2026-02-18 15:12'],
    ['e-5', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 14:00', '60', 'dlThroughput', '73.8', '2026-02-18 14:12'],
    ['e-6', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 15:00', '60', 'dlThroughput', '69.5', '2026-02-18 15:12'],
    ['e-7', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 14:00', '60', 'erabDropRate', '0.31', '2026-02-18 14:12'],
    ['e-8', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 15:00', '60', 'erabDropRate', '0.52', '2026-02-18 15:12'],
    ['e-9', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 14:00', '60', 'hoSuccRate', '98.0', '2026-02-18 14:12'],
    ['e-10', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 15:00', '60', 'hoSuccRate', '96.4', '2026-02-18 15:12'],
  ].map(([id, node, site, cell, measTime, granularityMin, counterName, counterValue, fileReadTime]) => ({ id, node, site, cell, measTime, granularityMin, counterName, counterValue, fileReadTime })),
  huawei: [
    ['h-1', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 14:00', '60', 'L.Thrp.bits.DL', '91.3', '2026-02-18 14:15'],
    ['h-2', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 14:00', '60', 'L.ChMeas.PRB.DL.Used', '72.1', '2026-02-18 14:15'],
    ['h-3', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 15:00', '60', 'L.Thrp.bits.DL', '79.8', '2026-02-18 15:15'],
    ['h-4', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 15:00', '60', 'L.ChMeas.PRB.DL.Used', '87.9', '2026-02-18 15:15'],
    ['h-5', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 14:00', '60', 'L.Thrp.bits.DL', '75.4', '2026-02-18 14:15'],
    ['h-6', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 15:00', '60', 'L.Thrp.bits.DL', '70.2', '2026-02-18 15:15'],
    ['h-7', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 14:00', '60', 'L.E-RAB.DropRate', '0.36', '2026-02-18 14:15'],
    ['h-8', 'TH006', 'THDL006', 'THDL006B', '2026-02-18 15:00', '60', 'L.E-RAB.DropRate', '0.61', '2026-02-18 15:15'],
    ['h-9', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 14:00', '60', 'L.HO.SuccRate', '97.4', '2026-02-18 14:15'],
    ['h-10', 'TH006', 'THDL006', 'THDL006A', '2026-02-18 15:00', '60', 'L.HO.SuccRate', '95.8', '2026-02-18 15:15'],
  ].map(([id, node, site, cell, measTime, granularityMin, counterName, counterValue, fileReadTime]) => ({ id, node, site, cell, measTime, granularityMin, counterName, counterValue, fileReadTime })),
}

const cmHistoryRows: HistoryRow[] = [
  ['TH006', 'THDL006', 'THDL006A', 'CHG-1', 'maxNumUe', '200', '240', '2026-02-18 09:14'],
].map(([node, site, cell, index, parameter, oldValue, newValue, date]) => ({ node, site, cell, index, parameter, oldValue, newValue, date }))

const pmHistoryRows: PmHistoryRow[] = [
  ['p-1', 'Nokia', 'TH006', 'THDL006', 'THDL006A', 'pmCellThpDl', '2026-02-18 15:00', '96.4', '82.1', '-14.3', '2026-02-18 15:10'],
  ['p-2', 'Nokia', 'TH006', 'THDL006', 'THDL006B', 'pmCellThpDl', '2026-02-18 15:00', '73.8', '69.5', '-4.3', '2026-02-18 15:10'],
  ['p-3', 'Ericsson', 'TH006', 'THDL006', 'THDL006A', 'dlThroughput', '2026-02-18 15:00', '88.2', '74.6', '-13.6', '2026-02-18 15:12'],
  ['p-4', 'Ericsson', 'TH006', 'THDL006', 'THDL006B', 'dlThroughput', '2026-02-18 15:00', '73.8', '69.5', '-4.3', '2026-02-18 15:12'],
  ['p-5', 'Huawei', 'TH006', 'THDL006', 'THDL006A', 'L.Thrp.bits.DL', '2026-02-18 15:00', '91.3', '79.8', '-11.5', '2026-02-18 15:15'],
  ['p-6', 'Huawei', 'TH006', 'THDL006', 'THDL006B', 'L.Thrp.bits.DL', '2026-02-18 15:00', '75.4', '70.2', '-5.2', '2026-02-18 15:15'],
  ['p-7', 'Nokia', 'TH006', 'THDL006', 'THDL006A', 'pmPrbUtilDl', '2026-02-18 15:00', '71.2', '88.5', '+17.3', '2026-02-18 15:10'],
  ['p-8', 'Ericsson', 'TH006', 'THDL006', 'THDL006A', 'prbUtilDl', '2026-02-18 15:00', '69.4', '85.3', '+15.9', '2026-02-18 15:12'],
  ['p-9', 'Huawei', 'TH006', 'THDL006', 'THDL006A', 'L.ChMeas.PRB.DL.Used', '2026-02-18 15:00', '72.1', '87.9', '+15.8', '2026-02-18 15:15'],
  ['p-10', 'Nokia', 'TH006', 'THDL006', 'THDL006B', 'pmErabDropRate', '2026-02-18 15:00', '0.33', '0.58', '+0.25', '2026-02-18 15:10'],
].map(([id, vendor, node, site, cell, counterName, measTime, previousValue, currentValue, delta, changeDetectedTime]) => ({ id, vendor, node, site, cell, counterName, measTime, previousValue, currentValue, delta, changeDetectedTime }))

export function ReportingLandingPage() {
  return (
    <ReportingShell title='Reporting'>
      <Card className='border-none bg-gradient-to-r from-primary/5 via-background to-primary/5 shadow-lg'>
        <CardHeader><CardTitle>Reporting</CardTitle></CardHeader>
        <CardContent className='text-sm text-muted-foreground'>از سایدبار مسیرهای Reporting را باز کن و وارد صفحه‌های Raw Data یا History شو.</CardContent>
      </Card>
    </ReportingShell>
  )
}

export function ReportingRawPage({ domain, vendor }: { domain: ReportingDomain; vendor: ReportingVendor }) {
  return (
    <ReportingShell title={`${labels[domain]} / Raw Data / ${labels[vendor]}`}>
      <FilterBar domain={domain} vendor={vendor} view='Raw Data' />
      <ActionRow />
      <TableCard title={`${labels[domain]} Raw Data`}>
        {domain === 'pm' ? <PmRawTable rows={pmRawByVendor[vendor]} /> : <RawTable rows={cmRawByVendor[vendor]} />}
      </TableCard>
    </ReportingShell>
  )
}

export function ReportingHistoryPage({ domain }: { domain: ReportingDomain }) {
  return (
    <ReportingShell title={`${labels[domain]} / History`}>
      <FilterBar domain={domain} view='History' />
      <ActionRow />
      <TableCard title={domain === 'pm' ? 'PM History (Counter Changes)' : `${labels[domain]} History`}>
        {domain === 'pm' ? <PmHistoryTable rows={pmHistoryRows} /> : <HistoryTable rows={cmHistoryRows} />}
      </TableCard>
    </ReportingShell>
  )
}

function ReportingShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Header><Search /><div className='ms-auto flex items-center gap-4'><ThemeSwitch /><ProfileDropdown /></div></Header>
      <Main><h1 className='text-2xl font-bold tracking-tight'>{title}</h1><div className='mt-4'>{children}</div></Main>
    </>
  )
}

function FilterBar({ domain, vendor, view }: { domain: ReportingDomain; vendor?: ReportingVendor; view: string }) {
  return (
    <Card className='border-none shadow-lg ring-1 ring-border/60'>
      <CardHeader><CardTitle className='text-base'>Global Context Bar</CardTitle></CardHeader>
      <CardContent className='grid gap-3 md:grid-cols-3 xl:grid-cols-6'>
        <Select defaultValue='24h'><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='24h'>Last 24h</SelectItem><SelectItem value='7d'>7d</SelectItem></SelectContent></Select>
        <Select defaultValue='cell'><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='network'>Network</SelectItem><SelectItem value='region'>Region</SelectItem><SelectItem value='site'>Site</SelectItem><SelectItem value='node'>Node</SelectItem><SelectItem value='cell'>Cell</SelectItem></SelectContent></Select>
        <Input value={labels[domain]} readOnly />
        <Input value={view} readOnly />
        {vendor ? <Input value={labels[vendor]} readOnly /> : <Input placeholder='Vendor filter' />}
        <Input placeholder='Search Node / Site / Cell / Parameter' />
      </CardContent>
    </Card>
  )
}

function ActionRow() {
  return (
    <div className='mt-4 flex gap-2'>
      <Button variant='outline' className='shadow-sm transition hover:-translate-y-0.5'>Export CSV</Button>
      <Button variant='outline' className='shadow-sm transition hover:-translate-y-0.5'>Export XLSX</Button>
    </div>
  )
}

function TableCard({ title, children }: { title: string; children: ReactNode }) {
  return <Card className='mt-4 overflow-hidden border-none shadow-xl ring-1 ring-border/60'><CardHeader className='bg-muted/40'><CardTitle>{title}</CardTitle></CardHeader><CardContent className='p-0'>{children}</CardContent></Card>
}

function RawTable({ rows }: { rows: RawRow[] }) {
  return <SimpleTable headers={['Node', 'Site', 'Cell', 'Index', 'Parameter', 'Value', 'Date']} rows={rows.map((r) => [r.node, r.site, r.cell, r.index, r.parameter, r.value, r.date])} />
}

function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return <SimpleTable headers={['Node', 'Site', 'Cell', 'Index', 'Parameter', 'Old Value', 'New Value', 'Date']} rows={rows.map((r) => [r.node, r.site, r.cell, r.index, r.parameter, r.oldValue, r.newValue, r.date])} />
}

function PmRawTable({ rows }: { rows: PmRawRow[] }) {
  return <SimpleTable headers={['id', 'node', 'site', 'cell', 'meas_time', 'granularity_min', 'counter_name', 'counter_value', 'file_read_time']} rows={rows.map((r) => [r.id, r.node, r.site, r.cell, r.measTime, r.granularityMin, r.counterName, r.counterValue, r.fileReadTime])} />
}

function PmHistoryTable({ rows }: { rows: PmHistoryRow[] }) {
  return <SimpleTable headers={['id', 'vendor', 'node', 'site', 'cell', 'counter_name', 'meas_time', 'previous_value', 'current_value', 'delta', 'change_detected_time']} rows={rows.map((r) => [r.id, r.vendor, r.node, r.site, r.cell, r.counterName, r.measTime, r.previousValue, r.currentValue, r.delta, r.changeDetectedTime])} />
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[1080px] text-left text-sm'>
        <thead className='sticky top-0 z-10 bg-card'><tr className='border-b bg-muted/40'>{headers.map((h) => <th key={h} className='px-3 py-3 font-semibold'>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={`${row[0]}-${i}`} className='border-b transition duration-300 hover:bg-primary/5'>{row.map((c, j) => <td key={`${j}-${c}`} className='px-3 py-2'>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
