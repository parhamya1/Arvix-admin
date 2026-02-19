import { type ReactNode } from 'react'
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

export type ReportingDomain =
  | 'cm'
  | 'pm'
  | 'license'
  | 'inventory'
  | 'user-log'

export type ReportingVendor = 'huawei' | 'nokia' | 'ericsson'

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

const rawRegistryByDomain = {
  cm: [
    ['f_cm_nok_20260218_0800', 'CM', 'Nokia', 'NetAct', 'XML', 'OK', '12000'],
    ['f_cm_nok_20260218_0900', 'CM', 'Nokia', 'NetAct', 'XML', 'OK', '12010'],
    ['f_cm_eri_20260218_0800', 'CM', 'Ericsson', 'ENM', 'JSON', 'OK', '9800'],
    ['f_cm_hua_20260218_0800', 'CM', 'Huawei', 'U2020', 'CSV', 'PARTIAL', '10100'],
  ],
  pm: [
    ['f_pm_nok_20260218_1400', 'PM', 'Nokia', 'NetAct', 'CSV', 'OK', '48000'],
    ['f_pm_eri_20260218_1400', 'PM', 'Ericsson', 'ENM', 'XML', 'OK', '45500'],
    ['f_pm_hua_20260218_1400', 'PM', 'Huawei', 'U2020', 'CSV', 'OK', '47200'],
  ],
  license: [
    ['f_lic_nok_20260218', 'LICENSE', 'Nokia', 'NetAct', 'JSON', 'OK', '120'],
    ['f_lic_eri_20260218', 'LICENSE', 'Ericsson', 'ENM', 'JSON', 'OK', '110'],
    ['f_lic_hua_20260218', 'LICENSE', 'Huawei', 'U2020', 'JSON', 'OK', '130'],
  ],
  inventory: [
    ['f_inv_eri_20260218', 'INVENTORY', 'Ericsson', 'ENM', 'JSON', 'OK', '2000'],
    ['f_inv_nok_20260218', 'INVENTORY', 'Nokia', 'NetAct', 'JSON', 'OK', '1860'],
    ['f_inv_hua_20260218', 'INVENTORY', 'Huawei', 'U2020', 'JSON', 'OK', '1910'],
  ],
  'user-log': [
    ['f_log_nok_20260218', 'USERLOG', 'Nokia', 'NetAct', 'JSON', 'OK', '3500'],
    ['f_log_eri_20260218', 'USERLOG', 'Ericsson', 'ENM', 'JSON', 'OK', '3100'],
    ['f_log_hua_20260218', 'USERLOG', 'Huawei', 'U2020', 'JSON', 'OK', '3300'],
  ],
}

