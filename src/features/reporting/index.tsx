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
  huawei: [
    ['THDL006A','HW-CM-THDL006A-20260218-0800','MaxUE','210','2026-02-18 08:00'],
    ['THDL006A','HW-CM-THDL006A-20260218-0800','TxPwr','36','2026-02-18 08:00'],
    ['THDL006A','HW-CM-THDL006A-20260218-0800','LoadLimit','78','2026-02-18 08:00'],
    ['THDL006A','HW-CM-THDL006A-20260218-0800','HO_Threshold','-95','2026-02-18 08:00'],
    ['THDL006A','HW-CM-THDL006A-20260218-0800','Qoffset','2','2026-02-18 08:00'],
    ['THDL006A','HW-CM-THDL006A-20260218-0900','MaxUE','240','2026-02-18 09:00'],
    ['THDL006A','HW-CM-THDL006A-20260218-0900','TxPwr','36','2026-02-18 09:00'],
    ['THDL006A','HW-CM-THDL006A-20260218-0900','LoadLimit','101','2026-02-18 09:00'],
    ['THDL006A','HW-CM-THDL006A-20260218-0900','HO_Threshold','-89','2026-02-18 09:00'],
    ['THDL006A','HW-CM-THDL006A-20260218-0900','Qoffset','4','2026-02-18 09:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0800','MaxUE','180','2026-02-18 08:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0800','TxPwr','38','2026-02-18 08:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0800','LoadLimit','80','2026-02-18 08:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0800','HO_Threshold','-97','2026-02-18 08:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0800','SINR_Offset','-1','2026-02-18 08:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0900','MaxUE','200','2026-02-18 09:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0900','TxPwr','34','2026-02-18 09:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0900','LoadLimit','95','2026-02-18 09:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0900','HO_Threshold','-90','2026-02-18 09:00'],
    ['THDL006B','HW-CM-THDL006B-20260218-0900','SINR_Offset','-3','2026-02-18 09:00'],
  ].map(([cell,index,parameter,value,date])=>({node:'TH006',site:'THDL006',cell,index,parameter,value,date})),
  nokia: [
    ['THDL006A','NO-CM-THDL006A-20260218-0800','maxNumUe','200','2026-02-18 08:00'],
    ['THDL006A','NO-CM-THDL006A-20260218-0800','txPower','40','2026-02-18 08:00'],
    ['THDL006A','NO-CM-THDL006A-20260218-0800','loadLimit','80','2026-02-18 08:00'],
    ['THDL006A','NO-CM-THDL006A-20260218-0800','hoThresh','-95','2026-02-18 08:00'],
    ['THDL006A','NO-CM-THDL006A-20260218-0800','qOffset','2','2026-02-18 08:00'],
    ['THDL006A','NO-CM-THDL006A-20260218-0900','maxNumUe','240','2026-02-18 09:00'],
    ['THDL006A','NO-CM-THDL006A-20260218-0900','txPower','40','2026-02-18 09:00'],
    ['THDL006A','NO-CM-THDL006A-20260218-0900','loadLimit','95','2026-02-18 09:00'],
    ['THDL006A','NO-CM-THDL006A-20260218-0900','hoThresh','-89','2026-02-18 09:00'],
    ['THDL006A','NO-CM-THDL006A-20260218-0900','qOffset','4','2026-02-18 09:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0800','maxNumUe','160','2026-02-18 08:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0800','txPower','38','2026-02-18 08:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0800','loadLimit','75','2026-02-18 08:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0800','hoThresh','-97','2026-02-18 08:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0800','sinrOffset','-1','2026-02-18 08:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0900','maxNumUe','185','2026-02-18 09:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0900','txPower','34','2026-02-18 09:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0900','loadLimit','92','2026-02-18 09:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0900','hoThresh','-90','2026-02-18 09:00'],
    ['THDL006B','NO-CM-THDL006B-20260218-0900','sinrOffset','-3','2026-02-18 09:00'],
  ].map(([cell,index,parameter,value,date])=>({node:'TH006',site:'THDL006',cell,index,parameter,value,date})),
  ericsson: [
    ['THDL006A','ER-CM-THDL006A-20260218-0800','maxNumActUE','180','2026-02-18 08:00'],
    ['THDL006A','ER-CM-THDL006A-20260218-0800','dlBw2','20MHz','2026-02-18 08:00'],
    ['THDL006A','ER-CM-THDL006A-20260218-0800','loadLimit','85','2026-02-18 08:00'],
    ['THDL006A','ER-CM-THDL006A-20260218-0800','hoTime','64','2026-02-18 08:00'],
    ['THDL006A','ER-CM-THDL006A-20260218-0800','qOffset','2','2026-02-18 08:00'],
    ['THDL006A','ER-CM-THDL006A-20260218-0900','maxNumActUE','210','2026-02-18 09:00'],
    ['THDL006A','ER-CM-THDL006A-20260218-0900','dlBw2','15MHz','2026-02-18 09:00'],
    ['THDL006A','ER-CM-THDL006A-20260218-0900','loadLimit','97','2026-02-18 09:00'],
    ['THDL006A','ER-CM-THDL006A-20260218-0900','hoTime','72','2026-02-18 09:00'],
    ['THDL006A','ER-CM-THDL006A-20260218-0900','qOffset','4','2026-02-18 09:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0800','maxNumActUE','150','2026-02-18 08:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0800','dlBw2','20MHz','2026-02-18 08:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0800','loadLimit','80','2026-02-18 08:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0800','sinrOffset','0','2026-02-18 08:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0800','txPwr','37','2026-02-18 08:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0900','maxNumActUE','175','2026-02-18 09:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0900','dlBw2','15MHz','2026-02-18 09:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0900','loadLimit','92','2026-02-18 09:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0900','sinrOffset','-2','2026-02-18 09:00'],
    ['THDL006B','ER-CM-THDL006B-20260218-0900','txPwr','33','2026-02-18 09:00'],
  ].map(([cell,index,parameter,value,date])=>({node:'TH006',site:'THDL006',cell,index,parameter,value,date})),
}

