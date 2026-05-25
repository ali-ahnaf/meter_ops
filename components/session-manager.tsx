'use client';

import type { ChangeEvent } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  OCR_REGION,
  STORAGE_KEY,
  cleanOcrText,
  extractReadingValue,
  formatSessionDate,
  sortSessions,
  type MeterReading,
  type MeterSession,
} from '@/lib/meter-ops';

type CaptureDraft = {
  fileName: string;
  ownerName: string;
  ocrText: string;
  previewUrl: string;
  readingInput: string;
};

export default function SessionManager() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sessions, setSessions] = useState<MeterSession[]>([]);
  const [draftReadings, setDraftReadings] = useState<MeterReading[]>([]);
  const [captureDraft, setCaptureDraft] = useState<CaptureDraft | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

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

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [isLoaded, sessions]);

  useEffect(() => {
    return () => {
      if (captureDraft?.previewUrl) {
        URL.revokeObjectURL(captureDraft.previewUrl);
      }
    };
  }, [captureDraft]);

  const requestCapture = () => {
    setErrorMessage('');
    fileInputRef.current?.click();
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setErrorMessage('');
    setIsRecognizing(true);
    setOcrProgress(6);

    try {
      const croppedImage = await cropSelectedRegion(file);
      const { recognize } = await import('tesseract.js');
      const result = await recognize(croppedImage, 'eng', {
        logger: (message) => {
          if (message.status === 'recognizing text' && typeof message.progress === 'number') {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });

      const ocrText = cleanOcrText(result.data.text);
      setCaptureDraft({
        fileName: file.name,
        ownerName: '',
        ocrText,
        previewUrl,
        readingInput: extractReadingValue(ocrText)?.toString() ?? '',
      });
    } catch (error) {
      console.error('OCR failed:', error);
      setCaptureDraft({
        fileName: file.name,
        ownerName: '',
        ocrText: '',
        previewUrl,
        readingInput: '',
      });
      setErrorMessage('OCR missed the reading. Very ambitious of it. Enter the value manually.');
    } finally {
      setIsRecognizing(false);
      setOcrProgress(100);
      event.target.value = '';
    }
  };

  const updateCaptureDraft = (changes: Partial<CaptureDraft>) => {
    setCaptureDraft((current) => (current ? { ...current, ...changes } : current));
  };

  const closeCaptureDraft = () => {
    if (captureDraft?.previewUrl) {
      URL.revokeObjectURL(captureDraft.previewUrl);
    }

    setCaptureDraft(null);
    setErrorMessage('');
    setOcrProgress(0);
  };

  const saveReading = (action: 'continue' | 'end') => {
    if (!captureDraft) {
      return;
    }

    const ownerName = captureDraft.ownerName.trim();
    const readingValue = Number(captureDraft.readingInput.trim());

    if (!ownerName) {
      setErrorMessage('Owner name is required.');
      return;
    }

    if (!Number.isFinite(readingValue)) {
      setErrorMessage('Enter a valid meter reading before continuing.');
      return;
    }

    const nextReading: MeterReading = {
      id: crypto.randomUUID(),
      ownerName,
      reading: readingValue,
      ocrText: captureDraft.ocrText,
      capturedAt: new Date().toISOString(),
      imageName: captureDraft.fileName,
    };

    const nextDraftReadings = [...draftReadings, nextReading];
    setDraftReadings(nextDraftReadings);
    closeCaptureDraft();

    if (action === 'continue') {
      window.setTimeout(() => {
        fileInputRef.current?.click();
      }, 0);
      return;
    }

    const nextSession: MeterSession = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      readings: nextDraftReadings,
    };

    const nextSessions = sortSessions([nextSession, ...sessions]);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSessions));
    setSessions(nextSessions);
    setDraftReadings([]);
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
                Start a session, take meter photos, let Tesseract read the selected region, then
                save each reading with the owner name. A surprisingly normal workflow now.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3">
              <Button className="min-w-44" onClick={requestCapture}>
                <Plus className="h-4 w-4" />
                Add Session
              </Button>
              <p className="text-sm text-slate-500">
                {draftReadings.length > 0
                  ? `Current draft: ${draftReadings.length} reading${draftReadings.length === 1 ? '' : 's'}`
                  : 'No active draft yet'}
              </p>
            </div>
          </div>
        </section>

        <input
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelection}
          type="file"
        />

        {isRecognizing ? (
          <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
            <div className="flex items-center gap-3 text-slate-700">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span>Scanning the selected meter region...</span>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-700 transition-[width] duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-500">{ocrProgress}% complete</p>
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Sessions</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">All saved sessions</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
              {sessions.length} total
            </div>
          </div>

          {!isLoaded ? (
            <p className="mt-6 text-slate-600">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-center text-slate-600">
              <Camera className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-900">No sessions yet</p>
              <p className="mt-2 text-sm">
                Start one with the button above. Wildly controversial concept, I know.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 transition-colors hover:border-slate-300 hover:bg-slate-50"
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
              ))}
            </div>
          )}
        </section>

        {captureDraft ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="surface-card max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
                    Add reading
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Confirm reading details
                  </h3>
                </div>
                <Button onClick={closeCaptureDraft} variant="ghost">
                  Cancel
                </Button>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <div className="relative overflow-hidden rounded-[1.4rem] bg-slate-900">
                    {/* Show the fixed crop area used for OCR so the reading source is obvious. */}
                    <NextImage
                      alt="Captured meter"
                      className="block h-full max-h-[25rem] w-full object-cover"
                      height={900}
                      priority
                      src={captureDraft.previewUrl}
                      unoptimized
                      width={1600}
                    />
                    <div className="meter-region" />
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    OCR uses the highlighted region from the captured photo.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="field-label" htmlFor="owner-name">
                      Owner name
                    </label>
                    <input
                      className="field-input"
                      id="owner-name"
                      onChange={(event) =>
                        updateCaptureDraft({ ownerName: event.target.value })
                      }
                      placeholder="Enter meter owner name"
                      value={captureDraft.ownerName}
                    />
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
                        updateCaptureDraft({ readingInput: event.target.value })
                      }
                      placeholder="Detected reading"
                      value={captureDraft.readingInput}
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="ocr-text">
                      Detected text
                    </label>
                    <textarea
                      className="field-input min-h-32 resize-y"
                      id="ocr-text"
                      onChange={(event) =>
                        updateCaptureDraft({ ocrText: event.target.value })
                      }
                      value={captureDraft.ocrText}
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
          </div>
        ) : null}
      </div>
    </main>
  );
}

async function cropSelectedRegion(file: File) {
  const image = await loadImage(file);

  try {
    const canvas = document.createElement('canvas');
    const width = Math.max(1, Math.floor(image.naturalWidth * OCR_REGION.width));
    const height = Math.max(1, Math.floor(image.naturalHeight * OCR_REGION.height));
    const startX = Math.floor(image.naturalWidth * OCR_REGION.x);
    const startY = Math.floor(image.naturalHeight * OCR_REGION.y);

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not create canvas context.');
    }

    context.drawImage(
      image,
      startX,
      startY,
      width,
      height,
      0,
      0,
      width,
      height,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) {
          resolve(value);
          return;
        }

        reject(new Error('Could not create OCR blob.'));
      }, file.type || 'image/jpeg');
    });

    return blob;
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load the captured image.'));
    };
    image.src = objectUrl;
  });
}
