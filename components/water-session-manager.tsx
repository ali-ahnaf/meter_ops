"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Droplets, FileText, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateWaterBill, describeWaterBill, estimateMonthlyWaterBill, formatUnits, formatWaterDate, sortWaterSessions, WATER_RATE, type WaterSession } from "@/lib/water-ops";
import { sanitizeReadingInput, type LastUsage } from "@/lib/meter-ops";
import { getWaterLastUsageAction, getWaterSessionsAction, saveWaterLastUsageAction, saveWaterSessionsAction } from "@/app/actions";
import WaterReadingsChart from "@/components/water-readings-chart";
import LastUsageCard from "@/components/last-usage-card";

type WaterDraft = {
  date: string;
  amountInput: string;
};

export default function WaterSessionManager() {
  const [sessions, setSessions] = useState<WaterSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<WaterDraft>({ date: "", amountInput: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [lastUsage, setLastUsage] = useState<LastUsage | null>(null);

  useEffect(() => {
    getWaterLastUsageAction()
      .then((usage) => setLastUsage(usage ?? null))
      .catch((error) => console.error("Failed to read water last usage:", error));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const parsed = await getWaterSessionsAction();
        setSessions(sortWaterSessions(Array.isArray(parsed) ? parsed : []));
      } catch (error) {
        console.error("Failed to read water sessions:", error);
        setSessions([]);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    saveWaterSessionsAction(sessions);
  }, [isLoaded, sessions]);

  const openModal = () => {
    setErrorMessage("");
    setDraft({ date: new Date().toISOString().slice(0, 10), amountInput: "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setErrorMessage("");
  };

  const createSession = () => {
    if (!draft.date) {
      setErrorMessage("Date is required.");
      return;
    }

    const amount = Number(draft.amountInput.trim());
    if (!Number.isFinite(amount) || draft.amountInput.trim() === "") {
      setErrorMessage("Enter a valid amount in units.");
      return;
    }

    const newSession: WaterSession = {
      id: crypto.randomUUID(),
      createdAt: new Date(`${draft.date}T12:00:00`).toISOString(),
      amount,
    };

    setSessions((current) => sortWaterSessions([newSession, ...current]));
    closeModal();
  };

  const deleteSession = (sessionId: string) => {
    if (!window.confirm("Delete this session? This cannot be undone.")) {
      return;
    }
    setSessions((current) => current.filter((s) => s.id !== sessionId));
  };

  const openCalc = () => {
    setFirstId("");
    setSecondId("");
    setIsCalcOpen(true);
  };

  const closeCalc = () => setIsCalcOpen(false);

  const calcResult = useMemo(() => {
    const first = sessions.find((s) => s.id === firstId);
    const second = sessions.find((s) => s.id === secondId);
    if (!first || !second || first.id === second.id) {
      return null;
    }
    return calculateWaterBill(first, second);
  }, [sessions, firstId, secondId]);

  useEffect(() => {
    if (!calcResult) {
      return;
    }

    const usage: LastUsage = {
      amount: calcResult.total,
      calculatedAt: new Date().toISOString(),
      fromDate: calcResult.fromDate,
      toDate: calcResult.toDate,
      detail: describeWaterBill(calcResult),
    };
    setLastUsage(usage);
    saveWaterLastUsageAction(usage);
  }, [calcResult]);

  return (
    <main className="app-shell">
      <div className="page-wrap space-y-6">
        <section className="surface-card rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">WASA</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Water</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">Log water meter sessions. Enter the date and amount in units for each reading.</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">WASA water tariff for Residential Connection - 16.7 tk per m3 (1m3 = 1 unit)</p>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              <Button className="min-w-44" variant="ghost" onClick={openCalc}>
                <Calculator className="h-4 w-4" />
                Calculate
              </Button>
              <Button className="min-w-44" onClick={openModal}>
                <Plus className="h-4 w-4" />
                Create Session
              </Button>
            </div>
          </div>
        </section>

        <LastUsageCard usage={lastUsage} />

        <WaterReadingsChart sessions={sessions} />

        <section className="surface-card rounded-[1.75rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Sessions</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">All saved sessions</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">{sessions.length} total</div>
          </div>

          {!isLoaded ? (
            <p className="mt-6 text-slate-600">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-center text-slate-600">
              <FileText className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-900">No sessions yet</p>
              <p className="mt-2 text-sm">Start one with the button above.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center rounded-[1.5rem] border border-slate-200 bg-white transition-colors hover:border-slate-300 hover:bg-slate-50">
                  <div className="flex-1 px-5 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{formatWaterDate(session.createdAt)}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                          <Droplets className="h-4 w-4" />
                          {formatUnits(session.amount)} units
                        </p>
                      </div>
                    </div>
                  </div>
                  <button className="mr-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => deleteSession(session.id)} title="Delete session" type="button">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {isModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="surface-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-500">New session</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">Create water session</h3>
                </div>
                <Button onClick={closeModal} variant="ghost" className="px-2">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 space-y-5">
                {errorMessage ? <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}

                <div>
                  <label className="field-label" htmlFor="water-date">
                    Date
                  </label>
                  <input className="field-input" id="water-date" type="date" value={draft.date} onChange={(event) => setDraft((d) => ({ ...d, date: event.target.value }))} />
                </div>

                <div>
                  <label className="field-label" htmlFor="water-amount">
                    Amount (units)
                  </label>
                  <input
                    autoFocus
                    className="field-input"
                    id="water-amount"
                    inputMode="decimal"
                    placeholder="Enter amount in units"
                    value={draft.amountInput}
                    onChange={(event) =>
                      setDraft((d) => ({
                        ...d,
                        amountInput: sanitizeReadingInput(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={createSession}>Create Session</Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isCalcOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="surface-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Calculate</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">Bill between sessions</h3>
                </div>
                <Button onClick={closeCalc} variant="ghost" className="px-2">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 space-y-5">
                {sessions.length < 2 ? (
                  <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Need at least two sessions to calculate.</div>
                ) : (
                  <>
                    <div>
                      <label className="field-label" htmlFor="calc-first">
                        First session
                      </label>
                      <select className="field-input" id="calc-first" value={firstId} onChange={(event) => setFirstId(event.target.value)}>
                        <option value="">Select session</option>
                        {sessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {formatWaterDate(session.createdAt)} — {formatUnits(session.amount)} units
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label" htmlFor="calc-second">
                        Second session
                      </label>
                      <select className="field-input" id="calc-second" value={secondId} onChange={(event) => setSecondId(event.target.value)}>
                        <option value="">Select session</option>
                        {sessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {formatWaterDate(session.createdAt)} — {formatUnits(session.amount)} units
                          </option>
                        ))}
                      </select>
                    </div>

                    {calcResult ? (
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5">
                        <p className="text-sm text-slate-500">
                          {formatUnits(calcResult.diff)} units x {WATER_RATE} x 2
                        </p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">৳{formatUnits(calcResult.total)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Subtotal ৳{formatUnits(calcResult.subtotal)} + 15% VAT ৳{formatUnits(calcResult.vat)} = Total ৳{formatUnits(calcResult.total)}
                        </p>
                      </div>
                    ) : null}
                    {calcResult ? (
                      <p className="mt-2 text-xs text-slate-400">
                        Estimated bill for 1 month: ৳
                        {formatUnits(estimateMonthlyWaterBill(calcResult))}
                      </p>
                    ) : firstId && secondId ? (
                      <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Pick two different sessions.</div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
