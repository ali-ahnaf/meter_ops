import {
  MeterSession,
  buildImmediateConsumptionSeries,
  getUniqueFlats,
} from '@/lib/meter-ops';

const palette = ['#22d3ee', '#f472b6', '#a3e635', '#f59e0b', '#818cf8'];

type ConsumptionGraphProps = {
  sessions: MeterSession[];
};

export default function ConsumptionGraph({ sessions }: ConsumptionGraphProps) {
  const points = buildImmediateConsumptionSeries(sessions);
  const flats = getUniqueFlats(sessions);
  const width = 760;
  const height = 280;
  const paddingX = 56;
  const paddingY = 28;
  const xSpan = Math.max(points.length - 1, 1);
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) =>
      flats.map((flat) => point.totalsByFlat[flat] ?? 0),
    ),
  );

  if (!points.length) {
    return (
      <div className="tech-panel rounded-3xl p-6">
        <p className="text-sm text-slate-400">Not enough sessions to chart consumption yet.</p>
      </div>
    );
  }

  return (
    <div className="tech-panel rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-cyan-300/80">
            Immediate consumption deltas
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-50">
            Meter drift across consecutive sessions
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {flats.map((flat, index) => (
            <span
              key={flat}
              className="rounded-full border border-[rgba(148,163,184,0.16)] px-3 py-1 text-[0.65rem] uppercase tracking-[0.24em] text-slate-300"
            >
              <span
                className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: palette[index % palette.length] }}
              />
              Flat {flat}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg
          className="min-w-[680px]"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Consumption graph between consecutive sessions"
        >
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = paddingY + ((height - paddingY * 2) / 4) * tick;

            return (
              <g key={tick}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(148,163,184,0.14)"
                  strokeDasharray="4 8"
                />
                <text
                  x={14}
                  y={y + 5}
                  fill="rgba(148,163,184,0.82)"
                  fontSize="11"
                  letterSpacing="0.16em"
                >
                  {Math.round(maxValue - (maxValue / 4) * tick)}
                </text>
              </g>
            );
          })}

          {flats.map((flat, index) => {
            const color = palette[index % palette.length];
            const path = points
              .map((point, pointIndex) => {
                const value = point.totalsByFlat[flat] ?? 0;
                const x =
                  paddingX +
                  ((width - paddingX * 2) / xSpan) * pointIndex;
                const y =
                  height -
                  paddingY -
                  ((height - paddingY * 2) * value) / maxValue;

                return `${pointIndex === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ');

            return (
              <g key={flat}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {points.map((point, pointIndex) => {
                  const value = point.totalsByFlat[flat] ?? 0;
                  const x =
                    paddingX +
                    ((width - paddingX * 2) / xSpan) * pointIndex;
                  const y =
                    height -
                    paddingY -
                    ((height - paddingY * 2) * value) / maxValue;

                  return (
                    <circle
                      key={`${flat}-${point.id}`}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={color}
                      stroke="#020817"
                      strokeWidth="2"
                    />
                  );
                })}
              </g>
            );
          })}

          {points.map((point, index) => {
            const x =
              paddingX + ((width - paddingX * 2) / xSpan) * index;

            return (
              <text
                key={point.id}
                x={x}
                y={height - 6}
                textAnchor="middle"
                fill="rgba(203,213,225,0.88)"
                fontSize="11"
                letterSpacing="0.12em"
              >
                {point.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
