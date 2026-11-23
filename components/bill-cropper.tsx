'use client';

import { useState } from 'react';
import { Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function BillCropper() {
  const [images, setImages] = useState<string[]>([]);
  const [perPage, setPerPage] = useState(6);
  const [cols, setCols] = useState(3);
  const [gap, setGap] = useState(8);
  const [margin, setMargin] = useState(24);
  const [inputKey, setInputKey] = useState(0);

  const addFiles = (files: FileList | null) => {
    const urls = [...(files ?? [])]
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...urls]);
  };

  const clear = () => {
    images.forEach((url) => URL.revokeObjectURL(url));
    setImages([]);
    setInputKey((k) => k + 1);
  };

  const n = clamp(perPage || 1, 1, 64);
  const c = clamp(cols >= 1 ? cols : Math.ceil(Math.sqrt(n)), 1, 12);
  const rows = Math.ceil(n / c);
  const pages = Array.from({ length: Math.ceil(images.length / n) }, (_, p) =>
    images.slice(p * n, (p + 1) * n),
  );

  const numberField = (label: string, value: number, set: (v: number) => void, max: number, min = 0) => (
    <div>
      <label className="field-label">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(+e.target.value)}
        className="field-input w-28!"
      />
    </div>
  );

  return (
    <main className="app-shell print:p-0!">
      <div className="page-wrap space-y-6 print:max-w-none!">
        <section className="surface-card rounded-[2rem] p-6 sm:p-8 print:hidden">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Bills</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Fit images on A4</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Upload bill images. They are laid out on A4 pages with aspect ratio preserved.
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div>
              <label className="field-label">Upload images</label>
              <input
                key={inputKey}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                className="text-sm"
              />
            </div>
            {numberField('Images / page', perPage, setPerPage, 64, 1)}
            {numberField('Columns (0 = auto)', cols, setCols, 12)}
            {numberField('Gap (px)', gap, setGap, 60)}
            {numberField('Margin (px)', margin, setMargin, 80)}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button disabled={!images.length} onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button variant="secondary" disabled={!images.length} onClick={clear}>
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
            <span className="text-sm text-slate-500">
              {images.length ? `${images.length} image${images.length > 1 ? 's' : ''}` : 'No images'}
            </span>
          </div>
        </section>

        <div className="flex flex-col items-center gap-6 overflow-x-auto print:block print:overflow-visible">
          {pages.map((slice, p) => (
            <div
              key={p}
              className="a4-page grid shrink-0 bg-white shadow"
              style={{
                padding: margin,
                gap,
                gridTemplateColumns: `repeat(${c}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
              }}
            >
              {slice.map((src) => (
                <div key={src} className="flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="block max-h-full max-w-full object-contain" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
