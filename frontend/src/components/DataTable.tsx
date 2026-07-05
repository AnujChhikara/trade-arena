import { ReactNode } from 'react'

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, onRowClick, emptyMessage = 'No data',
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-arena-border">
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold text-arena-muted uppercase tracking-wider ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-arena-border/50 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.className || ''}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-arena-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
