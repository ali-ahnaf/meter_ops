'use client';

import { useEffect, useMemo, useState } from 'react';
import SessionCard from '@/components/session-card';
import {
  DEFAULT_TARIFF,
  MeterSession,
  STORAGE_KEY,
  buildConsumptionReport,
  formatSessionDate,
  seedSessions,
  sortSessions,
} from '@/lib/meter-ops';

export default function ConsumptionReport() {
  const [sessions, setSessions] = useState<MeterSession[]>(sortSessions(seedSessions));
  const [selectedIds, setSelectedIds] = useState<string[]>(
    sortSessions(seedSessions)
      .slice(0, 2)
      .map((session) => session.id),
  );
  const [tariff, setTariff] = useState(DEFAULT_TARIFF.toString());

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      const seededSessions = sortSessions(seedSessions);
      setSessions(seededSessions);
      setSelectedIds(seededSessions.slice(0, 2).map((session) => session.id));
      return;
    }

    try {
      const parsed = sortSessions(JSON.parse(storedValue) as MeterSession[]);
      setSessions(parsed);
      setSelectedIds(parsed.slice(0, 2).map((session) => session.id));
    } catch (error) {
      console.error('Failed to read stored sessions:', error);
    }
  }, []);

  const orderedSessions = sortSessions(sessions);
  const numericTariff = Number(tariff) || 0;
  const report = useMemo(() => {
    if (selectedIds.length !== 2) {
      return null;
    }

    return buildConsumptionReport(
      orderedSessions,
      selectedIds[0],
      selectedIds[1],
      numericTariff,
    );
  }, [numericTariff, orderedSessions, selectedIds]);

  const toggleSession = (sessionId: string) => {
    setSelectedIds((current) => {
      if (current.includes(sessionId)) {
        return current.filter((id) => id !== sessionId);
      }

      if (current.length === 2) {
        return [current[1], sessionId];
      }

      return [...current, sessionId];
    });
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <section className="tech-panel grid-overlay rounded-[2rem] p-8">
        <p className="text-[0.72rem] uppercase tracking-[0.34em] text-cyan-300/80">
          Consumption comparator
        </p>
        <h1 className="mt-4 text-4xl font-bold uppercase tracking-[0.16em] text-slate-50 sm:text-5xl">
          Pick any two sessions
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
          Select two archived checkpoints and the system calculates meter consumption between
          those dates, along with per-flat bill totals using the tariff you set.
        </p>

        <div className="mt-8 flex flex-wrap items-end gap-4">
          <label className="w-full max-w-xs">
            <span className="text-[0.68rem] uppercase tracking-[0.3em] text-slate-400">
              Tariff per unit
            </span>
            <input
              className="mt-2 w-full rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.86)] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300"
              value={tariff}
              onChange={(event) => setTariff(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <div className="rounded-2xl border border-[rgba(244,114,182,0.24)] bg-[rgba(244,114,182,0.08)] px-4 py-3 text-xs uppercase tracking-[0.22em] text-pink-100">
            Choose exactly 2 sessions
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {orderedSessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            selectable
            selected={selectedIds.includes(session.id)}
            onClick={() => toggleSession(session.id)}
          />
        ))}
      </section>

      <section className="tech-panel rounded-[2rem] p-8">
        {report ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.34em] text-cyan-300/80">
                  Computed interval
                </p>
                <h2 className="mt-2 text-2xl font-bold uppercase tracking-[0.14em] text-slate-50">
                  {formatSessionDate(report.from.createdAt)} {'->'}{' '}
                  {formatSessionDate(report.to.createdAt)}
                </h2>
              </div>
              <div className="flex flex-wrap gap-4">
                <SummaryChip label="Total consumption" value={`${report.totalConsumption.toLocaleString()} units`} />
                <SummaryChip label="Estimated bill" value={`${report.totalBill.toFixed(2)} ৳`} />
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[rgba(148,163,184,0.14)]">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-[rgba(15,23,42,0.82)] text-[0.68rem] uppercase tracking-[0.26em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Flat</th>
                    <th className="px-4 py-4">Start</th>
                    <th className="px-4 py-4">End</th>
                    <th className="px-4 py-4">Consumption</th>
                    <th className="px-4 py-4">Bill</th>
                    <th className="px-4 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr
                      key={row.flatNumber}
                      className="border-t border-[rgba(148,163,184,0.1)] bg-[rgba(2,6,23,0.54)] text-sm text-slate-200"
                    >
                      <td className="px-4 py-4 font-bold text-cyan-200">{row.flatNumber}</td>
                      <td className="px-4 py-4">{row.startReading}</td>
                      <td className="px-4 py-4">{row.endReading}</td>
                      <td className="px-4 py-4">{row.consumption}</td>
                      <td className="px-4 py-4">{row.bill.toFixed(2)} ৳</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] ${
                            row.status === 'ok'
                              ? 'border border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.08)] text-lime-200'
                              : 'border border-[rgba(244,114,182,0.24)] bg-[rgba(244,114,182,0.08)] text-pink-100'
                          }`}
                        >
                          {row.status === 'ok' ? 'normal' : 'check meter'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            Select two sessions to calculate consumption. The math refuses to happen without both ends.
          </p>
        )}
      </section>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[rgba(15,23,42,0.55)] px-4 py-3">
      <p className="text-[0.62rem] uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-50">{value}</p>
    </div>
  );
}
