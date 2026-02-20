export type ExportFormat = 'csv' | 'excel'

type ExportColumn = { key: string; label: string }
type ExportRow = Record<string, unknown>

const escapeCsv = (value: unknown) => {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.split('"').join('""')}"`
  }
  return text
}

const makeDownload = (content: string, mimeType: string, filename: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export const exportTableData = ({
  columns,
  rows,
  format,
  fileBaseName,
}: {
  columns: ExportColumn[]
  rows: ExportRow[]
  format: ExportFormat
  fileBaseName: string
}) => {
  if (!columns.length) return

  if (format === 'csv') {
    const header = columns.map((column) => escapeCsv(column.label)).join(',')
    const body = rows
      .map((row) => columns.map((column) => escapeCsv(row[column.key])).join(','))
      .join('\n')

    makeDownload(`${header}\n${body}`, 'text/csv;charset=utf-8;', `${fileBaseName}.csv`)
    return
  }

  const headerHtml = columns.map((column) => `<th>${column.label}</th>`).join('')
  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (column) =>
              `<td>${String(row[column.key] ?? '')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')}</td>`
          )
          .join('')}</tr>`
    )
    .join('')

  const tableHtml = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`
  makeDownload(tableHtml, 'application/vnd.ms-excel;charset=utf-8;', `${fileBaseName}.xls`)
}
