'use client';

import { Receipt } from 'lucide-react';
import type { LastUsage } from '@/lib/meter-ops';

type LastUsageCardProps = {
  usage: LastUsage | null;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date));
}

export default function LastUsageCard({ usage }: LastUsageCardProps) {
  if (!usage) {
    return null;
  }

  return (
    <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Latest</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Last session usage</h2>
          <p className="mt-2 text-sm text-slate-600">
            Amount from your most recent calculation.
          </p>
        </div>
        {usage.fromDate && usage.toDate ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
              {formatDate(usage.fromDate)}
            </span>
            <span className="text-slate-400">&rarr;</span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
              {formatDate(usage.toDate)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-6 py-6">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
          <Receipt className="h-5 w-5" />
        </span>
        <div>
          <p className="text-4xl font-bold text-slate-900">৳{formatAmount(usage.amount)}</p>
          {usage.detail ? <p className="mt-1 text-sm text-slate-500">{usage.detail}</p> : null}
          <p className="mt-1 text-xs text-slate-400">Calculated {formatDate(usage.calculatedAt)}</p>
        </div>
      </div>
    </section>
  );
}
