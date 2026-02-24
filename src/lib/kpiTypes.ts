export type KpiCategory =
  | 'Accessibility'
  | 'Retainability'
  | 'Mobility'
  | 'Traffic'
  | 'Availability'
  | 'Integrity'

export type KpiUnit = '%' | 'count' | 'bytes' | 'Mbps' | 'Erlang'
export type KpiTech = '2G' | '3G' | '4G' | '5G'
export type KpiVendorScope = 'All' | 'Nokia' | 'Ericsson'
export type KpiGranularity = '5min' | '15min' | 'hourly' | 'daily'
export type KpiAggregationLevel = 'Cell' | 'Site' | 'Node'
export type KpiFormulaType = 'ratio' | 'sum' | 'difference'

export type KpiMappingTab = {
  numeratorCounter: string
  denominatorCounter?: string
  additionalCounters: Array<{ name: string; role: string }>
}

export type KpiFormula = {
  type: KpiFormulaType
}

export type KpiThresholds = {
  mode: 'static'
  greenGte: number
  yellowGte: number
}

export type KpiPreviewRow = {
  objectName: string
  numeratorSum: number
  denominatorSum: number
  kpiValue: number
  status: 'Green' | 'Yellow' | 'Red'
}

export type KpiPreviewSnapshot = {
  rows: KpiPreviewRow[]
  avg: number
  min: number
  max: number
  denomZero: number
  missing: number
}

export type KpiMetadata = {
  name: string
  category: KpiCategory
  unit: KpiUnit
  tech: KpiTech[]
  vendorScope: KpiVendorScope
  moClasses: string[]
  granularity: KpiGranularity
  aggLevel: KpiAggregationLevel
  description: string
}

export type KpiDefinition = KpiMetadata & {
  id: string
  mappings: {
    generic: KpiMappingTab
    nokia: KpiMappingTab
    ericsson: KpiMappingTab
  }
  formula: KpiFormula
  thresholds: KpiThresholds
  preview: KpiPreviewSnapshot
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type KpiDefinitionPayload = KpiMetadata & {
  mappings: KpiDefinition['mappings']
  formula: KpiFormula
  thresholds: KpiThresholds
  preview?: KpiPreviewSnapshot
}

export type KpiListItem = {
  id: string
  name: string
  category: KpiCategory
  unit: KpiUnit
  vendorScope: KpiVendorScope
  granularity: KpiGranularity
  aggLevel: KpiAggregationLevel
  thresholds: KpiThresholds
  preview: KpiPreviewSnapshot
  version: number
  isActive: boolean
  updatedAt: string
  createdAt: string
}
