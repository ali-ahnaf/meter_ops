'use client';

import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Calculator, Camera, Check, LoaderCircle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MeterReadingsChart from '@/components/meter-readings-chart';
import {
  OCR_REGION,
  STORAGE_KEY,
  cleanOcrText,
  extractReadingCandidate,
  formatSessionDate,
  sanitizeReadingInput,
  sortSessions,
  type MeterReading,
  type MeterSession,
  type OcrRegion,
} from '@/lib/meter-ops';

type CaptureDraft = {
  file: File;
  fileName: string;
  lastProcessedRegion: OcrRegion | null;
  lastSuggestedReading: string;
  ownerName: string;
  ocrText: string;
  previewUrl: string;
  region: OcrRegion;
  readingInput: string;
  isMotherMeter: boolean;
};

type ResizeHandle = 'ne' | 'nw' | 'se' | 'sw';

type RegionInteraction = {
  mode: 'move' | 'resize';
  pointerId: number;
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  startRegion: OcrRegion;
};

const MIN_OCR_REGION_WIDTH = 0.18;
const MIN_OCR_REGION_HEIGHT = 0.12;

const CAMERA_GUIDE_LEFT = 0.06;
const CAMERA_GUIDE_TOP = 0.36;
const CAMERA_GUIDE_WIDTH = 0.88;
const CAMERA_GUIDE_HEIGHT = 0.28;
const CAMERA_OCR_REGION: OcrRegion = { x: 0.02, y: 0.10, width: 0.96, height: 0.80 };

