'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Camera, FolderPlus, ScanSearch, Zap } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import ConsumptionGraph from '@/components/consumption-graph';
import SessionCard from '@/components/session-card';
import {
  DEFAULT_TARIFF,
  MeterReading,
  MeterSession,
  STORAGE_KEY,
  cleanOcrText,
  extractReadingValue,
  seedSessions,
  sortSessions,
} from '@/lib/meter-ops';

type PendingCapture = {
  previewUrl: string;
  fileName: string;
  ocrText: string;
  flatNumber: string;
};

export default function MeterOpsDashboard() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sessions, setSessions] = useState<MeterSession[]>(sortSessions(seedSessions));
  const [draftReadings, setDraftReadings] = useState<MeterReading[]>([]);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedSessions));
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as MeterSession[];
      if (Array.isArray(parsed) && parsed.length) {
        setSessions(sortSessions(parsed));
      }
    } catch (error) {
      console.error('Failed to parse saved meter sessions:', error);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    return () => {
      if (pendingCapture?.previewUrl) {
        URL.revokeObjectURL(pendingCapture.previewUrl);
      }
    };
  }, [pendingCapture]);

  const orderedSessions = sortSessions(sessions);
  const latestSession = orderedSessions[0];
  const latestTotal =
    latestSession?.readings.reduce((total, reading) => total + reading.reading, 0) ?? 0;

  const triggerCamera = () => {
    setErrorMessage('');
    fileInputRef.current?.click();
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setIsRecognizing(true);
    setOcrProgress(6);
    setPendingCapture({
      previewUrl,
      fileName: file.name,
      ocrText: '',
      flatNumber: '',
    });

    try {
      const { recognize } = await import('tesseract.js');
      const result = await recognize(file, 'eng', {
        logger: (message) => {
          if (message.status === 'recognizing text' && typeof message.progress === 'number') {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });

      setPendingCapture((current) =>
        current
          ? {
              ...current,
              ocrText: cleanOcrText(result.data.text),
            }
          : current,
      );
    } catch (error) {
      console.error('OCR failed:', error);
      setPendingCapture((current) =>
        current
          ? {
              ...current,
              ocrText: '',
            }
          : current,
      );
      setErrorMessage('OCR could not extract a reading. Manual correction is available.');
    } finally {
      setIsRecognizing(false);
      setOcrProgress(100);
      event.target.value = '';
    }
  };

  const closeCapture = () => {
    if (pendingCapture?.previewUrl) {
      URL.revokeObjectURL(pendingCapture.previewUrl);
    }

    setPendingCapture(null);
    setErrorMessage('');
    setOcrProgress(0);
  };

  const commitReading = (continueSession: boolean) => {
    if (!pendingCapture) {
      return;
    }

    const readingValue = extractReadingValue(pendingCapture.ocrText);

    if (!pendingCapture.flatNumber.trim()) {
      setErrorMessage('Flat number is required before this thing pretends to be organized.');
      return;
    }

    if (readingValue === null) {
      setErrorMessage('No meter value detected. Edit the OCR text until an actual number exists.');
      return;
    }

    const nextReading: MeterReading = {
      id: crypto.randomUUID(),
      flatNumber: pendingCapture.flatNumber.trim().toUpperCase(),
      reading: readingValue,
      ocrText: pendingCapture.ocrText,
      capturedAt: new Date().toISOString(),
      imageName: pendingCapture.fileName,
    };

    const nextDraft = [...draftReadings, nextReading];
    setDraftReadings(nextDraft);
    closeCapture();

    if (continueSession) {
      queueMicrotask(() => triggerCamera());
      return;
    }

    setSessions((current) =>
      sortSessions([
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          readings: nextDraft,
        },
        ...current,
      ]),
    );
    setDraftReadings([]);
  };

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="tech-panel grid-overlay rounded-[2rem] p-8">
            <p className="text-[0.72rem] uppercase tracking-[0.34em] text-cyan-300/80">
              Meter intelligence console
            </p>
            <h1
              className="glitch-text mt-4 text-4xl font-bold uppercase tracking-[0.16em] text-slate-50 sm:text-5xl"
              data-text="ELECTRIC LOAD // SESSION TRACKER"
            >
              ELECTRIC LOAD // SESSION TRACKER
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Capture meter readings as sessions, let OCR do the first pass, then compare any
              two checkpoints to calculate consumption and bill totals. Very cyberpunk, but with
              utility math.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <MetricCard label="Sessions archived" value={String(orderedSessions.length).padStart(2, '0')} icon={<FolderPlus className="h-4 w-4" />} />
              <MetricCard label="Latest meter sum" value={latestTotal.toLocaleString()} icon={<Zap className="h-4 w-4" />} />
              <MetricCard label="Default tariff" value={`${DEFAULT_TARIFF.toFixed(2)} ৳`} icon={<ScanSearch className="h-4 w-4" />} />
            </div>
          </div>

          <div className="tech-panel scan-lines rounded-[2rem] p-8">
            <p className="text-[0.72rem] uppercase tracking-[0.34em] text-pink-200/80">
              Active capture loop
            </p>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[rgba(15,23,42,0.55)] p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-slate-400">
                  Session draft size
                </p>
                <p className="mt-2 text-3xl font-bold text-cyan-200 data-flicker">
                  {draftReadings.length}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[rgba(15,23,42,0.55)] p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-slate-400">
                  Flow
                </p>
                <ol className="mt-3 space-y-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                  <li>1. Tap the floating scanner.</li>
                  <li>2. Capture meter image from the camera.</li>
                  <li>3. Review OCR text and assign a flat.</li>
                  <li>4. Use `Next` to keep scanning or `End session` to commit.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <ConsumptionGraph sessions={orderedSessions} />

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.34em] text-cyan-300/80">
                Previous sessions
              </p>
              <h2 className="mt-2 text-2xl font-bold uppercase tracking-[0.14em] text-slate-50">
                Logged meter checkpoints
              </h2>
            </div>
          </div>

          <div className="grid gap-4">
            {orderedSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      </div>

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelection}
      />

      <Button
        className="fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full shadow-[0_0_36px_rgba(34,211,238,0.24)]"
        size="icon"
        onClick={triggerCamera}
      >
        <Camera className="h-6 w-6" />
      </Button>

      {pendingCapture ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(2,6,23,0.82)] p-4 sm:items-center">
          <div className="tech-panel w-full max-w-3xl rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.34em] text-cyan-300/80">
                  OCR review modal
                </p>
                <h3 className="mt-2 text-2xl font-bold uppercase tracking-[0.14em] text-slate-50">
                  Inspect capture
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={closeCapture}>
                Close
              </Button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="scan-lines overflow-hidden rounded-[1.5rem] border border-[rgba(34,211,238,0.18)] bg-[rgba(15,23,42,0.6)]">
                <Image
                  src={pendingCapture.previewUrl}
                  alt="Meter capture preview"
                  className="h-full min-h-[320px] w-full object-cover"
                  height={720}
                  unoptimized
                  width={540}
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[rgba(15,23,42,0.55)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.3em] text-slate-400">
                      OCR status
                    </p>
                    <p className="text-[0.68rem] uppercase tracking-[0.26em] text-cyan-300">
                      {isRecognizing ? `${ocrProgress}%` : 'ready'}
                    </p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[rgba(15,23,42,0.95)]">
                    <div
                      className="h-2 rounded-full bg-cyan-300 transition-all"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>

                <label className="block">
                  <span className="text-[0.68rem] uppercase tracking-[0.3em] text-slate-400">
                    Converted text
                  </span>
                  <textarea
                    className="mt-2 h-36 w-full rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.86)] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300"
                    value={pendingCapture.ocrText}
                    onChange={(event) =>
                      setPendingCapture((current) =>
                        current
                          ? {
                              ...current,
                              ocrText: event.target.value,
                            }
                          : current,
                      )
                    }
                    placeholder={isRecognizing ? 'Recognizing text...' : 'OCR output will appear here.'}
                  />
                </label>

                <label className="block">
                  <span className="text-[0.68rem] uppercase tracking-[0.3em] text-slate-400">
                    Flat number
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.86)] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300"
                    value={pendingCapture.flatNumber}
                    onChange={(event) =>
                      setPendingCapture((current) =>
                        current
                          ? {
                              ...current,
                              flatNumber: event.target.value,
                            }
                          : current,
                      )
                    }
                    placeholder="A-01"
                  />
                </label>

                {errorMessage ? (
                  <p className="rounded-2xl border border-[rgba(244,114,182,0.32)] bg-[rgba(244,114,182,0.08)] px-4 py-3 text-sm text-pink-100">
                    {errorMessage}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => commitReading(true)}
                    disabled={isRecognizing}
                  >
                    Next
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => commitReading(false)}
                    disabled={isRecognizing}
                  >
                    End session
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[rgba(15,23,42,0.55)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-slate-400">{label}</p>
        <span className="text-cyan-300">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-50">{value}</p>
    </div>
  );
}