const cmHistoryRows: HistoryRow[] = [
  ['THDL006A','CHG-THDL006A-20260218-0800-0900','maxNumUe','200','240','2026-02-18 09:14'],
  ['THDL006A','CHG-THDL006A-20260218-0800-0900','loadLimit','80','95','2026-02-18 09:14'],
  ['THDL006A','CHG-THDL006A-20260218-0800-0900','hoThresh','-95','-89','2026-02-18 09:14'],
  ['THDL006A','CHG-THDL006A-20260218-0800-0900','qOffset','2','4','2026-02-18 09:14'],
  ['THDL006A','CHG-THDL006A-20260218-0800-0900','sinrOffset','-1','-3','2026-02-18 09:14'],
  ['THDL006B','CHG-THDL006B-20260218-0800-0900','maxNumActUE','150','175','2026-02-18 09:18'],
  ['THDL006B','CHG-THDL006B-20260218-0800-0900','dlBw2','20MHz','15MHz','2026-02-18 09:18'],
  ['THDL006B','CHG-THDL006B-20260218-0800-0900','loadLimit','80','92','2026-02-18 09:18'],
  ['THDL006B','CHG-THDL006B-20260218-0800-0900','sinrOffset','0','-2','2026-02-18 09:18'],
  ['THDL006B','CHG-THDL006B-20260218-0800-0900','txPwr','37','33','2026-02-18 09:18'],
  ['THDL006A','CHG-HW-THDL006A-20260218-0800-0900','MaxUE','210','240','2026-02-18 09:00'],
  ['THDL006A','CHG-HW-THDL006A-20260218-0800-0900','LoadLimit','78','101','2026-02-18 09:00'],
  ['THDL006A','CHG-HW-THDL006A-20260218-0800-0900','HO_Threshold','-95','-89','2026-02-18 09:00'],
  ['THDL006A','CHG-HW-THDL006A-20260218-0800-0900','Qoffset','2','4','2026-02-18 09:00'],
  ['THDL006A','CHG-HW-THDL006A-20260218-0800-0900','SINR_Offset','-1','-3','2026-02-18 09:00'],
  ['THDL006B','CHG-NO-THDL006B-20260218-0800-0900','maxNumUe','160','185','2026-02-18 09:10'],
  ['THDL006B','CHG-NO-THDL006B-20260218-0800-0900','loadLimit','75','92','2026-02-18 09:10'],
  ['THDL006B','CHG-NO-THDL006B-20260218-0800-0900','hoThresh','-97','-90','2026-02-18 09:10'],
  ['THDL006B','CHG-NO-THDL006B-20260218-0800-0900','sinrOffset','-1','-3','2026-02-18 09:10'],
  ['THDL006B','CHG-NO-THDL006B-20260218-0800-0900','txPower','38','34','2026-02-18 09:10'],
].map(([cell,index,parameter,oldValue,newValue,date])=>({node:'TH006',site:'THDL006',cell,index,parameter,oldValue,newValue,date}))