const rawKvByDomain = {
  cm: [
    ['2026-02-18 08:00', 'CELL', 'LNCEL-HEL-221', 'maxNumUe', '200', 'users', 'Nokia'],
    ['2026-02-18 09:00', 'CELL', 'LNCEL-HEL-221', 'maxNumUe', '240', 'users', 'Nokia'],
    ['2026-02-18 08:00', 'CELL', 'EUtranCellFDD-HEL-305', 'maxNumActUE', '180', 'users', 'Ericsson'],
    ['2026-02-18 08:00', 'CELL', 'CELL-TMP-087', 'MaxUE', '210', 'users', 'Huawei'],
  ],
  pm: [
    ['2026-02-18 14:00', 'CELL', 'LNCEL-HEL-221', 'thpDlMbps', '79', 'Mbps', 'Nokia'],
    ['2026-02-18 14:00', 'CELL', 'LNCEL-HEL-221', 'dropRatePct', '0.96', '%', 'Nokia'],
    ['2026-02-18 14:00', 'CELL', 'EUtranCellFDD-HEL-305', 'dlThroughput', '88', 'Mbps', 'Ericsson'],
    ['2026-02-18 14:00', 'CELL', 'CELL-TMP-087', 'DL_THP', '84', 'Mbps', 'Huawei'],
  ],
  license: [
    ['2026-02-18 00:00', 'NODE', 'ME-HEL-01', 'lteCells.used', '1120', 'count', 'Nokia'],
    ['2026-02-18 00:00', 'NODE', 'ME-HEL-02', 'lteCells.used', '990', 'count', 'Ericsson'],
    ['2026-02-18 00:00', 'NODE', 'ME-TMP-01', 'lteCells.used', '940', 'count', 'Huawei'],
  ],
  inventory: [
    ['2026-02-18 00:00', 'NODE', 'ME-HEL-02', 'swVersion', '21Q', '-', 'Ericsson'],
    ['2026-02-18 00:00', 'NODE', 'ME-HEL-01', 'swVersion', '22A', '-', 'Nokia'],
    ['2026-02-18 00:00', 'NODE', 'ME-TMP-01', 'swVersion', 'V100R021', '-', 'Huawei'],
  ],
  'user-log': [
    ['2026-02-18 09:14', 'CELL', 'LNCEL-HEL-221', 'cmd', 'set maxNumUe=240', '-', 'Nokia'],
    ['2026-02-18 09:18', 'CELL', 'EUtranCellFDD-HEL-305', 'cmd', 'set DLBW2=18', '-', 'Ericsson'],
    ['2026-02-18 09:20', 'CELL', 'CELL-TMP-087', 'cmd', 'set MaxUE=210', '-', 'Huawei'],
  ],
}

const historyByDomain = {
  cm: {
    title: 'History (Parameter Changes) — Normalized',
    headers: ['change_id', 'vendor', 'entity_id', 'logical_param', 'old_value', 'new_value', 'change_time_utc', 'raw_file_id_prev', 'raw_file_id_curr'],
    rows: [
      ['c1', 'Nokia', 'KFI-HEL-221', 'MaxUE', '200', '240', '2026-02-18 09:14', 'f_cm_nok_20260218_0800', 'f_cm_nok_20260218_0900'],
      ['c2', 'Ericsson', 'KFI-HEL-305', 'DLBW2', '20', '18', '2026-02-18 09:18', 'f_cm_eri_20260218_0700', 'f_cm_eri_20260218_0800'],
    ],
  },
  pm: {
    title: 'History (KPI / Trend vs Baseline) — Normalized',
    headers: ['kpi_row_id', 'vendor', 'scope_id', 'kpi_name', 'value_num', 'baseline_num', 'delta_num', 'status', 'ts_utc'],
    rows: [
      ['k1', 'Nokia', 'KFI-HEL-221', 'ThroughputDL', '79', '105', '-26', 'CRITICAL', '2026-02-18 14:00'],
      ['k2', 'Nokia', 'KFI-HEL-221', 'DropRate', '0.96', '0.60', '+0.36', 'WARNING', '2026-02-18 14:00'],
    ],
  },
  license: {
    title: 'History (Utilization / Expiry / Risk) — Normalized',
    headers: ['lic_hist_id', 'vendor', 'node_id', 'license_type', 'entitlement_num', 'used_num', 'util_pct', 'expiry_date', 'risk_flag'],
    rows: [['lh1', 'Nokia', 'HEL-01', 'LTE Cells', '1200', '1120', '93.33', '2027-12-31', 'WARN']],
  },
  inventory: {
    title: 'History (HW/SW Changes / Lifecycle) — Normalized',
    headers: ['inv_change_id', 'vendor', 'node_id', 'field_changed', 'old_value', 'new_value', 'change_time_utc'],
    rows: [['ic1', 'Ericsson', 'HEL-02', 'sw_version', '21P', '21Q', '2026-02-18 08:26']],
  },
  'user-log': {
    title: 'History (Commands / Actions) — Normalized',
    headers: ['event_id', 'vendor', 'ts_utc', 'user_id', 'action_type', 'target_id', 'result', 'ticket_id'],
    rows: [['e1', 'Nokia', '2026-02-18 09:14', 'ops01', 'MODIFY', 'KFI-HEL-221', 'SUCCESS', 'INC-44102']],
  },
}

