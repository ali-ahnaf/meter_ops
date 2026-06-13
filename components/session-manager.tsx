'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calculator, Check, FileText, Plus, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MeterReadingsChart from '@/components/meter-readings-chart';
import {
  formatSessionDate,
  sanitizeReadingInput,
  sortSessions,
  type MeterReading,
  type MeterSession,
} from '@/lib/meter-ops';
import { getSessionsAction, saveSessionsAction } from '@/app/actions';

type ManualDraft = {
  ownerName: string;
  readingInput: string;
  isMotherMeter: boolean;
};

export default function SessionManager() {
  const router = useRouter();
  const [sessions, setSessions] = useState<MeterSession[]>([]);
  const [draftReadings, setDraftReadings] = useState<MeterReading[]>([]);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualDraft>({
    ownerName: '',
    readingInput: '',
    isMotherMeter: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCalculationModalOpen, setIsCalculationModalOpen] = useState(false);
  const [selectedCalculationSessionIds, setSelectedCalculationSessionIds] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importDate, setImportDate] = useState('');

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const parsed = await getSessionsAction();
        setSessions(sortSessions(Array.isArray(parsed) ? parsed : []));
      } catch (error) {
        console.error('Failed to read saved meter sessions:', error);
        setSessions([]);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSessions();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    saveSessionsAction(sessions);
  }, [isLoaded, sessions]);

  const startManualEntry = () => {
    setErrorMessage('');
    setManualDraft({
      ownerName: '',
      readingInput: '',
      isMotherMeter: false,
    });
    setIsManualEntryOpen(true);
  };

  const closeManualEntry = () => {
    setIsManualEntryOpen(false);
    setErrorMessage('');
  };

  const updateManualDraft = (changes: Partial<ManualDraft>) => {
    setManualDraft((current) => ({ ...current, ...changes }));
  };

  const openCalculationModal = () => {
    setSelectedCalculationSessionIds([]);
    setIsCalculationModalOpen(true);
  };

  const closeCalculationModal = () => {
    setIsCalculationModalOpen(false);
    setSelectedCalculationSessionIds([]);
  };

  const openImportModal = () => {
    setImportText('');
    setImportDate(new Date().toISOString().slice(0, 10));
    setIsImportModalOpen(true);
  };

  const openImportFromManualEntry = () => {
    setIsManualEntryOpen(false);
    openImportModal();
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
  };

  const importReadings = () => {
    const capturedAt = new Date(`${importDate}T12:00:00`).toISOString();
    const readings: MeterReading[] = importText
      .split('\n')
      .flatMap((line) => {
        const match = line.trim().match(/^(\S+)\s+([\d.]+)/);
        if (!match) return [];
        const ownerName = match[1];
        const readingValue = Number(match[2]);
        if (!Number.isFinite(readingValue)) return [];
        return [{
          id: crypto.randomUUID(),
          ownerName,
          reading: readingValue,
          ocrText: '',
          capturedAt,
          ...(ownerName === 'MM' && { isMotherMeter: true }),
        } satisfies MeterReading];
      });

    if (readings.length === 0) return;

    const newSession: MeterSession = {
      id: crypto.randomUUID(),
      createdAt: capturedAt,
      readings,
    };

    const nextSessions = sortSessions([newSession, ...sessions]);
    saveSessionsAction(nextSessions);
    setSessions(nextSessions);
    closeImportModal();
    router.push(`/sessions/${newSession.id}`);
  };

  const deleteSession = (sessionId: string) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) {
      return;
    }

    setSessions((current) => {
      const next = current.filter((s) => s.id !== sessionId);
      saveSessionsAction(next);
      return next;
    });
  };

  const toggleCalculationSession = (sessionId: string) => {
    setSelectedCalculationSessionIds((current) => {
      if (current.includes(sessionId)) {
        return current.filter((id) => id !== sessionId);
      }

      if (current.length >= 2) {
        return current;
      }

      return [...current, sessionId];
    });
  };

  const viewCalculation = () => {
    if (selectedCalculationSessionIds.length !== 2) {
      return;
    }

    const [firstSessionId, secondSessionId] = selectedCalculationSessionIds;
    closeCalculationModal();
    router.push(
      `/consumption?firstSessionId=${encodeURIComponent(firstSessionId)}&secondSessionId=${encodeURIComponent(secondSessionId)}`,
    );
  };

  const saveReading = (action: 'continue' | 'end') => {
    const ownerName = manualDraft.ownerName.trim();
    const readingValue = Number(manualDraft.readingInput.trim());

    if (!ownerName) {
      setErrorMessage('Owner name is required.');
      return;
    }

    if (!Number.isFinite(readingValue) || manualDraft.readingInput.trim() === '') {
      setErrorMessage('Enter a valid meter reading before continuing.');
      return;
    }

    const nextReading: MeterReading = {
      id: crypto.randomUUID(),
      ownerName,
      reading: readingValue,
      ocrText: '',
      capturedAt: new Date().toISOString(),
      ...(manualDraft.isMotherMeter && { isMotherMeter: true }),
    };

    const nextDraftReadings = [...draftReadings, nextReading];
    setDraftReadings(nextDraftReadings);

    if (action === 'continue') {
      setManualDraft({
        ownerName: '',
        readingInput: '',
        isMotherMeter: false,
      });
      setErrorMessage('');
      return;
    }

    const nextSession: MeterSession = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      readings: nextDraftReadings,
    };

    const nextSessions = sortSessions([nextSession, ...sessions]);
    saveSessionsAction(nextSessions);
    setSessions(nextSessions);
    setDraftReadings([]);
    closeManualEntry();
    router.push(`/sessions/${nextSession.id}`);
  };

  return (
    <main className="app-shell">
      <div className="page-wrap space-y-6">
        <section className="surface-card rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Meter Ops</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                Home
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Start a session, enter meter readings manually, and save each reading with the owner name.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3">
              <Button className="min-w-44" onClick={startManualEntry}>
                <Plus className="h-4 w-4" />
                Add Session
              </Button>
              <Button
                className="min-w-44"
                disabled={!isLoaded || sessions.length < 2}
                onClick={openCalculationModal}
                variant="secondary"
              >
                <Calculator className="h-4 w-4" />
                Calculate
              </Button>
              <p className="text-sm text-slate-500">
                {draftReadings.length > 0
                  ? `Current draft: ${draftReadings.length} reading${draftReadings.length === 1 ? '' : 's'}`
                  : 'No active draft yet'}
              </p>
            </div>
          </div>
        </section>

        {sessions.length >= 2 ? <MeterReadingsChart sessions={sessions} /> : null}

        <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Sessions</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">All saved sessions</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={openImportModal}
                title="Import readings"
                type="button"
              >
                <Upload className="h-4 w-4" />
              </button>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                {sessions.length} total
              </div>
            </div>
          </div>

          {!isLoaded ? (
            <p className="mt-6 text-slate-600">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-center text-slate-600">
              <FileText className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-900">No sessions yet</p>
              <p className="mt-2 text-sm">
                Start one with the button above.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center rounded-[1.5rem] border border-slate-200 bg-white transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <Link
                    className="flex-1 px-5 py-5"
                    href={`/sessions/${session.id}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatSessionDate(session.createdAt)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {session.readings.length} meter reading
                          {session.readings.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                        View session
                      </span>
                    </div>
                  </Link>
                  <button
                    className="mr-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => deleteSession(session.id)}
                    title="Delete session"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {isManualEntryOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="surface-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
                    Add reading
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Enter reading details
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={openImportFromManualEntry} variant="secondary" className="gap-1.5">
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>
                  <Button onClick={closeManualEntry} variant="ghost" className="px-2">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {errorMessage ? (
                  <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : null}

                <div>
                  <label className="field-label" htmlFor="owner-name">
                    Owner name
                  </label>
                  <select
                    className="field-input"
                    id="owner-name"
                    onChange={(event) =>
                      updateManualDraft({ ownerName: event.target.value })
                    }
                    value={manualDraft.ownerName}
                  >
                    <option value="">Select meter owner</option>
                    {['1A', '1B', '2A', '2B', '3A', '3B', '4', '5', '6', '7', 'MM'].map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    checked={manualDraft.isMotherMeter}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={
                      !manualDraft.isMotherMeter &&
                      draftReadings.some((r) => r.isMotherMeter)
                    }
                    id="is-mother-meter"
                    onChange={(event) =>
                      updateManualDraft({ isMotherMeter: event.target.checked })
                    }
                    type="checkbox"
                  />
                  <label
                    className={`cursor-pointer select-none text-sm font-medium text-slate-700 ${
                      !manualDraft.isMotherMeter && draftReadings.some((r) => r.isMotherMeter)
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                    }`}
                    htmlFor="is-mother-meter"
                  >
                    Mother meter
                    {!manualDraft.isMotherMeter && draftReadings.some((r) => r.isMotherMeter) ? (
                      <span className="ml-1.5 text-xs font-normal text-slate-500">
                        (already set for this session)
                      </span>
                    ) : null}
                  </label>
                </div>

                <div>
                  <label className="field-label" htmlFor="meter-reading">
                    Meter reading
                  </label>
                  <input
                    className="field-input"
                    id="meter-reading"
                    inputMode="decimal"
                    onChange={(event) =>
                      updateManualDraft({
                        readingInput: sanitizeReadingInput(event.target.value),
                      })
                    }
                    placeholder="Enter reading"
                    value={manualDraft.readingInput}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <Button onClick={() => saveReading('end')} variant="secondary">
                    End Session
                  </Button>
                  <Button onClick={() => saveReading('continue')}>Continue</Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isCalculationModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="surface-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
                    Compare sessions
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Select exactly two sessions
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Pick the older and newer meter snapshots you want to compare. The math part is
                    doing very little improvisation.
                  </p>
                </div>
                <Button onClick={closeCalculationModal} variant="ghost" className="px-2">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                {sessions.map((session) => {
                  const isSelected = selectedCalculationSessionIds.includes(session.id);
                  const disableSelection =
                    !isSelected && selectedCalculationSessionIds.length >= 2;

                  return (
                    <button
                      key={session.id}
                      className={`flex w-full items-center justify-between rounded-[1.35rem] border px-5 py-4 text-left transition-colors ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      } ${disableSelection ? 'cursor-not-allowed opacity-50' : ''}`}
                      disabled={disableSelection}
                      onClick={() => toggleCalculationSession(session.id)}
                      type="button"
                    >
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {formatSessionDate(session.createdAt)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {session.readings.length} meter reading
                          {session.readings.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-blue-700 bg-blue-700 text-white'
                            : 'border-slate-300 bg-white text-slate-400'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] bg-slate-100 px-4 py-3">
                <p className="text-sm text-slate-600">
                  {selectedCalculationSessionIds.length} of 2 sessions selected
                </p>
                <Button
                  disabled={selectedCalculationSessionIds.length !== 2}
                  onClick={viewCalculation}
                >
                  Calculate
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {isImportModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
                    Import readings
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Paste meter readings
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    One reading per line in the format{' '}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                      OWNER&nbsp;&nbsp;READING
                    </code>
                    , e.g.{' '}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                      MM&nbsp;&nbsp;11458.8
                    </code>
                    .
                  </p>
                </div>
                <Button onClick={closeImportModal} variant="ghost" className="px-2">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="field-label" htmlFor="import-date">
                    Session date
                  </label>
                  <input
                    className="field-input"
                    id="import-date"
                    type="date"
                    value={importDate}
                    onChange={(e) => setImportDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="import-text">
                    Readings
                  </label>
                  <textarea
                    autoFocus
                    className="field-input min-h-64 resize-y font-mono text-sm"
                    id="import-text"
                    placeholder={"MM    11458.8\n1A    28926.3\n1B    26646.3\n2A    16508\n..."}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] bg-slate-100 px-4 py-3">
                <p className="text-sm text-slate-600">
                  {importText.split('\n').filter((l) => /^\S+\s+[\d.]+/.test(l.trim())).length} readings parsed
                </p>
                <Button
                  disabled={
                    !importDate ||
                    importText.split('\n').filter((l) => /^\S+\s+[\d.]+/.test(l.trim())).length === 0
                  }
                  onClick={importReadings}
                >
                  Import session
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
