export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[rgba(2,6,23,0.7)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs uppercase tracking-[0.24em] text-slate-400 sm:px-6 lg:px-10 md:flex-row md:items-center md:justify-between">
        <p>Local OCR sessions. No cloud theatrics.</p>
        <p>Next.js + browser storage + neon paranoia</p>
      </div>
    </footer>
  );
}
