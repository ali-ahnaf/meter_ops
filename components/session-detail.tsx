'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SessionTable from '@/components/session-table';
import { Button } from '@/components/ui/button';
import {
  STORAGE_KEY,
  formatSessionDate,
  sortSessions,
  type MeterReading,
  type MeterSession,
} from '@/lib/meter-ops';

type SessionDetailProps = {
  sessionId: string;
};

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const [session, setSession] = useState<MeterSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      setIsLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as MeterSession[];
      const selected = sortSessions(parsed).find((item) => item.id === sessionId) ?? null;
      setSession(selected);
    } catch (error) {
      console.error('Failed to read saved meter sessions:', error);
      setSession(null);
    } finally {
      setIsLoaded(true);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isLoaded || !session) return;

    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    let allSessions: MeterSession[] = [];

    try {
      allSessions = storedValue ? (JSON.parse(storedValue) as MeterSession[]) : [];
    } catch {
      allSessions = [];
    }

    const nextSessions = allSessions.map((s) => (s.id === session.id ? session : s));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSessions));
  }, [session, isLoaded]);

  const updateReading = (
    readingId: string,
    changes: { ownerName: string; reading: number; isMotherMeter: boolean },
  ) => {
    setSession((current) => {
      if (!current) return current;
      return {
        ...current,
        readings: current.readings.map((r) => {
          if (r.id !== readingId) return r;
          const { isMotherMeter, ...rest } = { ...r, ...changes };
          return isMotherMeter ? { ...rest, isMotherMeter: true } : rest;
        }),
      };
    });
  };

  const deleteReading = (readingId: string) => {
    setSession((current) => {
      if (!current) return current;
      return { ...current, readings: current.readings.filter((r) => r.id !== readingId) };
    });
  };

  const addReading = (ownerName: string, reading: number, isMotherMeter: boolean) => {
    setSession((current) => {
      if (!current) return current;
      const alreadyHasMotherMeter = current.readings.some((r) => r.isMotherMeter);
      const newReading: MeterReading = {
        id: crypto.randomUUID(),
        ownerName,
        reading,
        capturedAt: new Date().toISOString(),
        ocrText: '',
        ...(isMotherMeter && !alreadyHasMotherMeter && { isMotherMeter: true }),
      };
      return { ...current, readings: [...current.readings, newReading] };
    });
  };

  return (
    <main className="app-shell">
      <div className="page-wrap space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Session detail</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Meter readings</h1>
          </div>
          <Button asChild variant="secondary">
            <Link href="/">Back to home</Link>
          </Button>
        </div>

        {!isLoaded ? (
          <section className="surface-card rounded-[1.75rem] p-8 text-slate-600">
            Loading session...
          </section>
        ) : session ? (
          <>
            <section className="surface-card rounded-[1.75rem] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatSessionDate(session.createdAt)}
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                  {session.readings.length} reading{session.readings.length === 1 ? '' : 's'}
                </div>
              </div>
            </section>

            <section className="surface-card rounded-[1.75rem] p-4 sm:p-6">
              <SessionTable
                session={session}
                onAddReading={addReading}
                onDeleteReading={deleteReading}
                onUpdateReading={updateReading}
              />
            </section>
          </>
        ) : (
          <section className="surface-card rounded-[1.75rem] p-8">
            <h2 className="text-xl font-semibold text-slate-900">Session not found</h2>
            <p className="mt-2 max-w-xl text-slate-600">
              The saved session is missing from local storage. Which is not ideal, but at least
              it&apos;s honest.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
