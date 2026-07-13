'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatWaterDate, type WaterSession } from '@/lib/water-ops';

type WaterReadingsChartProps = {
  sessions: WaterSession[];
};

export default function WaterReadingsChart({ sessions }: WaterReadingsChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return sorted.map((session) => ({
      date: formatWaterDate(session.createdAt),
      amount: session.amount,
    }));
  }, [sessions]);

  if (sessions.length < 2) {
    return null;
  }

  return (
    <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Trends</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Amount over time</h2>
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
            <Line
              type="monotone"
              dataKey="amount"
              name="Amount"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