export function ReportingLandingPage() {
  return (
    <ReportingShell title='Reporting'>
      <Card>
        <CardHeader>
          <CardTitle>Reporting Hierarchy Ready</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          لطفاً از سایدبار سمت چپ، مسیرهای CM/PM/License/Inventory/User Log را باز کنید و صفحات Raw Data یا History را انتخاب کنید.
        </CardContent>
      </Card>
    </ReportingShell>
  )
}

export function ReportingRawPage({ domain, vendor }: { domain: ReportingDomain; vendor: ReportingVendor }) {
  const vendorLabel = labels[vendor]
  const rows = rawKvByDomain[domain].filter((r) => r[6] === vendorLabel)

  return (
    <ReportingShell title={`${labels[domain]} / Raw Data / ${vendorLabel}`}>
      <Card>
        <CardHeader>
          <CardTitle>Global Context Bar</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-3 xl:grid-cols-6'>
          <Input value='Last 24h' readOnly />
          <Input value='Network / Region / Site / Node / Cell' readOnly />
          <Input value={labels[domain]} readOnly />
          <Input value='Raw Data' readOnly />
          <Input value={vendorLabel} readOnly />
          <Input placeholder='Search Entity / Parameter' />
        </CardContent>
      </Card>

      <div className='mt-4 flex gap-2'>
        <Button variant='outline'>Export CSV</Button>
        <Button variant='outline'>Export XLSX</Button>
      </div>

      <div className='mt-4 grid gap-4 xl:grid-cols-2'>
        <Card>
          <CardHeader><CardTitle>raw_file_registry</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              headers={['file_id', 'domain', 'vendor', 'source_system', 'format', 'parse_status', 'records_count']}
              rows={rawRegistryByDomain[domain].filter((r) => r[2] === vendorLabel)}
              statusColumn={5}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>raw_kv_index</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              headers={['ts_utc', 'entity_type', 'entity_id_native', 'native_param', 'value', 'unit', 'vendor']}
              rows={rows}
            />
          </CardContent>
        </Card>
      </div>
    </ReportingShell>
  )
}

export function ReportingHistoryPage({ domain }: { domain: ReportingDomain }) {
  const config = historyByDomain[domain]

  return (
    <ReportingShell title={`${labels[domain]} / History (Normalized)`}>
      <Card>
        <CardHeader><CardTitle>{config.title}</CardTitle></CardHeader>
        <CardContent>
          <div className='mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6'>
            <Select defaultValue='24h'>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value='24h'>Last 24h</SelectItem><SelectItem value='7d'>7d</SelectItem></SelectContent>
            </Select>
            <Input placeholder='Scope / Entity filter' />
            <Input placeholder='Parameter or KPI filter' />
            <Select defaultValue='all'>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value='all'>All Vendors</SelectItem><SelectItem value='huawei'>Huawei</SelectItem><SelectItem value='nokia'>Nokia</SelectItem><SelectItem value='ericsson'>Ericsson</SelectItem></SelectContent>
            </Select>
            <Button variant='outline'>Export CSV</Button>
            <Button variant='outline'>Export XLSX</Button>
          </div>
          <DataTable headers={config.headers} rows={config.rows} />
        </CardContent>
      </Card>
    </ReportingShell>
  )
}

function ReportingShell({ title, children }: { title: string; children: ReactNode }) {
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
        <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
        <div className='mt-4'>{children}</div>
      </Main>
    </>
  )
}

function DataTable({ headers, rows, statusColumn }: { headers: string[]; rows: string[][]; statusColumn?: number }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[920px] text-left text-sm'>
        <thead>
          <tr className='border-b'>
            {headers.map((header) => (
              <th key={header} className='px-2 py-2 font-semibold'>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className='border-b'>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className='px-2 py-2'>
                  {statusColumn === cellIndex ? (
                    <Badge variant='secondary'>{cell}</Badge>
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
