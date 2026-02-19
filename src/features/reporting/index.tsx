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

export type ReportingDomain =
  | 'cm'
  | 'pm'
  | 'license'
  | 'inventory'
  | 'user-log'

export type ReportingVendor = 'huawei' | 'nokia' | 'ericsson'

type RawRow = {
  node: string
  site: string
  cell: string
  path: string
  index: string
  parameter: string
  value: string
  date: string
}

type HistoryRow = {
  node: string
  site: string
  cell: string
  parameter: string
  oldValue: string
  newValue: string
  date: string
  pathPrev: string
  pathCurr: string
  indexPrev: string
  indexCurr: string
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
    { node: 'TMP-01', site: 'TMP-01', cell: 'CELL-TMP-087', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0001', parameter: 'MaxUE', value: '210', date: '2026-02-18 08:00' },
    { node: 'TMP-01', site: 'TMP-01', cell: 'CELL-TMP-087', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0002', parameter: 'TxPwr', value: '36', date: '2026-02-18 08:00' },
    { node: 'TMP-01', site: 'TMP-01', cell: 'CELL-TMP-087', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0003', parameter: 'MaxUE', value: '240', date: '2026-02-18 09:00' },
    { node: 'TMP-01', site: 'TMP-01', cell: 'CELL-TMP-087', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0004', parameter: 'TxPwr', value: '36', date: '2026-02-18 09:00' },
    { node: 'HEL-04', site: 'HEL-04', cell: 'CELL-HEL-906', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0005', parameter: 'LoadLimit', value: '78', date: '2026-02-18 08:00' },
    { node: 'HEL-04', site: 'HEL-04', cell: 'CELL-HEL-906', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0006', parameter: 'LoadLimit', value: '101', date: '2026-02-18 09:00' },
    { node: 'OUL-03', site: 'OUL-03', cell: 'CELL-OUL-711', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0007', parameter: 'MaxUE', value: '160', date: '2026-02-18 08:00' },
    { node: 'OUL-03', site: 'OUL-03', cell: 'CELL-OUL-711', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0008', parameter: 'MaxUE', value: '185', date: '2026-02-18 09:00' },
    { node: 'JYV-01', site: 'JYV-01', cell: 'CELL-JYV-204', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0009', parameter: 'TxPwr', value: '38', date: '2026-02-18 08:00' },
    { node: 'JYV-01', site: 'JYV-01', cell: 'CELL-JYV-204', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0010', parameter: 'TxPwr', value: '34', date: '2026-02-18 09:00' },
    { node: 'TKU-02', site: 'TKU-02', cell: 'CELL-TKU-522', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0011', parameter: 'DLBW3', value: '20MHz', date: '2026-02-18 08:00' },
    { node: 'TKU-02', site: 'TKU-02', cell: 'CELL-TKU-522', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0012', parameter: 'DLBW3', value: '10MHz', date: '2026-02-18 09:00' },
    { node: 'HEL-06', site: 'HEL-06', cell: 'CELL-HEL-845', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0013', parameter: 'SINR_Offset', value: '-1', date: '2026-02-18 08:00' },
    { node: 'HEL-06', site: 'HEL-06', cell: 'CELL-HEL-845', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0014', parameter: 'SINR_Offset', value: '-3', date: '2026-02-18 09:00' },
    { node: 'TMP-04', site: 'TMP-04', cell: 'CELL-TMP-577', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0015', parameter: 'TxPwr', value: '42', date: '2026-02-18 08:00' },
    { node: 'TMP-04', site: 'TMP-04', cell: 'CELL-TMP-577', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0016', parameter: 'TxPwr', value: '39', date: '2026-02-18 09:00' },
    { node: 'OUL-01', site: 'OUL-01', cell: 'CELL-OUL-118', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0017', parameter: 'MaxUE', value: '180', date: '2026-02-18 08:00' },
    { node: 'OUL-01', site: 'OUL-01', cell: 'CELL-OUL-118', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0018', parameter: 'MaxUE', value: '210', date: '2026-02-18 09:00' },
    { node: 'HEL-03', site: 'HEL-03', cell: 'CELL-HEL-402', path: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', index: 'HW-CM-0019', parameter: 'Qoffset', value: '2', date: '2026-02-18 08:00' },
    { node: 'HEL-03', site: 'HEL-03', cell: 'CELL-HEL-402', path: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', index: 'HW-CM-0020', parameter: 'Qoffset', value: '4', date: '2026-02-18 09:00' },
  ],
  nokia: [
    { node: 'HEL-01', site: 'HEL-01', cell: 'LNCEL-HEL-221', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0001', parameter: 'maxNumUe', value: '200', date: '2026-02-18 08:00' },
    { node: 'HEL-01', site: 'HEL-01', cell: 'LNCEL-HEL-221', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0002', parameter: 'maxNumUe', value: '240', date: '2026-02-18 09:00' },
    { node: 'HEL-01', site: 'HEL-01', cell: 'LNCEL-HEL-221', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0003', parameter: 'txPower', value: '40', date: '2026-02-18 08:00' },
    { node: 'HEL-01', site: 'HEL-01', cell: 'LNCEL-HEL-221', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0004', parameter: 'txPower', value: '40', date: '2026-02-18 09:00' },
    { node: 'TKU-01', site: 'TKU-01', cell: 'LNCEL-TKU-114', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0005', parameter: 'hoThresh', value: '-95', date: '2026-02-18 08:00' },
    { node: 'TKU-01', site: 'TKU-01', cell: 'LNCEL-TKU-114', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0006', parameter: 'hoThresh', value: '-89', date: '2026-02-18 09:00' },
    { node: 'HEL-04', site: 'HEL-04', cell: 'LNCEL-HEL-512', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0007', parameter: 'loadLimit', value: '80', date: '2026-02-18 08:00' },
    { node: 'HEL-04', site: 'HEL-04', cell: 'LNCEL-HEL-512', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0008', parameter: 'loadLimit', value: '95', date: '2026-02-18 09:00' },
    { node: 'TMP-04', site: 'TMP-04', cell: 'LNCEL-TMP-455', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0009', parameter: 'loadLimit', value: '75', date: '2026-02-18 08:00' },
    { node: 'TMP-04', site: 'TMP-04', cell: 'LNCEL-TMP-455', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0010', parameter: 'loadLimit', value: '92', date: '2026-02-18 09:00' },
    { node: 'OUL-03', site: 'OUL-03', cell: 'LNCEL-OUL-711', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0011', parameter: 'maxNumUe', value: '160', date: '2026-02-18 08:00' },
    { node: 'OUL-03', site: 'OUL-03', cell: 'LNCEL-OUL-711', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0012', parameter: 'maxNumUe', value: '185', date: '2026-02-18 09:00' },
    { node: 'HEL-06', site: 'HEL-06', cell: 'LNCEL-HEL-845', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0013', parameter: 'sinrOffset', value: '-1', date: '2026-02-18 08:00' },
    { node: 'HEL-06', site: 'HEL-06', cell: 'LNCEL-HEL-845', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0014', parameter: 'sinrOffset', value: '-3', date: '2026-02-18 09:00' },
    { node: 'TKU-03', site: 'TKU-03', cell: 'LNCEL-TKU-341', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0015', parameter: 'maxNumUe', value: '220', date: '2026-02-18 08:00' },
    { node: 'TKU-03', site: 'TKU-03', cell: 'LNCEL-TKU-341', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0016', parameter: 'maxNumUe', value: '260', date: '2026-02-18 09:00' },
    { node: 'LAP-01', site: 'LAP-01', cell: 'LNCEL-LAP-201', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0017', parameter: 'txPower', value: '37', date: '2026-02-18 08:00' },
    { node: 'LAP-01', site: 'LAP-01', cell: 'LNCEL-LAP-201', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0018', parameter: 'txPower', value: '33', date: '2026-02-18 09:00' },
    { node: 'HEL-07', site: 'HEL-07', cell: 'LNCEL-HEL-906', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', index: 'NO-CM-0019', parameter: 'loadLimit', value: '78', date: '2026-02-18 08:00' },
    { node: 'HEL-07', site: 'HEL-07', cell: 'LNCEL-HEL-906', path: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', index: 'NO-CM-0020', parameter: 'loadLimit', value: '101', date: '2026-02-18 09:00' },
  ],
  ericsson: [
    { node: 'HEL-02', site: 'HEL-02', cell: 'EUtranCellFDD-HEL-305', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0001', parameter: 'maxNumActUE', value: '180', date: '2026-02-18 08:00' },
    { node: 'HEL-02', site: 'HEL-02', cell: 'EUtranCellFDD-HEL-305', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0002', parameter: 'maxNumActUE', value: '210', date: '2026-02-18 09:00' },
    { node: 'HEL-02', site: 'HEL-02', cell: 'EUtranCellFDD-HEL-305', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0003', parameter: 'dlBw2', value: '20MHz', date: '2026-02-18 08:00' },
    { node: 'HEL-02', site: 'HEL-02', cell: 'EUtranCellFDD-HEL-305', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0004', parameter: 'dlBw2', value: '15MHz', date: '2026-02-18 09:00' },
    { node: 'TMP-02', site: 'TMP-02', cell: 'EUtranCellFDD-TMP-233', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0005', parameter: 'sinrOffset', value: '0', date: '2026-02-18 08:00' },
    { node: 'TMP-02', site: 'TMP-02', cell: 'EUtranCellFDD-TMP-233', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0006', parameter: 'sinrOffset', value: '-2', date: '2026-02-18 09:00' },
    { node: 'HEL-03', site: 'HEL-03', cell: 'EUtranCellFDD-HEL-402', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0007', parameter: 'qOffset', value: '2', date: '2026-02-18 08:00' },
    { node: 'HEL-03', site: 'HEL-03', cell: 'EUtranCellFDD-HEL-402', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0008', parameter: 'qOffset', value: '4', date: '2026-02-18 09:00' },
    { node: 'HEL-05', site: 'HEL-05', cell: 'EUtranCellFDD-HEL-619', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0009', parameter: 'hoTime', value: '64', date: '2026-02-18 08:00' },
    { node: 'HEL-05', site: 'HEL-05', cell: 'EUtranCellFDD-HEL-619', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0010', parameter: 'hoTime', value: '72', date: '2026-02-18 09:00' },
    { node: 'TKU-04', site: 'TKU-04', cell: 'EUtranCellFDD-TKU-609', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0011', parameter: 'loadLimit', value: '85', date: '2026-02-18 08:00' },
    { node: 'TKU-04', site: 'TKU-04', cell: 'EUtranCellFDD-TKU-609', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0012', parameter: 'loadLimit', value: '97', date: '2026-02-18 09:00' },
    { node: 'OUL-02', site: 'OUL-02', cell: 'EUtranCellFDD-OUL-644', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0013', parameter: 'maxNumActUE', value: '150', date: '2026-02-18 08:00' },
    { node: 'OUL-02', site: 'OUL-02', cell: 'EUtranCellFDD-OUL-644', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0014', parameter: 'maxNumActUE', value: '175', date: '2026-02-18 09:00' },
    { node: 'HEL-08', site: 'HEL-08', cell: 'EUtranCellFDD-HEL-845', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0015', parameter: 'sinrOffset', value: '-1', date: '2026-02-18 08:00' },
    { node: 'HEL-08', site: 'HEL-08', cell: 'EUtranCellFDD-HEL-845', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0016', parameter: 'sinrOffset', value: '-3', date: '2026-02-18 09:00' },
    { node: 'TKU-05', site: 'TKU-05', cell: 'EUtranCellFDD-TKU-341', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0017', parameter: 'maxNumActUE', value: '220', date: '2026-02-18 08:00' },
    { node: 'TKU-05', site: 'TKU-05', cell: 'EUtranCellFDD-TKU-341', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0018', parameter: 'maxNumActUE', value: '260', date: '2026-02-18 09:00' },
    { node: 'LAP-02', site: 'LAP-02', cell: 'EUtranCellFDD-LAP-201', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', index: 'ER-CM-0019', parameter: 'txPwr', value: '37', date: '2026-02-18 08:00' },
    { node: 'LAP-02', site: 'LAP-02', cell: 'EUtranCellFDD-LAP-201', path: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', index: 'ER-CM-0020', parameter: 'txPwr', value: '33', date: '2026-02-18 09:00' },
  ],
}

const cmHistoryRows: HistoryRow[] = [
  { node: 'HEL-01', site: 'HEL-01', cell: 'LNCEL-HEL-221', parameter: 'MaxUE', oldValue: '200', newValue: '240', date: '2026-02-18 09:14', pathPrev: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', pathCurr: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', indexPrev: 'NO-CM-0001', indexCurr: 'NO-CM-0002' },
  { node: 'TKU-01', site: 'TKU-01', cell: 'LNCEL-TKU-114', parameter: 'HO_Threshold', oldValue: '-95', newValue: '-89', date: '2026-02-18 09:32', pathPrev: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', pathCurr: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', indexPrev: 'NO-CM-0005', indexCurr: 'NO-CM-0006' },
  { node: 'HEL-04', site: 'HEL-04', cell: 'LNCEL-HEL-512', parameter: 'LoadLimit', oldValue: '80', newValue: '95', date: '2026-02-18 10:45', pathPrev: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', pathCurr: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', indexPrev: 'NO-CM-0007', indexCurr: 'NO-CM-0008' },
  { node: 'TMP-04', site: 'TMP-04', cell: 'LNCEL-TMP-455', parameter: 'LoadLimit', oldValue: '75', newValue: '92', date: '2026-02-18 13:02', pathPrev: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', pathCurr: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', indexPrev: 'NO-CM-0009', indexCurr: 'NO-CM-0010' },
  { node: 'OUL-03', site: 'OUL-03', cell: 'LNCEL-OUL-711', parameter: 'MaxUE', oldValue: '160', newValue: '185', date: '2026-02-18 15:10', pathPrev: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', pathCurr: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', indexPrev: 'NO-CM-0011', indexCurr: 'NO-CM-0012' },
  { node: 'HEL-06', site: 'HEL-06', cell: 'LNCEL-HEL-845', parameter: 'SINR_Offset', oldValue: '-1', newValue: '-3', date: '2026-02-18 14:05', pathPrev: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', pathCurr: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', indexPrev: 'NO-CM-0013', indexCurr: 'NO-CM-0014' },
  { node: 'TKU-03', site: 'TKU-03', cell: 'LNCEL-TKU-341', parameter: 'MaxUE', oldValue: '220', newValue: '260', date: '2026-02-18 11:41', pathPrev: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', pathCurr: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', indexPrev: 'NO-CM-0015', indexCurr: 'NO-CM-0016' },
  { node: 'LAP-01', site: 'LAP-01', cell: 'LNCEL-LAP-201', parameter: 'TxPower', oldValue: '37', newValue: '33', date: '2026-02-18 16:00', pathPrev: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', pathCurr: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', indexPrev: 'NO-CM-0017', indexCurr: 'NO-CM-0018' },
  { node: 'HEL-07', site: 'HEL-07', cell: 'LNCEL-HEL-906', parameter: 'LoadLimit', oldValue: '78', newValue: '101', date: '2026-02-18 15:32', pathPrev: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0800.xml.gz', pathCurr: 'raw/cm/nokia/2026-02-18/vsDataLNCEL_0900.xml.gz', indexPrev: 'NO-CM-0019', indexCurr: 'NO-CM-0020' },
  { node: 'TMP-01', site: 'TMP-01', cell: 'CELL-TMP-087', parameter: 'MaxUE', oldValue: '210', newValue: '240', date: '2026-02-18 09:00', pathPrev: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', pathCurr: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', indexPrev: 'HW-CM-0001', indexCurr: 'HW-CM-0003' },
  { node: 'HEL-04', site: 'HEL-04', cell: 'CELL-HEL-906', parameter: 'LoadLimit', oldValue: '78', newValue: '101', date: '2026-02-18 09:00', pathPrev: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', pathCurr: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', indexPrev: 'HW-CM-0005', indexCurr: 'HW-CM-0006' },
  { node: 'OUL-03', site: 'OUL-03', cell: 'CELL-OUL-711', parameter: 'MaxUE', oldValue: '160', newValue: '185', date: '2026-02-18 09:00', pathPrev: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', pathCurr: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', indexPrev: 'HW-CM-0007', indexCurr: 'HW-CM-0008' },
  { node: 'JYV-01', site: 'JYV-01', cell: 'CELL-JYV-204', parameter: 'TxPower', oldValue: '38', newValue: '34', date: '2026-02-18 09:00', pathPrev: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', pathCurr: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', indexPrev: 'HW-CM-0009', indexCurr: 'HW-CM-0010' },
  { node: 'TKU-02', site: 'TKU-02', cell: 'CELL-TKU-522', parameter: 'DLBW', oldValue: '20MHz', newValue: '10MHz', date: '2026-02-18 09:00', pathPrev: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', pathCurr: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', indexPrev: 'HW-CM-0011', indexCurr: 'HW-CM-0012' },
  { node: 'HEL-06', site: 'HEL-06', cell: 'CELL-HEL-845', parameter: 'SINR_Offset', oldValue: '-1', newValue: '-3', date: '2026-02-18 09:00', pathPrev: 'raw/cm/huawei/2026-02-18/CellCfg_0800.csv', pathCurr: 'raw/cm/huawei/2026-02-18/CellCfg_0900.csv', indexPrev: 'HW-CM-0013', indexCurr: 'HW-CM-0014' },
  { node: 'HEL-02', site: 'HEL-02', cell: 'EUtranCellFDD-HEL-305', parameter: 'MaxUE', oldValue: '180', newValue: '210', date: '2026-02-18 09:10', pathPrev: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', pathCurr: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', indexPrev: 'ER-CM-0001', indexCurr: 'ER-CM-0002' },
  { node: 'HEL-02', site: 'HEL-02', cell: 'EUtranCellFDD-HEL-305', parameter: 'DLBW', oldValue: '20MHz', newValue: '15MHz', date: '2026-02-18 09:18', pathPrev: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', pathCurr: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', indexPrev: 'ER-CM-0003', indexCurr: 'ER-CM-0004' },
  { node: 'TMP-02', site: 'TMP-02', cell: 'EUtranCellFDD-TMP-233', parameter: 'SINR_Offset', oldValue: '0', newValue: '-2', date: '2026-02-18 11:20', pathPrev: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', pathCurr: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', indexPrev: 'ER-CM-0005', indexCurr: 'ER-CM-0006' },
  { node: 'HEL-03', site: 'HEL-03', cell: 'EUtranCellFDD-HEL-402', parameter: 'Qoffset', oldValue: '2', newValue: '4', date: '2026-02-18 10:22', pathPrev: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', pathCurr: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', indexPrev: 'ER-CM-0007', indexCurr: 'ER-CM-0008' },
  { node: 'HEL-05', site: 'HEL-05', cell: 'EUtranCellFDD-HEL-619', parameter: 'HO_Time', oldValue: '64', newValue: '72', date: '2026-02-18 12:30', pathPrev: 'raw/cm/ericsson/2026-02-18/eutrancell_0800.json', pathCurr: 'raw/cm/ericsson/2026-02-18/eutrancell_0900.json', indexPrev: 'ER-CM-0009', indexCurr: 'ER-CM-0010' },
]

const fallbackRawRows: Record<ReportingDomain, RawRow[]> = {
  cm: cmRawByVendor.nokia,
  pm: [
    { node: 'HEL-01', site: 'HEL-01', cell: 'LNCEL-HEL-221', path: 'raw/pm/nokia/2026-02-18/PM_LTECell_1400.csv', index: 'PM-0001', parameter: 'thpDlMbps', value: '79', date: '2026-02-18 14:00' },
  ],
  license: [
    { node: 'HEL-01', site: 'HEL-01', cell: 'ME-HEL-01', path: 'raw/license/nokia/2026-02-18/license_usage.json', index: 'LIC-0001', parameter: 'lteCells.used', value: '1120', date: '2026-02-18 00:00' },
  ],
  inventory: [
    { node: 'HEL-02', site: 'HEL-02', cell: 'ME-HEL-02', path: 'raw/inv/ericsson/2026-02-18/hw_inventory.json', index: 'INV-0001', parameter: 'swVersion', value: '21Q', date: '2026-02-18 00:00' },
  ],
  'user-log': [
    { node: 'HEL-01', site: 'HEL-01', cell: 'LNCEL-HEL-221', path: 'raw/log/nokia/2026-02-18/audit_cmd.json', index: 'LOG-0001', parameter: 'cmd', value: 'set maxNumUe=240', date: '2026-02-18 09:14' },
  ],
}

const fallbackHistoryTitles: Record<ReportingDomain, string> = {
  cm: 'History (Normalized)',
  pm: 'History (Normalized)',
  license: 'History (Normalized)',
  inventory: 'History (Normalized)',
  'user-log': 'History (Normalized)',
}

export function ReportingLandingPage() {
  return (
    <ReportingShell title='Reporting'>
      <Card className='border-none bg-gradient-to-r from-primary/5 via-background to-primary/5 shadow-lg'>
        <CardHeader>
          <CardTitle>Reporting Hierarchy آماده است</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          از منوی سمت چپ یکی از مسیرهای Reporting را باز کن و وارد صفحات Raw Data یا History شو.
        </CardContent>
      </Card>
    </ReportingShell>
  )
}

export function ReportingRawPage({
  domain,
  vendor,
}: {
  domain: ReportingDomain
  vendor: ReportingVendor
}) {
  const rows = domain === 'cm' ? cmRawByVendor[vendor] : fallbackRawRows[domain]

  return (
    <ReportingShell title={`${labels[domain]} / Raw Data / ${labels[vendor]}`}>
      <FilterBar domain={domain} vendor={vendor} view='Raw Data' />
      <div className='mt-4 flex gap-2'>
        <Button variant='outline' className='shadow-sm transition hover:-translate-y-0.5'>
          Export CSV
        </Button>
        <Button variant='outline' className='shadow-sm transition hover:-translate-y-0.5'>
          Export XLSX
        </Button>
      </div>

      <Card className='mt-4 overflow-hidden border-none shadow-xl ring-1 ring-border/60'>
        <CardHeader className='bg-muted/40'>
          <CardTitle>{domain.toUpperCase()} Raw Data</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <RawTable rows={rows} />
        </CardContent>
      </Card>
    </ReportingShell>
  )
}

export function ReportingHistoryPage({ domain }: { domain: ReportingDomain }) {
  const rows = domain === 'cm' ? cmHistoryRows : []

  return (
    <ReportingShell title={`${labels[domain]} / History (Normalized)`}>
      <FilterBar domain={domain} view='History (Normalized)' />
      <div className='mt-4 flex gap-2'>
        <Button variant='outline' className='shadow-sm transition hover:-translate-y-0.5'>
          Export CSV
        </Button>
        <Button variant='outline' className='shadow-sm transition hover:-translate-y-0.5'>
          Export XLSX
        </Button>
      </div>

      <Card className='mt-4 overflow-hidden border-none shadow-xl ring-1 ring-border/60'>
        <CardHeader className='bg-muted/40'>
          <CardTitle>{fallbackHistoryTitles[domain]}</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {domain === 'cm' ? (
            <HistoryTable rows={rows} />
          ) : (
            <div className='p-6 text-sm text-muted-foreground'>
              Sample history data for {labels[domain]} will be expanded next.
            </div>
          )}
        </CardContent>
      </Card>
    </ReportingShell>
  )
}

function FilterBar({
  domain,
  vendor,
  view,
}: {
  domain: ReportingDomain
  vendor?: ReportingVendor
  view: string
}) {
  return (
    <Card className='border-none bg-card shadow-lg ring-1 ring-border/60'>
      <CardHeader>
        <CardTitle className='text-base'>Global Context Bar</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-3 md:grid-cols-3 xl:grid-cols-6'>
        <Select defaultValue='24h'>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='24h'>Last 24h</SelectItem>
            <SelectItem value='7d'>7d</SelectItem>
            <SelectItem value='custom'>Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue='cell'>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='network'>Network</SelectItem>
            <SelectItem value='region'>Region</SelectItem>
            <SelectItem value='site'>Site</SelectItem>
            <SelectItem value='node'>Node</SelectItem>
            <SelectItem value='cell'>Cell</SelectItem>
          </SelectContent>
        </Select>
        <Input value={labels[domain]} readOnly />
        <Input value={view} readOnly />
        {vendor ? <Input value={labels[vendor]} readOnly /> : <Input placeholder='Vendor filter' />}
        <Input placeholder='Search Node / Site / Cell / Parameter' />
      </CardContent>
    </Card>
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

function RawTable({ rows }: { rows: RawRow[] }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[980px] text-left text-sm'>
        <thead className='sticky top-0 z-10 bg-card'>
          <tr className='border-b bg-muted/40'>
            {['Node', 'Site', 'Cell', 'path', 'index', 'parameter', 'value', 'Date'].map((header) => (
              <th key={header} className='px-3 py-3 font-semibold'>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.index}
              className='border-b transition duration-300 hover:bg-primary/5'
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <td className='px-3 py-2'>{row.node}</td>
              <td className='px-3 py-2'>{row.site}</td>
              <td className='px-3 py-2 font-medium'>{row.cell}</td>
              <td className='px-3 py-2 text-xs text-muted-foreground'>{row.path}</td>
              <td className='px-3 py-2'>{row.index}</td>
              <td className='px-3 py-2'>{row.parameter}</td>
              <td className='px-3 py-2 tabular-nums'>{row.value}</td>
              <td className='px-3 py-2'>{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[1400px] text-left text-sm'>
        <thead className='sticky top-0 z-10 bg-card'>
          <tr className='border-b bg-muted/40'>
            {[
              'Node',
              'Site',
              'Cell',
              'parameter',
              'old_value',
              'new_value',
              'Date',
              'path_prev',
              'path_curr',
              'index_prev',
              'index_curr',
            ].map((header) => (
              <th key={header} className='px-3 py-3 font-semibold'>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.indexPrev}-${row.indexCurr}`} className='border-b transition duration-300 hover:bg-primary/5'>
              <td className='px-3 py-2'>{row.node}</td>
              <td className='px-3 py-2'>{row.site}</td>
              <td className='px-3 py-2 font-medium'>{row.cell}</td>
              <td className='px-3 py-2'>{row.parameter}</td>
              <td className='px-3 py-2 text-amber-600'>{row.oldValue}</td>
              <td className='px-3 py-2 text-emerald-600'>{row.newValue}</td>
              <td className='px-3 py-2'>{row.date}</td>
              <td className='px-3 py-2 text-xs text-muted-foreground'>{row.pathPrev}</td>
              <td className='px-3 py-2 text-xs text-muted-foreground'>{row.pathCurr}</td>
              <td className='px-3 py-2'>{row.indexPrev}</td>
              <td className='px-3 py-2'>{row.indexCurr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