export default function SessionManager() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const ocrRequestIdRef = useRef(0);
  const [sessions, setSessions] = useState<MeterSession[]>([]);
  const [draftReadings, setDraftReadings] = useState<MeterReading[]>([]);
  const [captureDraft, setCaptureDraft] = useState<CaptureDraft | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [regionInteraction, setRegionInteraction] = useState<RegionInteraction | null>(null);
  const [isCalculationModalOpen, setIsCalculationModalOpen] = useState(false);
  const [selectedCalculationSessionIds, setSelectedCalculationSessionIds] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

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
    const previewUrl = captureDraft?.previewUrl;

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [captureDraft?.previewUrl]);

  useEffect(() => {
    if (!regionInteraction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== regionInteraction.pointerId || !previewFrameRef.current) {
        return;
      }

      const bounds = previewFrameRef.current.getBoundingClientRect();

      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }

      const deltaX = (event.clientX - regionInteraction.startClientX) / bounds.width;
      const deltaY = (event.clientY - regionInteraction.startClientY) / bounds.height;

      setCaptureDraft((current) => {
        if (!current) {
          return current;
        }

        const nextRegion =
          regionInteraction.mode === 'move'
            ? moveRegion(regionInteraction.startRegion, deltaX, deltaY)
            : resizeRegion(
                regionInteraction.startRegion,
                regionInteraction.handle ?? 'se',
                deltaX,
                deltaY,
              );

        return { ...current, region: nextRegion };
      });
    };

    const stopInteraction = (event: PointerEvent) => {
      if (event.pointerId === regionInteraction.pointerId) {
        setRegionInteraction(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopInteraction);
    window.addEventListener('pointercancel', stopInteraction);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopInteraction);
      window.removeEventListener('pointercancel', stopInteraction);
    };
  }, [regionInteraction]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const requestCapture = async () => {
    setErrorMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      fileInputRef.current?.click();
    }
  };

  const closeCameraView = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const displayW = video.clientWidth;
    const displayH = video.clientHeight;
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;

    const scale = Math.max(displayW / videoW, displayH / videoH);
    const scaledW = videoW * scale;
    const scaledH = videoH * scale;
    const offsetX = (displayW - scaledW) / 2;
    const offsetY = (displayH - scaledH) / 2;

    const guideLeft = displayW * CAMERA_GUIDE_LEFT;
    const guideTop = displayH * CAMERA_GUIDE_TOP;
    const guideW = displayW * CAMERA_GUIDE_WIDTH;
    const guideH = displayH * CAMERA_GUIDE_HEIGHT;

    const srcX = (guideLeft - offsetX) / scale;
    const srcY = (guideTop - offsetY) / scale;
    const srcW = guideW / scale;
    const srcH = guideH / scale;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(srcW));
    canvas.height = Math.max(1, Math.round(srcH));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `meter_${Date.now()}.jpg`, { type: 'image/jpeg' });
        closeCameraView();
        void handleCapturedFile(file, CAMERA_OCR_REGION);
      },
      'image/jpeg',
      0.92,
    );
  };

  const openCalculationModal = () => {
    setSelectedCalculationSessionIds([]);
    setIsCalculationModalOpen(true);
  };

  const closeCalculationModal = () => {
    setIsCalculationModalOpen(false);
    setSelectedCalculationSessionIds([]);
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

  const runOcrForDraft = async (file: File, region: OcrRegion) => {
    const requestId = ++ocrRequestIdRef.current;
    setErrorMessage('');
    setIsRecognizing(true);
    setOcrProgress(6);

    try {
      const ocrTargets = await prepareOcrTargets(file, region);
      const { createWorker, PSM } = await import('tesseract.js');
      const worker = await createWorker('eng', undefined, {
        logger: (message) => {
          if (requestId !== ocrRequestIdRef.current) {
            return;
          }

          if (message.status === 'recognizing text' && typeof message.progress === 'number') {
            const progressPerTarget = 94 / ocrTargets.length;
            const activeTargetIndex = Math.min(activeOcrTargetIndex, ocrTargets.length - 1);
            const nextProgress =
              6 + activeTargetIndex * progressPerTarget + message.progress * progressPerTarget;

            setOcrProgress(Math.min(100, Math.round(nextProgress)));
          }
        },
      });
      let activeOcrTargetIndex = 0;
      let result;

      try {
        await worker.setParameters({
          preserve_interword_spaces: '0',
          tessedit_char_whitelist: '0123456789.:',
          tessedit_pageseg_mode: PSM.SINGLE_WORD,
        });

        const attempts = [];

        for (const [index, ocrTarget] of ocrTargets.entries()) {
          activeOcrTargetIndex = index;

          const attemptResult = await worker.recognize(ocrTarget.image);
          const ocrText = cleanOcrText(attemptResult.data.text);
          const extractedReading = extractReadingCandidate(ocrText);

          attempts.push({
            extractedReading,
            ocrText,
            priority: ocrTarget.priority,
          });
        }

        result = attempts.sort((left, right) => {
          const leftScore = (left.extractedReading?.score ?? 0) + left.priority;
          const rightScore = (right.extractedReading?.score ?? 0) + right.priority;

          if (rightScore === leftScore) {
            return right.ocrText.length - left.ocrText.length;
          }

          return rightScore - leftScore;
        })[0];
      } finally {
        await worker.terminate();
      }

      if (requestId !== ocrRequestIdRef.current) {
        return;
      }

      const ocrText = result?.ocrText ?? '';
      const suggestedReading = result?.extractedReading?.normalizedText ?? '';

      setCaptureDraft((current) => {
        if (!current || current.file !== file) {
          return current;
        }

        const shouldReplaceReading =
          !current.readingInput.trim() || current.readingInput === current.lastSuggestedReading;

        return {
          ...current,
          ocrText,
          readingInput: shouldReplaceReading ? suggestedReading : current.readingInput,
          lastProcessedRegion: cloneRegion(region),
          lastSuggestedReading: suggestedReading,
        };
      });
    } catch (error) {
      if (requestId !== ocrRequestIdRef.current) {
        return;
      }

      console.error('OCR failed:', error);
      setCaptureDraft((current) => {
        if (!current || current.file !== file) {
          return current;
        }

        const shouldClearReading =
          current.readingInput === current.lastSuggestedReading || !current.readingInput.trim();

        return {
          ...current,
          ocrText: '',
          readingInput: shouldClearReading ? '' : current.readingInput,
          lastProcessedRegion: cloneRegion(region),
          lastSuggestedReading: '',
        };
      });
      setErrorMessage('OCR missed the reading. Very ambitious of it. Enter the value manually.');
    } finally {
      if (requestId === ocrRequestIdRef.current) {
        setIsRecognizing(false);
        setOcrProgress(100);
      }
    }
  };

  const handleCapturedFile = async (file: File, initialRegion?: OcrRegion) => {
    const previewUrl = URL.createObjectURL(file);
    const region = cloneRegion(initialRegion ?? OCR_REGION);
    setErrorMessage('');
    setCaptureDraft({
      file,
      fileName: file.name,
      lastProcessedRegion: null,
      lastSuggestedReading: '',
      ownerName: '',
      ocrText: '',
      previewUrl,
      region,
      readingInput: '',
      isMotherMeter: false,
    });
    await runOcrForDraft(file, region);
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    event.target.value = '';
    await handleCapturedFile(file);
  };

  const updateCaptureDraft = (changes: Partial<CaptureDraft>) => {
    setCaptureDraft((current) => (current ? { ...current, ...changes } : current));
  };

  const closeCaptureDraft = () => {
    ocrRequestIdRef.current += 1;
    setRegionInteraction(null);
    setIsRecognizing(false);
    setCaptureDraft(null);
    setErrorMessage('');
    setOcrProgress(0);
  };

  const beginMoveRegion = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!captureDraft) {
      return;
    }

    event.preventDefault();
    setRegionInteraction({
      mode: 'move',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRegion: cloneRegion(captureDraft.region),
    });
  };

  const beginResizeRegion =
    (handle: ResizeHandle) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!captureDraft) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setRegionInteraction({
        mode: 'resize',
        pointerId: event.pointerId,
        handle,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startRegion: cloneRegion(captureDraft.region),
      });
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
      ...(captureDraft.isMotherMeter && { isMotherMeter: true }),
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

  const regionNeedsRescan =
    captureDraft &&
    (!captureDraft.lastProcessedRegion ||
      !regionsMatch(captureDraft.region, captureDraft.lastProcessedRegion));

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

        <input
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelection}
          type="file"
        />

        {isRecognizing && !captureDraft ? (
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

        {errorMessage && !captureDraft ? (
          <section className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        {sessions.length >= 2 ? <MeterReadingsChart sessions={sessions} /> : null}

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
                  <div
                    ref={previewFrameRef}
                    className="relative overflow-hidden rounded-[1.4rem] bg-slate-900"
                  >
                    <NextImage
                      alt="Captured meter"
                      className="block h-full max-h-[25rem] w-full object-cover"
                      height={900}
                      priority
                      src={captureDraft.previewUrl}
                      unoptimized
                      width={1600}
                    />
                    <div
                      className="meter-region"
                      onPointerDown={beginMoveRegion}
                      style={regionStyle(captureDraft.region)}
                    >
                      <span className="meter-region__label">OCR region</span>
                      {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
                        <button
                          key={handle}
                          aria-label={`Resize OCR region from the ${handle} corner`}
                          className={`meter-region__handle meter-region__handle--${handle}`}
                          onPointerDown={beginResizeRegion(handle)}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-500">
                      Drag the box or pull a corner to change the OCR area, then rescan it.
                    </p>
                    <Button
                      disabled={isRecognizing}
                      onClick={() => runOcrForDraft(captureDraft.file, captureDraft.region)}
                      type="button"
                      variant="secondary"
                    >
                      {isRecognizing ? 'Scanning...' : 'Rescan OCR'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-5">
                  {isRecognizing ? (
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3 text-slate-700">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Scanning the selected meter region...</span>
                      </div>
                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-700 transition-[width] duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {regionNeedsRescan ? (
                    <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      The box moved, so the detected text below is outdated until you rescan it.
                    </div>
                  ) : null}

                  {errorMessage ? (
                    <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  ) : null}

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

                  <div className="flex items-center gap-3">
                    <input
                      checked={captureDraft.isMotherMeter}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        !captureDraft.isMotherMeter &&
                        draftReadings.some((r) => r.isMotherMeter)
                      }
                      id="is-mother-meter"
                      onChange={(event) =>
                        updateCaptureDraft({ isMotherMeter: event.target.checked })
                      }
                      type="checkbox"
                    />
                    <label
                      className={`cursor-pointer select-none text-sm font-medium text-slate-700 ${
                        !captureDraft.isMotherMeter && draftReadings.some((r) => r.isMotherMeter)
                          ? 'cursor-not-allowed opacity-50'
                          : ''
                      }`}
                      htmlFor="is-mother-meter"
                    >
                      Mother meter
                      {!captureDraft.isMotherMeter && draftReadings.some((r) => r.isMotherMeter) ? (
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
                        updateCaptureDraft({
                          readingInput: sanitizeReadingInput(event.target.value),
                        })
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
                <Button onClick={closeCalculationModal} variant="ghost">
                  <X className="h-4 w-4" />
                  Close
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
      </div>

      {isCameraOpen ? (
        <div className="fixed inset-0 z-[60] bg-black">
          <video
            ref={videoRef}
            autoPlay
            className="h-full w-full object-cover"
            muted
            playsInline
          />

          <div className="pointer-events-none absolute inset-0">
            {/* Shade above guide */}
            <div
              className="absolute inset-x-0 top-0 bg-black/60"
              style={{ height: `${CAMERA_GUIDE_TOP * 100}%` }}
            />
            {/* Shade below guide */}
            <div
              className="absolute inset-x-0 bottom-0 bg-black/60"
              style={{ top: `${(CAMERA_GUIDE_TOP + CAMERA_GUIDE_HEIGHT) * 100}%` }}
            />
            {/* Shade left of guide */}
            <div
              className="absolute bg-black/60"
              style={{
                top: `${CAMERA_GUIDE_TOP * 100}%`,
                left: 0,
                width: `${CAMERA_GUIDE_LEFT * 100}%`,
                height: `${CAMERA_GUIDE_HEIGHT * 100}%`,
              }}
            />
            {/* Shade right of guide */}
            <div
              className="absolute bg-black/60"
              style={{
                top: `${CAMERA_GUIDE_TOP * 100}%`,
                left: `${(CAMERA_GUIDE_LEFT + CAMERA_GUIDE_WIDTH) * 100}%`,
                right: 0,
                height: `${CAMERA_GUIDE_HEIGHT * 100}%`,
              }}
            />
            {/* Guide border */}
            <div
              className="absolute rounded-lg border-2 border-white/80"
              style={{
                top: `${CAMERA_GUIDE_TOP * 100}%`,
                left: `${CAMERA_GUIDE_LEFT * 100}%`,
                width: `${CAMERA_GUIDE_WIDTH * 100}%`,
                height: `${CAMERA_GUIDE_HEIGHT * 100}%`,
              }}
            />
            {/* Label above guide */}
            <p
              className="absolute text-center text-sm font-medium text-white/80"
              style={{
                top: `calc(${CAMERA_GUIDE_TOP * 100}% - 2rem)`,
                left: `${CAMERA_GUIDE_LEFT * 100}%`,
                width: `${CAMERA_GUIDE_WIDTH * 100}%`,
              }}
            >
              Fit the meter display within the frame
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-16 pb-14 pt-8">
            <button
              className="text-sm text-white/70 hover:text-white"
              onClick={closeCameraView}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-16 w-16 rounded-full border-4 border-white/40 bg-white/90 transition-transform active:scale-95"
              onClick={captureFromCamera}
              type="button"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

async function cropSelectedRegion(file: File, region: OcrRegion) {
  const image = await loadImage(file);

  try {
    const canvas = document.createElement('canvas');
    const width = Math.max(1, Math.floor(image.naturalWidth * region.width));
    const height = Math.max(1, Math.floor(image.naturalHeight * region.height));
    const startX = Math.floor(image.naturalWidth * region.x);
    const startY = Math.floor(image.naturalHeight * region.y);

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

    return canvas;
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

async function prepareOcrTargets(file: File, region: OcrRegion) {
  const croppedCanvas = await cropSelectedRegion(file, region);
  const enhancedCanvas = enhanceOcrCanvas(croppedCanvas);

  return [
    {
      image: await canvasToBlob(enhancedCanvas, 'image/png'),
      priority: 20,
    },
    {
      image: await canvasToBlob(croppedCanvas, file.type || 'image/jpeg'),
      priority: 0,
    },
  ];
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

async function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) {
        resolve(value);
        return;
      }

      reject(new Error('Could not create OCR blob.'));
    }, type);
  });
}

function cloneRegion(region: OcrRegion): OcrRegion {
  return {
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
  };
}

function regionStyle(region: OcrRegion) {
  return {
    left: `${region.x * 100}%`,
    top: `${region.y * 100}%`,
    width: `${region.width * 100}%`,
    height: `${region.height * 100}%`,
  };
}

function regionsMatch(left: OcrRegion, right: OcrRegion) {
  return (
    Math.abs(left.x - right.x) < 0.001 &&
    Math.abs(left.y - right.y) < 0.001 &&
    Math.abs(left.width - right.width) < 0.001 &&
    Math.abs(left.height - right.height) < 0.001
  );
}

function moveRegion(region: OcrRegion, deltaX: number, deltaY: number): OcrRegion {
  return {
    ...region,
    x: clamp(region.x + deltaX, 0, 1 - region.width),
    y: clamp(region.y + deltaY, 0, 1 - region.height),
  };
}

function resizeRegion(
  region: OcrRegion,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
): OcrRegion {
  const right = region.x + region.width;
  const bottom = region.y + region.height;

  switch (handle) {
    case 'nw': {
      const nextX = clamp(region.x + deltaX, 0, right - MIN_OCR_REGION_WIDTH);
      const nextY = clamp(region.y + deltaY, 0, bottom - MIN_OCR_REGION_HEIGHT);

      return {
        x: nextX,
        y: nextY,
        width: right - nextX,
        height: bottom - nextY,
      };
    }
    case 'ne': {
      const nextRight = clamp(right + deltaX, region.x + MIN_OCR_REGION_WIDTH, 1);
      const nextY = clamp(region.y + deltaY, 0, bottom - MIN_OCR_REGION_HEIGHT);

      return {
        x: region.x,
        y: nextY,
        width: nextRight - region.x,
        height: bottom - nextY,
      };
    }
    case 'sw': {
      const nextX = clamp(region.x + deltaX, 0, right - MIN_OCR_REGION_WIDTH);
      const nextBottom = clamp(bottom + deltaY, region.y + MIN_OCR_REGION_HEIGHT, 1);

      return {
        x: nextX,
        y: region.y,
        width: right - nextX,
        height: nextBottom - region.y,
      };
    }
    case 'se': {
      const nextRight = clamp(right + deltaX, region.x + MIN_OCR_REGION_WIDTH, 1);
      const nextBottom = clamp(bottom + deltaY, region.y + MIN_OCR_REGION_HEIGHT, 1);

      return {
        x: region.x,
        y: region.y,
        width: nextRight - region.x,
        height: nextBottom - region.y,
      };
    }
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function enhanceOcrCanvas(sourceCanvas: HTMLCanvasElement) {
  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, sourceCanvas.width * scale);
  canvas.height = Math.max(1, sourceCanvas.height * scale);

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create OCR enhancement context.');
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  let luminanceTotal = 0;

  for (let index = 0; index < data.length; index += 4) {
    const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    luminanceTotal += luminance;
  }

  const averageLuminance = luminanceTotal / (data.length / 4 || 1);
  const threshold = Math.max(110, Math.min(210, averageLuminance + 35));

  for (let index = 0; index < data.length; index += 4) {
    const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    const contrasted = clamp(Math.round((luminance - averageLuminance) * 2.8 + 128), 0, 255);
    const value = contrasted >= threshold ? 255 : 0;

    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}
