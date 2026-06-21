import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  emptyIcon?: string;
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data found',
  emptyIcon = 'inbox',
}: TableProps<T>) {
  return (
    <div className="border border-outline-variant rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="table">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ${col.className || ''}`}
                  scope="col"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 text-xs">
            {data.length > 0 ? (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-surface-container-low/40 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row, idx)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(row, idx);
                    }
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                      {col.render ? col.render(row, idx) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-on-surface-variant/60">
                  <span className="material-symbols-outlined text-4xl block mb-2">{emptyIcon}</span>
                  <p className="text-xs">{emptyMessage}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
