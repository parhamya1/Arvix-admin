import { useMemo, useState } from 'react'
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

type Vendor = 'Huawei' | 'Nokia' | 'Ericsson'
type Domain = 'CM' | 'PM' | 'License' | 'Inventory' | 'UserLog'
type ParserStatus = 'OK' | 'PARTIAL' | 'FAILED'

const badgeClass: Record<ParserStatus, string> = {
  OK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  PARTIAL:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
}

const rawFileRegistry = [
  ['f_cm_nok_20260218_0800', 'CM', 'Nokia', 'NetAct', 'XML', 'true', '2026-02-18 08:00', '2026-02-18 08:00', '2026-02-18 08:02', 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', '9f1a…', 'cm-nokia', '1.2', 'OK', '12000', ''],
  ['f_cm_nok_20260218_0900', 'CM', 'Nokia', 'NetAct', 'XML', 'true', '2026-02-18 09:00', '2026-02-18 09:00', '2026-02-18 09:02', 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', '72ac…', 'cm-nokia', '1.2', 'OK', '12010', ''],
  ['f_cm_eri_20260218_0800', 'CM', 'Ericsson', 'ENM', 'JSON', 'false', '2026-02-18 08:00', '2026-02-18 08:00', '2026-02-18 08:03', 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', '1a7b…', 'cm-eric', '1.1', 'OK', '9800', ''],
  ['f_cm_hua_20260218_0800', 'CM', 'Huawei', 'U2020', 'CSV', 'false', '2026-02-18 08:00', '2026-02-18 08:00', '2026-02-18 08:05', 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', '7c2d…', 'cm-hw', '1.0', 'PARTIAL', '10100', 'missing field: object_type'],
] as string[][]

const rawKvIndex = [
  ['r1', 'f_cm_nok_20260218_0800', 'CM', 'Nokia', '2026-02-18 08:00', 'CELL', 'LNCEL-HEL-221', 'KFI-HEL-221', 'LNCEL', 'maxNumUe', '200', '', 'users', 'PARAM', 'OK'],
  ['r2', 'f_cm_nok_20260218_0800', 'CM', 'Nokia', '2026-02-18 08:00', 'CELL', 'LNCEL-HEL-221', 'KFI-HEL-221', 'LNCEL', 'txPower', '40', '', 'W', 'PARAM', 'OK'],
  ['r3', 'f_cm_nok_20260218_0900', 'CM', 'Nokia', '2026-02-18 09:00', 'CELL', 'LNCEL-HEL-221', 'KFI-HEL-221', 'LNCEL', 'maxNumUe', '240', '', 'users', 'PARAM', 'OK'],
  ['r4', 'f_cm_eri_20260218_0800', 'CM', 'Ericsson', '2026-02-18 08:00', 'CELL', 'EUtranCellFDD-HEL-305', 'KFI-HEL-305', 'EUtranCellFDD', 'maxNumActUE', '180', '', 'users', 'PARAM', 'OK'],
  ['r5', 'f_cm_hua_20260218_0800', 'CM', 'Huawei', '2026-02-18 08:00', 'CELL', 'CELL-TMP-087', 'KFI-TMP-087', 'CELL', 'MaxUE', '210', '', 'users', 'PARAM', 'PARTIAL'],
] as string[][]

const cmHistory = [
  ['c1', 'Nokia', 'CELL', 'KFI-HEL-221', 'LNCEL-HEL-221', 'LNCEL', 'MaxUE', 'maxNumUe', '200', '240', '2026-02-18 09:14', '2026-02-18 08:00', '2026-02-18 09:00', 'USER', 'f_cm_nok_20260218_0800', 'f_cm_nok_20260218_0900'],
] as string[][]

const pmHistory = [
  ['k1', 'Nokia', 'CELL', 'KFI-HEL-221', 'LNCEL-HEL-221', 'ThroughputDL', '79', '105', '-26', 'CRITICAL', '2026-02-18 14:00', 'f_pm_nok_20260218_1400'],
  ['k2', 'Nokia', 'CELL', 'KFI-HEL-221', 'LNCEL-HEL-221', 'DropRate', '0.96', '0.60', '0.36', 'WARNING', '2026-02-18 14:00', 'f_pm_nok_20260218_1400'],
] as string[][]

export function ReportingPage() {
  const [domain, setDomain] = useState<Domain>('CM')
  const [view, setView] = useState<'raw' | 'history'>('raw')
  const [vendor, setVendor] = useState<Vendor>('Nokia')
  const [search, setSearch] = useState('')

  const filteredRaw = useMemo(
    () =>
      rawKvIndex.filter(
        (r) =>
          r[2] === domain.toUpperCase() &&
          r[3] === vendor &&
          r.join(' ').toLowerCase().includes(search.toLowerCase())
      ),
    [domain, vendor, search]
  )

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Reporting</h1>
          <p className='text-muted-foreground'>Raw Data + Normalized History</p>
        </div>

        <Card className='mt-4'>
          <CardHeader>
            <CardTitle>Global Context Bar</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-3 md:grid-cols-3 lg:grid-cols-6'>
            <Select defaultValue='24h'><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='24h'>Last 24h</SelectItem><SelectItem value='7d'>7d</SelectItem><SelectItem value='custom'>Custom</SelectItem></SelectContent></Select>
            <Select defaultValue='network'><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='network'>Network</SelectItem><SelectItem value='region'>Region</SelectItem><SelectItem value='site'>Site</SelectItem><SelectItem value='node'>Node</SelectItem><SelectItem value='cell'>Cell</SelectItem></SelectContent></Select>
            <Select value={domain} onValueChange={(v) => setDomain(v as Domain)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='CM'>CM</SelectItem><SelectItem value='PM'>PM</SelectItem><SelectItem value='License'>License</SelectItem><SelectItem value='Inventory'>Inventory</SelectItem><SelectItem value='UserLog'>User Log</SelectItem></SelectContent></Select>
            <Select value={view} onValueChange={(v) => setView(v as 'raw' | 'history')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='raw'>Raw Data</SelectItem><SelectItem value='history'>History (Normalized)</SelectItem></SelectContent></Select>
            <Select value={vendor} onValueChange={(v) => setVendor(v as Vendor)} disabled={view === 'history'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='Huawei'>Huawei</SelectItem><SelectItem value='Nokia'>Nokia</SelectItem><SelectItem value='Ericsson'>Ericsson</SelectItem></SelectContent></Select>
            <Input placeholder='Search entity / parameter' value={search} onChange={(e) => setSearch(e.target.value)} />
          </CardContent>
        </Card>

        <div className='mt-4 flex gap-2'>
          <Button variant='outline'>Export CSV</Button>
          <Button variant='outline'>Export XLSX</Button>
        </div>

        {view === 'raw' ? (
          <div className='mt-4 grid gap-4 xl:grid-cols-2'>
            <Card>
              <CardHeader><CardTitle>raw_file_registry</CardTitle></CardHeader>
              <CardContent>
                <SimpleTable
                  headers={['file_id','domain','vendor','source_system','format','compressed','file_time_start_utc','file_time_end_utc','ingest_time_utc','storage_path','hash_sha256','parser_name','parser_version','parse_status','records_count','error_msg']}
                  rows={rawFileRegistry.filter((r) => r[1] === domain.toUpperCase() && r[2] === vendor)}
                  statusIndex={13}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>raw_kv_index</CardTitle></CardHeader>
              <CardContent>
                <SimpleTable
                  headers={['idx_id','file_id','domain','vendor','ts_utc','entity_type','entity_id_native','entity_id_canonical','native_object_type','native_param','value_num','value_str','unit','row_kind','parse_status']}
                  rows={filteredRaw}
                  statusIndex={14}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className='mt-4 grid gap-4'>
            {domain === 'CM' && (
              <Card><CardHeader><CardTitle>cm_history_changes</CardTitle></CardHeader><CardContent><SimpleTable headers={['change_id','vendor','entity_type','entity_id_canonical','entity_id_native','native_object_type','logical_param','native_param','old_value_num','new_value_num','change_time_utc','snapshot_prev_ts_utc','snapshot_curr_ts_utc','change_source','raw_file_id_prev','raw_file_id_curr']} rows={cmHistory} /></CardContent></Card>
            )}
            {domain === 'PM' && (
              <Card><CardHeader><CardTitle>pm_history_kpi</CardTitle></CardHeader><CardContent><SimpleTable headers={['kpi_row_id','vendor','scope','scope_id_canonical','scope_id_native','kpi_name','value_num','baseline_num','delta_num','status','ts_utc','raw_file_id']} rows={pmHistory} /></CardContent></Card>
            )}
            {domain !== 'CM' && domain !== 'PM' && (
              <Card>
                <CardHeader><CardTitle>{domain} History</CardTitle></CardHeader>
                <CardContent><p className='text-sm text-muted-foreground'>نمونه دیتا برای این domain در مرحله بعدی اضافه می‌شود.</p></CardContent>
              </Card>
            )}
          </div>
        )}
      </Main>
    </>
  )
}

function SimpleTable({ headers, rows, statusIndex }: { headers: string[]; rows: string[][]; statusIndex?: number }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[920px] text-left text-sm'>
        <thead><tr className='border-b'>{headers.map((h) => <th key={h} className='px-2 py-2 font-semibold'>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row[0]}-${i}`} className='border-b'>
              {row.map((cell, cIdx) => (
                <td key={`${cell}-${cIdx}`} className='px-2 py-2'>
                  {statusIndex === cIdx && ['OK', 'PARTIAL', 'FAILED'].includes(cell) ? (
                    <Badge variant='secondary' className={badgeClass[cell as ParserStatus]}>{cell}</Badge>
                  ) : (cell || '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
