import { type ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
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

type LicenseRawRow = {
  node: string
  site: string
  licenseItem: string
  allocated: string
  usage: string
  utilizationPct: string
  expireDate: string
  status: string
  fileReadTime: string
}

type LicenseHistoryRow = {
  vendor: string
  node: string
  site: string
  licenseItem: string
  prevUsage: string
  currUsage: string
  deltaUsage: string
  prevUtilizationPct: string
  currUtilizationPct: string
  expireDate: string
  status: string
  changeDetectedTime: string
}

type AuditLogRow = {
  auditId: string
  eventTime: string
  userName: string
  action: string
  targetDn: string
  result: string
  requestId: string
  sourceIp: string
}

type CmChangeLogRow = {
  changeId: string
  changeTime: string
  objectDn: string
  parameter: string
  oldValue: string
  newValue: string
  requestId: string
}

type CliSessionRow = {
  sessionId: string
  userName: string
  startTime: string
  endTime: string
  sourceIp: string
  jumpHost: string
  authResult: string
}

type CliCommandRow = {
  cmdId: string
  sessionId: string
  cmdTime: string
  commandText: string
  targetHint: string
  result: string
}

type AppliedConfigChangeRow = {
  corrId: string
  auditId: string
  userName: string
  action: string
  targetDn: string
  requestId: string
  changeCount: string
  firstChangeTime: string
  lastChangeTime: string
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
    ['THDL006A', 'HW-CM-THDL006A-20260218-0800', 'MaxUE', '210', '2026-02-18 08:00'],
    ['THDL006A', 'HW-CM-THDL006A-20260218-0800', 'TxPwr', '36', '2026-02-18 08:00'],
    ['THDL006A', 'HW-CM-THDL006A-20260218-0800', 'LoadLimit', '78', '2026-02-18 08:00'],
    ['THDL006A', 'HW-CM-THDL006A-20260218-0800', 'HO_Threshold', '-95', '2026-02-18 08:00'],
    ['THDL006A', 'HW-CM-THDL006A-20260218-0800', 'Qoffset', '2', '2026-02-18 08:00'],
    ['THDL006A', 'HW-CM-THDL006A-20260218-0900', 'MaxUE', '240', '2026-02-18 09:00'],
    ['THDL006A', 'HW-CM-THDL006A-20260218-0900', 'TxPwr', '36', '2026-02-18 09:00'],
    ['THDL006A', 'HW-CM-THDL006A-20260218-0900', 'LoadLimit', '101', '2026-02-18 09:00'],
    ['THDL006A', 'HW-CM-THDL006A-20260218-0900', 'HO_Threshold', '-89', '2026-02-18 09:00'],
    ['THDL006A', 'HW-CM-THDL006A-20260218-0900', 'Qoffset', '4', '2026-02-18 09:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0800', 'MaxUE', '180', '2026-02-18 08:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0800', 'TxPwr', '38', '2026-02-18 08:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0800', 'LoadLimit', '80', '2026-02-18 08:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0800', 'HO_Threshold', '-97', '2026-02-18 08:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0800', 'SINR_Offset', '-1', '2026-02-18 08:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0900', 'MaxUE', '200', '2026-02-18 09:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0900', 'TxPwr', '34', '2026-02-18 09:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0900', 'LoadLimit', '95', '2026-02-18 09:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0900', 'HO_Threshold', '-90', '2026-02-18 09:00'],
    ['THDL006B', 'HW-CM-THDL006B-20260218-0900', 'SINR_Offset', '-3', '2026-02-18 09:00'],
  ].map(([cell, index, parameter, value, date]) => ({ node: 'TH006', site: 'THDL006', cell, index, parameter, value, date })),
  nokia: [
    ['THDL006A', 'NO-CM-THDL006A-20260218-0800', 'maxNumUe', '200', '2026-02-18 08:00'],
    ['THDL006A', 'NO-CM-THDL006A-20260218-0800', 'txPower', '40', '2026-02-18 08:00'],
    ['THDL006A', 'NO-CM-THDL006A-20260218-0800', 'loadLimit', '80', '2026-02-18 08:00'],
    ['THDL006A', 'NO-CM-THDL006A-20260218-0800', 'hoThresh', '-95', '2026-02-18 08:00'],
    ['THDL006A', 'NO-CM-THDL006A-20260218-0800', 'qOffset', '2', '2026-02-18 08:00'],
    ['THDL006A', 'NO-CM-THDL006A-20260218-0900', 'maxNumUe', '240', '2026-02-18 09:00'],
    ['THDL006A', 'NO-CM-THDL006A-20260218-0900', 'txPower', '40', '2026-02-18 09:00'],
    ['THDL006A', 'NO-CM-THDL006A-20260218-0900', 'loadLimit', '95', '2026-02-18 09:00'],
    ['THDL006A', 'NO-CM-THDL006A-20260218-0900', 'hoThresh', '-89', '2026-02-18 09:00'],
    ['THDL006A', 'NO-CM-THDL006A-20260218-0900', 'qOffset', '4', '2026-02-18 09:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0800', 'maxNumUe', '160', '2026-02-18 08:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0800', 'txPower', '38', '2026-02-18 08:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0800', 'loadLimit', '75', '2026-02-18 08:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0800', 'hoThresh', '-97', '2026-02-18 08:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0800', 'sinrOffset', '-1', '2026-02-18 08:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0900', 'maxNumUe', '185', '2026-02-18 09:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0900', 'txPower', '34', '2026-02-18 09:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0900', 'loadLimit', '92', '2026-02-18 09:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0900', 'hoThresh', '-90', '2026-02-18 09:00'],
    ['THDL006B', 'NO-CM-THDL006B-20260218-0900', 'sinrOffset', '-3', '2026-02-18 09:00'],
  ].map(([cell, index, parameter, value, date]) => ({ node: 'TH006', site: 'THDL006', cell, index, parameter, value, date })),
  ericsson: [
    ['THDL006A', 'ER-CM-THDL006A-20260218-0800', 'maxNumActUE', '180', '2026-02-18 08:00'],
    ['THDL006A', 'ER-CM-THDL006A-20260218-0800', 'dlBw2', '20MHz', '2026-02-18 08:00'],
    ['THDL006A', 'ER-CM-THDL006A-20260218-0800', 'loadLimit', '85', '2026-02-18 08:00'],
    ['THDL006A', 'ER-CM-THDL006A-20260218-0800', 'hoTime', '64', '2026-02-18 08:00'],
    ['THDL006A', 'ER-CM-THDL006A-20260218-0800', 'qOffset', '2', '2026-02-18 08:00'],
    ['THDL006A', 'ER-CM-THDL006A-20260218-0900', 'maxNumActUE', '210', '2026-02-18 09:00'],
    ['THDL006A', 'ER-CM-THDL006A-20260218-0900', 'dlBw2', '15MHz', '2026-02-18 09:00'],
    ['THDL006A', 'ER-CM-THDL006A-20260218-0900', 'loadLimit', '97', '2026-02-18 09:00'],
    ['THDL006A', 'ER-CM-THDL006A-20260218-0900', 'hoTime', '72', '2026-02-18 09:00'],
    ['THDL006A', 'ER-CM-THDL006A-20260218-0900', 'qOffset', '4', '2026-02-18 09:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0800', 'maxNumActUE', '150', '2026-02-18 08:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0800', 'dlBw2', '20MHz', '2026-02-18 08:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0800', 'loadLimit', '80', '2026-02-18 08:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0800', 'sinrOffset', '0', '2026-02-18 08:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0800', 'txPwr', '37', '2026-02-18 08:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0900', 'maxNumActUE', '175', '2026-02-18 09:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0900', 'dlBw2', '15MHz', '2026-02-18 09:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0900', 'loadLimit', '92', '2026-02-18 09:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0900', 'sinrOffset', '-2', '2026-02-18 09:00'],
    ['THDL006B', 'ER-CM-THDL006B-20260218-0900', 'txPwr', '33', '2026-02-18 09:00'],
  ].map(([cell, index, parameter, value, date]) => ({ node: 'TH006', site: 'THDL006', cell, index, parameter, value, date })),
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


const licenseRawByVendor: Record<ReportingVendor, LicenseRawRow[]> = {
  nokia: [
    ['TH006', 'THDL006', 'LTE Cells', '1200', '1120', '93.33', '2027-12-31', 'ACTIVE', '2026-02-18 08:18'],
    ['TH006', 'THDL006', 'LTE Active UEs', '50000', '46320', '92.64', '2027-12-31', 'ACTIVE', '2026-02-18 08:18'],
    ['TH006', 'THDL006', 'CA Carriers', '600', '480', '80.00', '2027-12-31', 'ACTIVE', '2026-02-18 08:18'],
    ['TH006', 'THDL006', 'VoLTE Subscribers', '20000', '18450', '92.25', '2026-10-01', 'ACTIVE', '2026-02-18 08:18'],
    ['TH006', 'THDL006', 'NR Cells', '300', '295', '98.33', '2026-06-30', 'WARNING', '2026-02-18 08:18'],
    ['TH006', 'THDL006', 'EPC Attach Capacity', '80000', '70210', '87.76', '2027-12-31', 'ACTIVE', '2026-02-18 08:18'],
    ['TH006', 'THDL006', 'NB-IoT Devices', '100000', '41200', '41.20', '2027-12-31', 'ACTIVE', '2026-02-18 08:18'],
    ['TH006', 'THDL006', 'SON Feature Pack', '1', '1', '100.00', '2027-12-31', 'ACTIVE', '2026-02-18 08:18'],
    ['TH006', 'THDL006', 'ENDC Capability', '1', '1', '100.00', '2026-09-15', 'ACTIVE', '2026-02-18 08:18'],
    ['TH006', 'THDL006', 'Security Suite', '1', '1', '100.00', '2027-12-31', 'ACTIVE', '2026-02-18 08:18'],
  ].map(([node, site, licenseItem, allocated, usage, utilizationPct, expireDate, status, fileReadTime]) => ({ node, site, licenseItem, allocated, usage, utilizationPct, expireDate, status, fileReadTime })),
  ericsson: [
    ['TH006', 'THDL006', 'EUTRAN Cells', '1100', '1045', '95.00', '2027-11-30', 'ACTIVE', '2026-02-18 08:22'],
    ['TH006', 'THDL006', 'Active UEs', '48000', '45110', '93.98', '2027-11-30', 'ACTIVE', '2026-02-18 08:22'],
    ['TH006', 'THDL006', 'Carrier Aggregation', '550', '510', '92.73', '2027-11-30', 'ACTIVE', '2026-02-18 08:22'],
    ['TH006', 'THDL006', 'VoLTE Capacity', '18000', '16700', '92.78', '2026-08-31', 'ACTIVE', '2026-02-18 08:22'],
    ['TH006', 'THDL006', 'NR Cells', '280', '278', '99.29', '2026-07-31', 'WARNING', '2026-02-18 08:22'],
    ['TH006', 'THDL006', 'NB-IoT Devices', '90000', '39800', '44.22', '2027-11-30', 'ACTIVE', '2026-02-18 08:22'],
    ['TH006', 'THDL006', 'ENDC Feature', '1', '1', '100.00', '2026-12-15', 'ACTIVE', '2026-02-18 08:22'],
    ['TH006', 'THDL006', 'QoS Profiles', '1', '1', '100.00', '2027-11-30', 'ACTIVE', '2026-02-18 08:22'],
    ['TH006', 'THDL006', 'Security Pack', '1', '1', '100.00', '2027-11-30', 'ACTIVE', '2026-02-18 08:22'],
    ['TH006', 'THDL006', 'SON Automation', '1', '1', '100.00', '2027-11-30', 'ACTIVE', '2026-02-18 08:22'],
  ].map(([node, site, licenseItem, allocated, usage, utilizationPct, expireDate, status, fileReadTime]) => ({ node, site, licenseItem, allocated, usage, utilizationPct, expireDate, status, fileReadTime })),
  huawei: [
    ['TH006', 'THDL006', 'LTE Cell License', '1150', '1098', '95.48', '2027-10-31', 'ACTIVE', '2026-02-18 08:25'],
    ['TH006', 'THDL006', 'LTE Active UEs', '49000', '46250', '94.39', '2027-10-31', 'ACTIVE', '2026-02-18 08:25'],
    ['TH006', 'THDL006', 'CA License', '580', '520', '89.66', '2027-10-31', 'ACTIVE', '2026-02-18 08:25'],
    ['TH006', 'THDL006', 'VoLTE Capacity', '19000', '17820', '93.79', '2026-09-30', 'ACTIVE', '2026-02-18 08:25'],
    ['TH006', 'THDL006', 'NR Cell License', '290', '288', '99.31', '2026-06-30', 'WARNING', '2026-02-18 08:25'],
    ['TH006', 'THDL006', 'EPC Attach Capacity', '75000', '68850', '91.80', '2027-10-31', 'ACTIVE', '2026-02-18 08:25'],
    ['TH006', 'THDL006', 'NB-IoT Capacity', '95000', '41020', '43.18', '2027-10-31', 'ACTIVE', '2026-02-18 08:25'],
    ['TH006', 'THDL006', 'SON Feature Pack', '1', '1', '100.00', '2027-10-31', 'ACTIVE', '2026-02-18 08:25'],
    ['TH006', 'THDL006', 'ENDC Support', '1', '1', '100.00', '2026-11-30', 'ACTIVE', '2026-02-18 08:25'],
    ['TH006', 'THDL006', 'Security Suite', '1', '1', '100.00', '2027-10-31', 'ACTIVE', '2026-02-18 08:25'],
  ].map(([node, site, licenseItem, allocated, usage, utilizationPct, expireDate, status, fileReadTime]) => ({ node, site, licenseItem, allocated, usage, utilizationPct, expireDate, status, fileReadTime })),
}

const cmHistoryRows: HistoryRow[] = [
  ['TH006', 'THDL006', 'THDL006A', 'CHG-THDL006A-20260218-0800-0900', 'maxNumUe', '200', '240', '2026-02-18 09:14'],
  ['TH006', 'THDL006', 'THDL006A', 'CHG-THDL006A-20260218-0800-0900', 'loadLimit', '80', '95', '2026-02-18 09:14'],
  ['TH006', 'THDL006', 'THDL006A', 'CHG-THDL006A-20260218-0800-0900', 'hoThresh', '-95', '-89', '2026-02-18 09:14'],
  ['TH006', 'THDL006', 'THDL006A', 'CHG-THDL006A-20260218-0800-0900', 'qOffset', '2', '4', '2026-02-18 09:14'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-THDL006B-20260218-0800-0900', 'maxNumActUE', '150', '175', '2026-02-18 09:18'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-THDL006B-20260218-0800-0900', 'dlBw2', '20MHz', '15MHz', '2026-02-18 09:18'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-THDL006B-20260218-0800-0900', 'loadLimit', '80', '92', '2026-02-18 09:18'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-THDL006B-20260218-0800-0900', 'sinrOffset', '0', '-2', '2026-02-18 09:18'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-THDL006B-20260218-0800-0900', 'txPwr', '37', '33', '2026-02-18 09:18'],
  ['TH006', 'THDL006', 'THDL006A', 'CHG-HW-THDL006A-20260218-0800-0900', 'MaxUE', '210', '240', '2026-02-18 09:00'],
  ['TH006', 'THDL006', 'THDL006A', 'CHG-HW-THDL006A-20260218-0800-0900', 'LoadLimit', '78', '101', '2026-02-18 09:00'],
  ['TH006', 'THDL006', 'THDL006A', 'CHG-HW-THDL006A-20260218-0800-0900', 'HO_Threshold', '-95', '-89', '2026-02-18 09:00'],
  ['TH006', 'THDL006', 'THDL006A', 'CHG-HW-THDL006A-20260218-0800-0900', 'Qoffset', '2', '4', '2026-02-18 09:00'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-NO-THDL006B-20260218-0800-0900', 'maxNumUe', '160', '185', '2026-02-18 09:10'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-NO-THDL006B-20260218-0800-0900', 'loadLimit', '75', '92', '2026-02-18 09:10'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-NO-THDL006B-20260218-0800-0900', 'hoThresh', '-97', '-90', '2026-02-18 09:10'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-NO-THDL006B-20260218-0800-0900', 'sinrOffset', '-1', '-3', '2026-02-18 09:10'],
  ['TH006', 'THDL006', 'THDL006B', 'CHG-NO-THDL006B-20260218-0800-0900', 'txPower', '38', '34', '2026-02-18 09:10'],
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


const licenseHistoryRows: LicenseHistoryRow[] = [
  ['Nokia', 'TH006', 'THDL006', 'LTE Cells', '1112', '1120', '+8', '92.67', '93.33', '2027-12-31', 'ACTIVE', '2026-02-18 08:18'],
  ['Ericsson', 'TH006', 'THDL006', 'EUTRAN Cells', '1039', '1045', '+6', '94.45', '95.00', '2027-11-30', 'ACTIVE', '2026-02-18 08:22'],
  ['Huawei', 'TH006', 'THDL006', 'LTE Cell License', '1092', '1098', '+6', '94.96', '95.48', '2027-10-31', 'ACTIVE', '2026-02-18 08:25'],
  ['Nokia', 'TH006', 'THDL006', 'NR Cells', '294', '295', '+1', '98.00', '98.33', '2026-06-30', 'WARNING', '2026-02-18 08:18'],
  ['Ericsson', 'TH006', 'THDL006', 'NR Cells', '276', '278', '+2', '98.57', '99.29', '2026-07-31', 'WARNING', '2026-02-18 08:22'],
  ['Huawei', 'TH006', 'THDL006', 'NR Cell License', '287', '288', '+1', '98.97', '99.31', '2026-06-30', 'WARNING', '2026-02-18 08:25'],
].map(([vendor, node, site, licenseItem, prevUsage, currUsage, deltaUsage, prevUtilizationPct, currUtilizationPct, expireDate, status, changeDetectedTime]) => ({ vendor, node, site, licenseItem, prevUsage, currUsage, deltaUsage, prevUtilizationPct, currUtilizationPct, expireDate, status, changeDetectedTime }))



const nokiaAuditLogRows: AuditLogRow[] = [
  ['1001', '2026-02-18 09:02:10', 'john', 'MODIFY', 'MRBTS-600/LNCEL-1', 'SUCCESS', 'REQ-77881', '10.10.2.15'],
  ['1002', '2026-02-18 09:05:44', 'svc_automation', 'MODIFY', 'MRBTS-600/LNCEL-2', 'SUCCESS', 'REQ-77890', '10.10.2.50'],
  ['1003', '2026-02-18 09:08:01', 'john', 'LOGIN', 'NMS', 'SUCCESS', 'SESS-33101', '10.10.2.15'],
  ['1004', '2026-02-18 09:12:33', 'sara', 'MODIFY', 'MRBTS-600/LNCEL-1', 'SUCCESS', 'REQ-77905', '10.10.2.21'],
  ['1005', '2026-02-18 09:16:18', 'mikael', 'MODIFY', 'MRBTS-600/LNCEL-3', 'FAILED', 'REQ-77918', '10.10.2.33'],
  ['1006', '2026-02-18 09:20:57', 'admin_ops', 'EXPORT', 'NMS', 'SUCCESS', 'REQ-77930', '10.10.2.10'],
  ['1007', '2026-02-18 09:24:40', 'fatima', 'MODIFY', 'MRBTS-600/LNCEL-2', 'SUCCESS', 'REQ-77941', '10.10.2.28'],
  ['1008', '2026-02-18 09:28:12', 'john', 'MODIFY', 'MRBTS-600/LNCEL-1', 'SUCCESS', 'REQ-77955', '10.10.2.15'],
  ['1009', '2026-02-18 09:33:09', 'sara', 'LOGOUT', 'NMS', 'SUCCESS', 'SESS-33144', '10.10.2.21'],
  ['1010', '2026-02-18 09:37:26', 'svc_automation', 'MODIFY', 'MRBTS-600/LNCEL-4', 'SUCCESS', 'REQ-77980', '10.10.2.50'],
].map(([auditId, eventTime, userName, action, targetDn, result, requestId, sourceIp]) => ({ auditId, eventTime, userName, action, targetDn, result, requestId, sourceIp }))

const nokiaCmChangeRows: CmChangeLogRow[] = [
  ['9001', '2026-02-18 09:02:25', 'MRBTS-600/LNCEL-1', 'maxNumUe', '200', '240', 'REQ-77881'],
  ['9002', '2026-02-18 09:02:25', 'MRBTS-600/LNCEL-1', 'hoThresh', '-95', '-89', 'REQ-77881'],
  ['9003', '2026-02-18 09:05:55', 'MRBTS-600/LNCEL-2', 'loadLimit', '75', '92', 'REQ-77890'],
  ['9004', '2026-02-18 09:05:55', 'MRBTS-600/LNCEL-2', 'sinrOffset', '-1', '-3', 'REQ-77890'],
  ['9005', '2026-02-18 09:12:48', 'MRBTS-600/LNCEL-1', 'qOffset', '2', '4', 'REQ-77905'],
  ['9006', '2026-02-18 09:12:48', 'MRBTS-600/LNCEL-1', 'loadLimit', '80', '95', 'REQ-77905'],
  ['9007', '2026-02-18 09:24:58', 'MRBTS-600/LNCEL-2', 'maxNumUe', '160', '185', 'REQ-77941'],
  ['9008', '2026-02-18 09:24:58', 'MRBTS-600/LNCEL-2', 'hoThresh', '-97', '-90', 'REQ-77941'],
  ['9009', '2026-02-18 09:28:29', 'MRBTS-600/LNCEL-1', 'sinrOffset', '-2', '-4', 'REQ-77955'],
  ['9010', '2026-02-18 09:37:41', 'MRBTS-600/LNCEL-4', 'loadLimit', '70', '88', 'REQ-77980'],
].map(([changeId, changeTime, objectDn, parameter, oldValue, newValue, requestId]) => ({ changeId, changeTime, objectDn, parameter, oldValue, newValue, requestId }))

const nokiaCliSessionRows: CliSessionRow[] = [
  ['5001', 'john', '2026-02-18 09:00:40', '2026-02-18 09:07:10', '10.10.2.15', 'bastion-01', 'SUCCESS'],
  ['5002', 'sara', '2026-02-18 09:11:05', '2026-02-18 09:18:02', '10.10.2.21', 'bastion-01', 'SUCCESS'],
  ['5003', 'mikael', '2026-02-18 09:15:02', '2026-02-18 09:16:50', '10.10.2.33', 'bastion-02', 'FAILED'],
  ['5004', 'admin_ops', '2026-02-18 09:19:10', '2026-02-18 09:22:34', '10.10.2.10', 'bastion-01', 'SUCCESS'],
  ['5005', 'fatima', '2026-02-18 09:23:30', '2026-02-18 09:26:12', '10.10.2.28', 'bastion-01', 'SUCCESS'],
  ['5006', 'svc_automation', '2026-02-18 09:04:50', '2026-02-18 09:06:20', '10.10.2.50', 'bastion-automation', 'SUCCESS'],
  ['5007', 'john', '2026-02-18 09:27:40', '2026-02-18 09:30:05', '10.10.2.15', 'bastion-01', 'SUCCESS'],
  ['5008', 'sara', '2026-02-18 09:31:00', '2026-02-18 09:33:05', '10.10.2.21', 'bastion-01', 'SUCCESS'],
  ['5009', 'svc_automation', '2026-02-18 09:36:10', '2026-02-18 09:38:05', '10.10.2.50', 'bastion-automation', 'SUCCESS'],
  ['5010', 'john', '2026-02-18 09:39:00', '2026-02-18 09:41:40', '10.10.2.15', 'bastion-01', 'SUCCESS'],
].map(([sessionId, userName, startTime, endTime, sourceIp, jumpHost, authResult]) => ({ sessionId, userName, startTime, endTime, sourceIp, jumpHost, authResult }))

const nokiaCliCommandRows: CliCommandRow[] = [
  ['7001', '5001', '2026-02-18 09:02:05', 'set LNCEL-1 maxNumUe=240', 'MRBTS-600/LNCEL-1', 'SUCCESS'],
  ['7002', '5001', '2026-02-18 09:02:06', 'set LNCEL-1 hoThresh=-89', 'MRBTS-600/LNCEL-1', 'SUCCESS'],
  ['7003', '5006', '2026-02-18 09:05:40', 'set LNCEL-2 loadLimit=92', 'MRBTS-600/LNCEL-2', 'SUCCESS'],
  ['7004', '5006', '2026-02-18 09:05:41', 'set LNCEL-2 sinrOffset=-3', 'MRBTS-600/LNCEL-2', 'SUCCESS'],
  ['7005', '5002', '2026-02-18 09:12:30', 'set LNCEL-1 qOffset=4', 'MRBTS-600/LNCEL-1', 'SUCCESS'],
  ['7006', '5002', '2026-02-18 09:12:31', 'set LNCEL-1 loadLimit=95', 'MRBTS-600/LNCEL-1', 'SUCCESS'],
  ['7007', '5005', '2026-02-18 09:24:35', 'set LNCEL-2 maxNumUe=185', 'MRBTS-600/LNCEL-2', 'SUCCESS'],
  ['7008', '5005', '2026-02-18 09:24:36', 'set LNCEL-2 hoThresh=-90', 'MRBTS-600/LNCEL-2', 'SUCCESS'],
  ['7009', '5007', '2026-02-18 09:28:05', 'set LNCEL-1 sinrOffset=-4', 'MRBTS-600/LNCEL-1', 'SUCCESS'],
  ['7010', '5003', '2026-02-18 09:16:10', 'set LNCEL-3 loadLimit=97', 'MRBTS-600/LNCEL-3', 'FAILED'],
].map(([cmdId, sessionId, cmdTime, commandText, targetHint, result]) => ({ cmdId, sessionId, cmdTime, commandText, targetHint, result }))

const appliedConfigurationChangesRows: AppliedConfigChangeRow[] = [
  ['1', '1001', 'john', 'MODIFY', 'MRBTS-600/LNCEL-1', 'REQ-77881', '2', '2026-02-18 09:02:25', '2026-02-18 09:02:25'],
  ['2', '1002', 'svc_automation', 'MODIFY', 'MRBTS-600/LNCEL-2', 'REQ-77890', '2', '2026-02-18 09:05:55', '2026-02-18 09:05:55'],
  ['3', '1004', 'sara', 'MODIFY', 'MRBTS-600/LNCEL-1', 'REQ-77905', '2', '2026-02-18 09:12:48', '2026-02-18 09:12:48'],
  ['4', '1005', 'mikael', 'MODIFY', 'MRBTS-600/LNCEL-3', 'REQ-77918', '0', 'NULL', 'NULL'],
  ['5', '1007', 'fatima', 'MODIFY', 'MRBTS-600/LNCEL-2', 'REQ-77941', '2', '2026-02-18 09:24:58', '2026-02-18 09:24:58'],
  ['6', '1008', 'john', 'MODIFY', 'MRBTS-600/LNCEL-1', 'REQ-77955', '1', '2026-02-18 09:28:29', '2026-02-18 09:28:29'],
  ['7', '1010', 'svc_automation', 'MODIFY', 'MRBTS-600/LNCEL-4', 'REQ-77980', '1', '2026-02-18 09:37:41', '2026-02-18 09:37:41'],
  ['8', '1006', 'admin_ops', 'EXPORT', 'NMS', 'REQ-77930', '0', 'NULL', 'NULL'],
  ['9', '1003', 'john', 'LOGIN', 'NMS', 'SESS-33101', '0', 'NULL', 'NULL'],
  ['10', '1009', 'sara', 'LOGOUT', 'NMS', 'SESS-33144', '0', 'NULL', 'NULL'],
].map(([corrId, auditId, userName, action, targetDn, requestId, changeCount, firstChangeTime, lastChangeTime]) => ({ corrId, auditId, userName, action, targetDn, requestId, changeCount, firstChangeTime, lastChangeTime }))

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
        {domain === 'pm' ? <PmRawTable rows={pmRawByVendor[vendor]} /> : domain === 'license' ? <LicenseRawTable rows={licenseRawByVendor[vendor]} /> : domain === 'user-log' ? <UserLogRawTables vendor={vendor} /> : <RawTable rows={cmRawByVendor[vendor]} />}
      </TableCard>
    </ReportingShell>
  )
}

export function ReportingHistoryPage({ domain }: { domain: ReportingDomain }) {
  return (
    <ReportingShell title={`${labels[domain]} / History`}>
      <FilterBar domain={domain} view='History' />
      <ActionRow />
      <TableCard title={domain === 'pm' ? 'PM History (Counter Changes)' : domain === 'license' ? 'License History (Usage Changes)' : domain === 'user-log' ? 'Applied Configuration Changes' : `${labels[domain]} History`}>
        {domain === 'pm' ? <PmHistoryTable rows={pmHistoryRows} /> : domain === 'license' ? <LicenseHistoryTable rows={licenseHistoryRows} /> : domain === 'user-log' ? <AppliedConfigurationChangesTable rows={appliedConfigurationChangesRows} /> : <HistoryTable rows={cmHistoryRows} />}
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

function LicenseRawTable({ rows }: { rows: LicenseRawRow[] }) {
  return <SimpleTable headers={['node', 'site', 'license_item', 'allocated', 'usage', 'utilization_pct', 'expire_date', 'status', 'file_read_time']} rows={rows.map((r) => [r.node, r.site, r.licenseItem, r.allocated, r.usage, r.utilizationPct, r.expireDate, r.status, r.fileReadTime])} />
}

function LicenseHistoryTable({ rows }: { rows: LicenseHistoryRow[] }) {
  return <SimpleTable headers={['vendor', 'node', 'site', 'license_item', 'prev_usage', 'curr_usage', 'delta_usage', 'prev_utilization_pct', 'curr_utilization_pct', 'expire_date', 'status', 'change_detected_time']} rows={rows.map((r) => [r.vendor, r.node, r.site, r.licenseItem, r.prevUsage, r.currUsage, r.deltaUsage, r.prevUtilizationPct, r.currUtilizationPct, r.expireDate, r.status, r.changeDetectedTime])} />
}



function UserLogRawTables({ vendor }: { vendor: ReportingVendor }) {
  const href = useLocation({ select: (location) => location.href })
  const rawTabFromHash = href.split('#')[1]
  const activeTab = (rawTabFromHash ?? 'audit-log') as 'audit-log' | 'cli-session' | 'cli-command' | 'cm-change'

  if (vendor !== 'nokia') {
    return <div className='p-4 text-sm text-muted-foreground'>User Log data is currently available only for Nokia.</div>
  }

  return (
    <div className='space-y-4 p-4'>
      <div className='flex flex-wrap gap-2'>
        <Button variant={activeTab === 'audit-log' ? 'default' : 'outline'} asChild><a href='/reporting/user-log/raw/nokia#audit-log'>Audit Log</a></Button>
        <Button variant={activeTab === 'cli-session' ? 'default' : 'outline'} asChild><a href='/reporting/user-log/raw/nokia#cli-session'>CLI Session</a></Button>
        <Button variant={activeTab === 'cli-command' ? 'default' : 'outline'} asChild><a href='/reporting/user-log/raw/nokia#cli-command'>CLI Command</a></Button>
        <Button variant={activeTab === 'cm-change' ? 'default' : 'outline'} asChild><a href='/reporting/user-log/raw/nokia#cm-change'>CM Change</a></Button>
      </div>

      {activeTab === 'audit-log' && <SimpleTable headers={['audit_id', 'event_time', 'user_name', 'action', 'target_dn', 'result', 'request_id', 'source_ip']} rows={nokiaAuditLogRows.map((r) => [r.auditId, r.eventTime, r.userName, r.action, r.targetDn, r.result, r.requestId, r.sourceIp])} />}
      {activeTab === 'cli-session' && <SimpleTable headers={['session_id', 'user_name', 'start_time', 'end_time', 'source_ip', 'jump_host', 'auth_result']} rows={nokiaCliSessionRows.map((r) => [r.sessionId, r.userName, r.startTime, r.endTime, r.sourceIp, r.jumpHost, r.authResult])} />}
      {activeTab === 'cli-command' && <SimpleTable headers={['cmd_id', 'session_id', 'cmd_time', 'command_text', 'target_hint', 'result']} rows={nokiaCliCommandRows.map((r) => [r.cmdId, r.sessionId, r.cmdTime, r.commandText, r.targetHint, r.result])} />}
      {activeTab === 'cm-change' && <SimpleTable headers={['change_id', 'change_time', 'object_dn', 'parameter', 'old_value', 'new_value', 'request_id']} rows={nokiaCmChangeRows.map((r) => [r.changeId, r.changeTime, r.objectDn, r.parameter, r.oldValue, r.newValue, r.requestId])} />}
    </div>
  )
}

function AppliedConfigurationChangesTable({ rows }: { rows: AppliedConfigChangeRow[] }) {
  return <SimpleTable headers={['corr_id', 'audit_id', 'user_name', 'action', 'target_dn', 'request_id', 'change_count', 'first_change_time', 'last_change_time']} rows={rows.map((r) => [r.corrId, r.auditId, r.userName, r.action, r.targetDn, r.requestId, r.changeCount, r.firstChangeTime, r.lastChangeTime])} />
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