export function ReportingLandingPage() {
  return (
    <ReportingShell title='Reporting'>
      <Card className='border-none bg-gradient-to-r from-primary/5 via-background to-primary/5 shadow-lg'>
        <CardHeader><CardTitle>Reporting</CardTitle></CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          از سایدبار مسیرهای Reporting را باز کن و وارد صفحه‌های Raw Data یا History شو.
        </CardContent>
      </Card>
    </ReportingShell>
  )
}

export function ReportingRawPage({ domain, vendor }: { domain: ReportingDomain; vendor: ReportingVendor }) {
  const rows = domain === 'cm' ? cmRawByVendor[vendor] : []
  return (
    <ReportingShell title={`${labels[domain]} / Raw Data / ${labels[vendor]}`}>
      <FilterBar domain={domain} vendor={vendor} view='Raw Data' />
      <ActionRow />
      <TableCard title='CM Raw Data'><RawTable rows={rows} /></TableCard>
    </ReportingShell>
  )
}

export function ReportingHistoryPage({ domain }: { domain: ReportingDomain }) {
  return (
    <ReportingShell title={`${labels[domain]} / History`}>
      <FilterBar domain={domain} view='History' />
      <ActionRow />
      <TableCard title='CM History'>
        {domain === 'cm' ? (
          <HistoryTable rows={cmHistoryRows} />
        ) : (
          <div className='p-6 text-sm text-muted-foreground'>Sample history data for this domain will be added.</div>
        )}
      </TableCard>
    </ReportingShell>
  )
}

function ReportingShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center gap-4'><ThemeSwitch /><ProfileDropdown /></div>
      </Header>
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
  return (
    <Card className='mt-4 overflow-hidden border-none shadow-xl ring-1 ring-border/60'>
      <CardHeader className='bg-muted/40'><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className='p-0'>{children}</CardContent>
    </Card>
  )
}

function RawTable({ rows }: { rows: RawRow[] }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[980px] text-left text-sm'>
        <thead className='sticky top-0 z-10 bg-card'><tr className='border-b bg-muted/40'>{['Node','Site','Cell','Index','Parameter','Value','Date'].map((h)=><th key={h} className='px-3 py-3 font-semibold'>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r)=><tr key={`${r.index}-${r.parameter}`} className='border-b transition duration-300 hover:bg-primary/5'><td className='px-3 py-2'>{r.node}</td><td className='px-3 py-2'>{r.site}</td><td className='px-3 py-2 font-medium'>{r.cell}</td><td className='px-3 py-2'>{r.index}</td><td className='px-3 py-2'>{r.parameter}</td><td className='px-3 py-2 tabular-nums'>{r.value}</td><td className='px-3 py-2'>{r.date}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[1080px] text-left text-sm'>
        <thead className='sticky top-0 z-10 bg-card'><tr className='border-b bg-muted/40'>{['Node','Site','Cell','Index','Parameter','Old Value','New Value','Date'].map((h)=><th key={h} className='px-3 py-3 font-semibold'>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r)=><tr key={`${r.index}-${r.parameter}`} className='border-b transition duration-300 hover:bg-primary/5'><td className='px-3 py-2'>{r.node}</td><td className='px-3 py-2'>{r.site}</td><td className='px-3 py-2 font-medium'>{r.cell}</td><td className='px-3 py-2'>{r.index}</td><td className='px-3 py-2'>{r.parameter}</td><td className='px-3 py-2 text-amber-600'>{r.oldValue}</td><td className='px-3 py-2 text-emerald-600'>{r.newValue}</td><td className='px-3 py-2'>{r.date}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
