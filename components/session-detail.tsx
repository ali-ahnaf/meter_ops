'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import SessionTable from '@/components/session-table';
import { Button } from '@/components/ui/button';
import {
  formatSessionDate,
  sortSessions,
  type MeterReading,
  type MeterSession,
} from '@/lib/meter-ops';
import { getSessionsAction, saveSessionsAction } from '@/app/actions';

type SessionDetailProps = {
  sessionId: string;
};

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const [session, setSession] = useState<MeterSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState('');

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const parsed = await getSessionsAction();
        const selected = sortSessions(Array.isArray(parsed) ? parsed : []).find((item: any) => item.id === sessionId) ?? null;
        setSession(selected);
      } catch (error) {
        console.error('Failed to read saved meter sessions:', error);
        setSession(null);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSessions();
  }, [sessionId]);

  useEffect(() => {
    if (!isLoaded || !session) return;

    const updateSessions = async () => {
      try {
        const parsed = await getSessionsAction();
        let allSessions: MeterSession[] = Array.isArray(parsed) ? parsed : [];
        const nextSessions = allSessions.map((s) => (s.id === session.id ? session : s));
        await saveSessionsAction(nextSessions);
      } catch (e) {
        console.error(e);
      }
    };
    updateSessions();
  }, [session, isLoaded]);

  const updateReading = (
    readingId: string,
    changes: { ownerName: string; reading: number; isMotherMeter: boolean; capturedAt: string },
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

  const startEditDate = () => {
    if (!session) return;
    setDateDraft(session.createdAt.slice(0, 16));
    setIsEditingDate(true);
  };

  const cancelEditDate = () => {
    setIsEditingDate(false);
    setDateDraft('');
  };

  const saveDate = () => {
    if (!dateDraft) return;
    setSession((current) => {
      if (!current) return current;
      return { ...current, createdAt: new Date(dateDraft).toISOString() };
    });
    setIsEditingDate(false);
    setDateDraft('');
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
                  {isEditingDate ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        autoFocus
                        className="field-input py-1 text-sm"
                        type="datetime-local"
                        value={dateDraft}
                        onChange={(e) => setDateDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveDate();
                          if (e.key === 'Escape') cancelEditDate();
                        }}
                      />
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-white hover:bg-blue-800"
                        title="Save date"
                        type="button"
                        onClick={saveDate}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Cancel"
                        type="button"
                        onClick={cancelEditDate}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-lg font-semibold text-slate-900">
                        {formatSessionDate(session.createdAt)}
                      </p>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Edit session date"
                        type="button"
                        onClick={startEditDate}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
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
