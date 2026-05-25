'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatSessionDate, type MeterSession } from '@/lib/meter-ops';

type MeterReadingsChartProps = {
  sessions: MeterSession[];
};

const LINE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

function normalizeOwner(name: string) {
  return name.trim().toLocaleLowerCase();
}

export default function MeterReadingsChart({ sessions }: MeterReadingsChartProps) {
  const { chartData, meterNames } = useMemo(() => {
    const ownerDisplayNames = new Map<string, string>();

    for (const session of sessions) {
      for (const reading of session.readings) {
        const key = normalizeOwner(reading.ownerName);
        if (!ownerDisplayNames.has(key)) {
          ownerDisplayNames.set(key, reading.ownerName);
        }
      }
    }

    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const data = sortedSessions.map((session) => {
      const point: Record<string, number | string> = {
        date: formatSessionDate(session.createdAt),
      };

      for (const reading of session.readings) {
        const key = normalizeOwner(reading.ownerName);
        point[key] = reading.reading;
      }

      return point;
    });

    const names = [...ownerDisplayNames.entries()].map(([key, display]) => ({ key, display }));
    names.sort((a, b) => a.display.localeCompare(b.display));

    return { chartData: data, meterNames: names };
  }, [sessions]);

  const [hiddenMeters, setHiddenMeters] = useState<Set<string>>(new Set());

  const toggleMeter = (key: string) => {
    setHiddenMeters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (sessions.length < 2) {
    return null;
  }

  return (
    <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Trends</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Readings over time</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {meterNames.map(({ key, display }, index) => {
          const color = LINE_COLORS[index % LINE_COLORS.length];
          const hidden = hiddenMeters.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleMeter(key)}
              type="button"
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                hidden
                  ? 'border-slate-200 bg-white text-slate-400'
                  : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: hidden ? '#cbd5e1' : color }}
              />
              {display}
            </button>
          );
        })}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '0.875rem',
              }}
            />
            {meterNames.map(({ key, display }, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={display}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                hide={hiddenMeters.has(key)}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
