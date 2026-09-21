import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  title: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

interface Props<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  rowKey?: keyof T;
  compact?: boolean;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  compact = false,
}: Props<T>) {
  return (
    <div className="el-2 overflow-hidden rounded-2xl border border-line/70">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line/60 bg-bg2">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`mono px-4 ${compact ? "py-2.5" : "py-3"} text-[10px] uppercase tracking-[0.2em] text-dim ${
                    col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : ""
                  }`}
                  style={{ width: col.width }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={(rowKey ? row[rowKey] : i) as string}
                className="border-b border-line/40 transition-colors hover:bg-white/[0.02] last:border-0"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 ${compact ? "py-2" : "py-3"} text-ink ${
                      col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {col.render
                      ? col.render(row[col.key], row, i)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
