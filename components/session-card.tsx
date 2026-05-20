import { MeterSession, formatSessionDate } from '@/lib/meter-ops';

type SessionCardProps = {
  session: MeterSession;
  selected?: boolean;
  selectable?: boolean;
  onClick?: () => void;
};

export default function SessionCard({
  session,
  selected = false,
  selectable = false,
  onClick,
}: SessionCardProps) {
  const content = (
    <>
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-cyan-300/80">
            Session archive
          </p>
          <h3 className="mt-2 text-lg font-bold text-slate-100">
            {formatSessionDate(session.createdAt)}
          </h3>
        </div>
        <span className="rounded-full border border-[rgba(244,114,182,0.38)] px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-pink-200">
          {session.readings.length} meters
        </span>
      </div>

      <div className="relative z-10 grid gap-3 sm:grid-cols-3">
        {session.readings.map((reading) => (
          <div
            key={reading.id}
            className="rounded-xl border border-[rgba(148,163,184,0.14)] bg-[rgba(15,23,42,0.55)] p-3"
          >
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-slate-400">
              Flat {reading.flatNumber}
            </p>
            <p className="mt-2 text-xl font-bold text-cyan-200">{reading.reading}</p>
          </div>
        ))}
      </div>
    </>
  );

  const className = `tech-panel grid-overlay relative flex w-full flex-col gap-4 rounded-2xl p-5 text-left transition-all ${
    selectable
      ? 'cursor-pointer hover:border-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.12)]'
      : ''
  } ${selected ? 'border-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.18)]' : ''}`;

  if (selectable) {
    return (
      <button className={className} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}
