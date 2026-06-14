'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Calculator } from 'lucide-react';
import {
  buildConsumptionComparison,
  formatCost,
  formatReadingWithUnit,
  TRANSFORMER_LOSS_RATE,
} from '@/lib/consumption';
import { formatSessionDate, type MeterSession } from '@/lib/meter-ops';

type RecentConsumptionCardProps = {
  sessions: MeterSession[];
};

export default function RecentConsumptionCard({ sessions }: RecentConsumptionCardProps) {
  // sessions arrive sorted newest-first, so the two most recent are [0] and [1].
  const newerSession = sessions[0];
  const olderSession = sessions[1];

  const comparison = useMemo(() => {
    if (!newerSession || !olderSession) {
      return null;
    }

    return buildConsumptionComparison(olderSession, newerSession);
  }, [newerSession, olderSession]);

  if (!comparison) {
    return null;
  }

  const totalCost = comparison.rows.reduce((sum, row) => sum + row.cost, 0);

  return (
    <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Latest</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Recent consumption</h2>
          <p className="mt-2 text-sm text-slate-600">
            Calculated from the two most recent sessions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
            {formatSessionDate(comparison.olderSession.createdAt)}
          </span>
          <span className="text-slate-400">&rarr;</span>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
            {formatSessionDate(comparison.newerSession.createdAt)}
          </span>
        </div>
      </div>

      {comparison.rows.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-center text-slate-600">
          <Calculator className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-4 text-lg font-semibold text-slate-900">No comparable meter owners</p>
          <p className="mt-2 text-sm">
            The two most recent sessions do not share any owner names, so there is nothing to
            subtract.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="session-table">
              <thead>
                <tr>
                  <th>Meter Owner</th>
                  <th>Consumption (kWh)</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr
                    key={row.ownerName}
                    className={row.isMotherMeter ? 'bg-violet-50' : undefined}
                  >
                    <td className="font-semibold text-slate-900">
                      {row.ownerName}
                      {row.isMotherMeter && (
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                          Mother
                        </span>
                      )}
                    </td>
                    <td>
                      {formatReadingWithUnit(row.consumption)}
                      {row.isMotherMeter && row.rawConsumption !== undefined && (
                        <span className="ml-1 text-xs text-slate-500">
                          (raw: {formatReadingWithUnit(row.rawConsumption)})
                        </span>
                      )}
                    </td>
                    <td>
                      {formatCost(row.cost)}
                      {row.isMotherMeter && (
                        <span className="ml-1 text-xs text-slate-500">
                          (+{TRANSFORMER_LOSS_RATE * 100}% loss)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="font-semibold text-slate-900">Total</td>
                  <td />
                  <td className="font-semibold text-slate-900">{formatCost(totalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-5">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
              href={`/consumption?firstSessionId=${encodeURIComponent(
                comparison.olderSession.id,
              )}&secondSessionId=${encodeURIComponent(comparison.newerSession.id)}`}
            >
              <Calculator className="h-4 w-4" />
              View full report
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
