export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-10 md:flex-row md:items-center md:justify-between">
        <p>Built for reuse.</p>
        <p>Next.js + TypeORM + SQLite</p>
      </div>
    </footer>
  );
}
