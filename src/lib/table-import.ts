export type ImportedColumnType = 'text' | 'number' | 'boolean' | 'date'

export type ImportedColumn = {
  key: string
  label: string
  type: ImportedColumnType
}

export type ImportedRow = Record<string, unknown>

const normalizeColumnKey = (label: string, index: number) => {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || `field_${index + 1}`
}

const inferColumnType = (values: unknown[]): ImportedColumnType => {
  const nonEmpty = values.filter((value) => value !== '' && value !== null && value !== undefined)
  if (nonEmpty.length === 0) return 'text'

  if (nonEmpty.every((value) => typeof value === 'boolean')) return 'boolean'

  const isNumber = (value: unknown) => {
    if (typeof value === 'number') return true
    if (typeof value === 'string') {
      const text = value.trim()
      if (!text) return false
      return Number.isFinite(Number(text))
    }
    return false
  }

  if (nonEmpty.every(isNumber)) return 'number'

  const isDate = (value: unknown) => {
    if (typeof value !== 'string') return false
    const text = value.trim()
    if (!text) return false
    return !Number.isNaN(Date.parse(text))
  }

  if (nonEmpty.every(isDate)) return 'date'
  return 'text'
}

const castByType = (value: unknown, type: ImportedColumnType) => {
  if (value === '' || value === null || value === undefined) return ''
  if (type === 'number') {
    const num = Number(value)
    return Number.isFinite(num) ? num : value
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'yes'].includes(normalized)) return true
      if (['false', '0', 'no'].includes(normalized)) return false
    }
  }
  return value
}

const parseCsvRows = (text: string): string[][] => {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  return rows.filter((row) => row.some((cell) => cell.trim().length > 0))
}

const decodeZipEntries = async (buffer: ArrayBuffer) => {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  let eocdOffset = -1
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }

  if (eocdOffset < 0) throw new Error('Invalid XLSX archive')

  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true)

  const entries = new Map<string, Uint8Array>()
  let cursor = centralDirectoryOffset

  const inflateRaw = async (raw: Uint8Array) => {
    const rawBuffer = new Uint8Array(raw.byteLength)
    rawBuffer.set(raw)
    const stream = new Blob([rawBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    const result = await new Response(stream).arrayBuffer()
    return new Uint8Array(result)
  }

  for (let i = 0; i < totalEntries; i++) {
    const signature = view.getUint32(cursor, true)
    if (signature !== 0x02014b50) throw new Error('Invalid central directory entry')

    const compressionMethod = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const filenameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)

    const nameStart = cursor + 46
    const nameEnd = nameStart + filenameLength
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameEnd))

    const localNameLength = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true)
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
    const compressedData = bytes.slice(dataStart, dataStart + compressedSize)

    let data: Uint8Array
    if (compressionMethod === 0) {
      data = compressedData
    } else if (compressionMethod === 8) {
      data = await inflateRaw(compressedData)
    } else {
      throw new Error(`Unsupported XLSX compression method: ${compressionMethod}`)
    }

    entries.set(name, data)
    cursor = nameEnd + extraLength + commentLength
  }

  return entries
}

const parseXlsx = async (buffer: ArrayBuffer) => {
  const entries = await decodeZipEntries(buffer)
  const workbookXml = entries.get('xl/workbook.xml')
  const relsXml = entries.get('xl/_rels/workbook.xml.rels')
  if (!workbookXml || !relsXml) throw new Error('Invalid XLSX workbook')

  const parser = new DOMParser()
  const workbookDoc = parser.parseFromString(new TextDecoder().decode(workbookXml), 'application/xml')
  const relsDoc = parser.parseFromString(new TextDecoder().decode(relsXml), 'application/xml')

  const firstSheet = workbookDoc.querySelector('sheet')
  if (!firstSheet) throw new Error('XLSX has no sheet')

  const relationId = firstSheet.getAttribute('r:id')
  if (!relationId) throw new Error('XLSX sheet relation missing')

  const rel = Array.from(relsDoc.querySelectorAll('Relationship')).find(
    (entry) => entry.getAttribute('Id') === relationId
  )
  if (!rel) throw new Error('XLSX sheet relation not found')

  const target = rel.getAttribute('Target')
  if (!target) throw new Error('XLSX sheet target missing')

  const normalizedTarget = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
  const sheetXml = entries.get(normalizedTarget)
  if (!sheetXml) throw new Error('XLSX first sheet not found')

  const sharedStringsXml = entries.get('xl/sharedStrings.xml')
  const sharedStrings: string[] = []

  if (sharedStringsXml) {
    const sharedDoc = parser.parseFromString(new TextDecoder().decode(sharedStringsXml), 'application/xml')
    sharedDoc.querySelectorAll('si').forEach((item) => {
      const parts = Array.from(item.querySelectorAll('t')).map((node) => node.textContent ?? '')
      sharedStrings.push(parts.join(''))
    })
  }

  const sheetDoc = parser.parseFromString(new TextDecoder().decode(sheetXml), 'application/xml')
  const rows = Array.from(sheetDoc.querySelectorAll('sheetData > row')).map((rowNode) => {
    return Array.from(rowNode.querySelectorAll('c')).map((cellNode) => {
      const type = cellNode.getAttribute('t')
      const raw = cellNode.querySelector('v')?.textContent ?? ''
      if (type === 's') {
        const idx = Number(raw)
        return Number.isInteger(idx) ? (sharedStrings[idx] ?? '') : ''
      }
      if (type === 'b') return raw === '1'
      return raw
    })
  })

  return rows.filter((row) => row.some((cell) => String(cell ?? '').trim().length > 0))
}

const buildImportDataset = (rows: unknown[][]) => {
  if (rows.length === 0) throw new Error('File does not include rows')

  const headers = rows[0].map((value, index) => {
    const label = String(value ?? '').trim()
    return label || `Column ${index + 1}`
  })

  const uniqueKeys = new Set<string>()
  const columns: ImportedColumn[] = headers.map((header, index) => {
    let key = normalizeColumnKey(header, index)
    while (uniqueKeys.has(key)) {
      key = `${key}_${index + 1}`
    }
    uniqueKeys.add(key)

    const values = rows.slice(1).map((row) => row[index] ?? '')
    return { key, label: header, type: inferColumnType(values) }
  })

  const mappedRows: ImportedRow[] = rows.slice(1).map((row) => {
    const payload: ImportedRow = {}
    columns.forEach((column, columnIndex) => {
      payload[column.key] = castByType(row[columnIndex] ?? '', column.type)
    })
    return payload
  })

  return { columns, rows: mappedRows }
}

export const parseImportFile = async (file: File) => {
  const lowerName = file.name.toLowerCase()

  if (lowerName.endsWith('.csv')) {
    const text = await file.text()
    return buildImportDataset(parseCsvRows(text))
  }

  if (lowerName.endsWith('.xlsx')) {
    const arrayBuffer = await file.arrayBuffer()
    const rows = await parseXlsx(arrayBuffer)
    return buildImportDataset(rows)
  }

  throw new Error('Only CSV and XLSX files are supported')
}
