import {
  formatReading,
  formatSessionDate,
  type MeterSession,
} from '@/lib/meter-ops';

type SessionTableProps = {
  session: MeterSession;
};

export default function SessionTable({ session }: SessionTableProps) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
      <table className="session-table">
        <thead>
          <tr>
            <th>Owner</th>
            <th>Reading</th>
            <th>Detected text</th>
            <th>Captured</th>
          </tr>
        </thead>
        <tbody>
          {session.readings.map((reading) => (
            <tr key={reading.id}>
              <td className="font-semibold text-slate-900">{reading.ownerName}</td>
              <td>{formatReading(reading.reading)}</td>
              <td className="max-w-sm whitespace-pre-wrap text-sm text-slate-600">
                {reading.ocrText || 'No text detected'}
              </td>
              <td className="text-sm text-slate-600">{formatSessionDate(reading.capturedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
