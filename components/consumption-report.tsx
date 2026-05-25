'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildConsumptionComparison,
  formatCost,
  formatReadingWithUnit,
  TRANSFORMER_LOSS_RATE,
} from '@/lib/consumption';
import {
  STORAGE_KEY,
  formatSessionDate,
  sortSessions,
  type MeterSession,
} from '@/lib/meter-ops';

type ConsumptionReportProps = {
  firstSessionId: string | null;
  secondSessionId: string | null;
};

export default function ConsumptionReport({
  firstSessionId,
  secondSessionId,
}: ConsumptionReportProps) {
  const [sessions, setSessions] = useState<MeterSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      setIsLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as MeterSession[];
      setSessions(sortSessions(Array.isArray(parsed) ? parsed : []));
    } catch (error) {
      console.error('Failed to read saved meter sessions:', error);
      setSessions([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const comparison = useMemo(() => {
    if (!firstSessionId || !secondSessionId) {
      return null;
    }

    const firstSession = sessions.find((session) => session.id === firstSessionId);
    const secondSession = sessions.find((session) => session.id === secondSessionId);

    if (!firstSession || !secondSession) {
      return null;
    }

    return buildConsumptionComparison(firstSession, secondSession);
  }, [firstSessionId, secondSessionId, sessions]);

  return (
    <main className="app-shell">
      <div className="page-wrap space-y-6">
        <section className="surface-card rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Consumption</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                Session comparison
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Normal meter consumption: newer reading minus older reading. Cost: consumption ×
                10.50 + 5% VAT. Mother meter net consumption: raw diff minus sum of all normal
                meter consumptions. Mother meter cost adds an extra 15% transformer loss.
              </p>
            </div>

            <Button asChild variant="secondary">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back home
              </Link>
            </Button>
          </div>
        </section>

        {!isLoaded ? (
          <section className="surface-card rounded-[1.75rem] p-6 text-slate-600 sm:p-8">
            Loading sessions...
          </section>
        ) : !firstSessionId || !secondSessionId ? (
          <EmptyState message="Pick two sessions from the home page before opening the calculation view." />
        ) : !comparison ? (
          <EmptyState message="One or both selected sessions could not be found in local storage." />
        ) : (
          <>
            <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                  Date 1: {formatSessionDate(comparison.olderSession.createdAt)}
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                  Date 2: {formatSessionDate(comparison.newerSession.createdAt)}
                </div>
                <div className="rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700">
                  {comparison.rows.length} matched meter
                  {comparison.rows.length === 1 ? '' : 's'}
                </div>
              </div>

              {comparison.missingFromOlder.length > 0 || comparison.missingFromNewer.length > 0 ? (
                <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Only owners that exist in both sessions are included in the table.
                  {comparison.missingFromOlder.length > 0
                    ? ` Missing from date 1: ${comparison.missingFromOlder.join(', ')}.`
                    : ''}
                  {comparison.missingFromNewer.length > 0
                    ? ` Missing from date 2: ${comparison.missingFromNewer.join(', ')}.`
                    : ''}
                </div>
              ) : null}
            </section>

            <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
              {comparison.rows.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-center text-slate-600">
                  <Calculator className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-4 text-lg font-semibold text-slate-900">
                    No comparable meter owners
                  </p>
                  <p className="mt-2 text-sm">
                    The selected sessions do not share any owner names, so there is nothing useful
                    to subtract.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="session-table">
                    <thead>
                      <tr>
                        <th>Meter Owner</th>
                        <th>{formatSessionDate(comparison.olderSession.createdAt)}</th>
                        <th>{formatSessionDate(comparison.newerSession.createdAt)}</th>
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
                          <td>{formatReadingWithUnit(row.oldReading.reading)}</td>
                          <td>{formatReadingWithUnit(row.newReading.reading)}</td>
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
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-center text-slate-600">
        <Calculator className="mx-auto h-6 w-6 text-slate-400" />
        <p className="mt-4 text-lg font-semibold text-slate-900">Calculation unavailable</p>
        <p className="mt-2 text-sm">{message}</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">Go back</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
