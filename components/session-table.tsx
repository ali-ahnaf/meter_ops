'use client';

import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatReading,
  formatSessionDate,
  sanitizeReadingInput,
  type MeterReading,
  type MeterSession,
} from '@/lib/meter-ops';

const OWNER_OPTIONS = ['1A', '1B', '2A', '2B', '3A', '3B', '4', '5', '6', '7', 'MM'];

type RowDraft = {
  ownerName: string;
  readingInput: string;
  isMotherMeter: boolean;
  capturedAt: string;
};

const emptyDraft = (): RowDraft => ({ ownerName: '', readingInput: '', isMotherMeter: false, capturedAt: new Date().toISOString() });

type SessionTableProps = {
  session: MeterSession;
  onUpdateReading?: (readingId: string, changes: { ownerName: string; reading: number; isMotherMeter: boolean; capturedAt: string }) => void;
  onDeleteReading?: (readingId: string) => void;
  onAddReading?: (ownerName: string, reading: number, isMotherMeter: boolean) => void;
};

export default function SessionTable({
  session,
  onUpdateReading,
  onDeleteReading,
  onAddReading,
}: SessionTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<RowDraft>(emptyDraft());
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [addDraft, setAddDraft] = useState<RowDraft>(emptyDraft());

  const isEditable = Boolean(onUpdateReading || onDeleteReading || onAddReading);
  const hasMotherMeter = session.readings.some((r) => r.isMotherMeter);

  const startEdit = (reading: MeterReading) => {
    setEditingId(reading.id);
    setEditDraft({
      ownerName: reading.ownerName,
      readingInput: String(reading.reading),
      isMotherMeter: reading.isMotherMeter ?? false,
      capturedAt: reading.capturedAt,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft());
  };

  const saveEdit = () => {
    if (!editingId || !onUpdateReading) return;
    const readingValue = Number(editDraft.readingInput.trim());
    if (!editDraft.ownerName.trim() || !Number.isFinite(readingValue)) return;
    onUpdateReading(editingId, {
      ownerName: editDraft.ownerName.trim(),
      reading: readingValue,
      isMotherMeter: editDraft.isMotherMeter,
      capturedAt: editDraft.capturedAt,
    });
    cancelEdit();
  };

  const startAdd = () => {
    setIsAddingRow(true);
    setAddDraft(emptyDraft());
  };

  const cancelAdd = () => {
    setIsAddingRow(false);
    setAddDraft(emptyDraft());
  };

  const saveAdd = () => {
    if (!onAddReading) return;
    const readingValue = Number(addDraft.readingInput.trim());
    if (!addDraft.ownerName.trim() || !Number.isFinite(readingValue)) return;
    onAddReading(addDraft.ownerName.trim(), readingValue, addDraft.isMotherMeter);
    cancelAdd();
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
        <table className="session-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Reading</th>
              <th>Captured</th>
              {isEditable ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {session.readings.map((reading) =>
              editingId === reading.id ? (
                <tr key={reading.id}>
                  <td>
                    <div className="flex flex-col gap-1.5">
                      <select
                        className="field-input py-1 text-sm"
                        value={editDraft.ownerName}
                        onChange={(e) => setEditDraft((d) => ({ ...d, ownerName: e.target.value }))}
                      >
                        <option value="">Select</option>
                        {OWNER_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input
                          checked={editDraft.isMotherMeter}
                          className="h-3.5 w-3.5 accent-blue-700"
                          disabled={!editDraft.isMotherMeter && hasMotherMeter}
                          type="checkbox"
                          onChange={(e) => setEditDraft((d) => ({ ...d, isMotherMeter: e.target.checked }))}
                        />
                        Mother meter
                      </label>
                    </div>
                  </td>
                  <td>
                    <input
                      className="field-input py-1 text-sm"
                      inputMode="decimal"
                      value={editDraft.readingInput}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, readingInput: sanitizeReadingInput(e.target.value) }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="field-input py-1 text-sm"
                      type="datetime-local"
                      value={editDraft.capturedAt.slice(0, 16)}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, capturedAt: e.target.value ? new Date(e.target.value).toISOString() : d.capturedAt }))
                      }
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-white hover:bg-blue-800"
                        title="Save"
                        type="button"
                        onClick={saveEdit}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Cancel"
                        type="button"
                        onClick={cancelEdit}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={reading.id}>
                  <td className="font-semibold text-slate-900">
                    {reading.ownerName}
                    {reading.isMotherMeter ? (
                      <span className="ml-1.5 text-xs font-normal text-slate-500">(MM)</span>
                    ) : null}
                  </td>
                  <td>{formatReading(reading.reading)}</td>
                  <td className="text-sm text-slate-600">{formatSessionDate(reading.capturedAt)}</td>
                  {isEditable ? (
                    <td>
                      <div className="flex items-center gap-1.5">
                        {onUpdateReading ? (
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit"
                            type="button"
                            onClick={() => startEdit(reading)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {onDeleteReading ? (
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete entry"
                            type="button"
                            onClick={() => onDeleteReading(reading.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ),
            )}

            {isAddingRow ? (
              <tr>
                <td>
                  <div className="flex flex-col gap-1.5">
                    <select
                      className="field-input py-1 text-sm"
                      value={addDraft.ownerName}
                      onChange={(e) => setAddDraft((d) => ({ ...d, ownerName: e.target.value }))}
                    >
                      <option value="">Select</option>
                      {OWNER_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        checked={addDraft.isMotherMeter}
                        className="h-3.5 w-3.5 accent-blue-700"
                        disabled={hasMotherMeter}
                        type="checkbox"
                        onChange={(e) => setAddDraft((d) => ({ ...d, isMotherMeter: e.target.checked }))}
                      />
                      Mother meter
                    </label>
                  </div>
                </td>
                <td>
                  <input
                    autoFocus
                    className="field-input py-1 text-sm"
                    inputMode="decimal"
                    placeholder="Reading"
                    value={addDraft.readingInput}
                    onChange={(e) =>
                      setAddDraft((d) => ({ ...d, readingInput: sanitizeReadingInput(e.target.value) }))
                    }
                  />
                </td>
                <td className="text-sm text-slate-400">Now</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-white hover:bg-blue-800"
                      title="Add"
                      type="button"
                      onClick={saveAdd}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Cancel"
                      type="button"
                      onClick={cancelAdd}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isEditable && onAddReading && !isAddingRow ? (
        <div className="mt-3 flex justify-end">
          <Button onClick={startAdd} variant="secondary">
            <Plus className="h-4 w-4" />
            Add entry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
