export type WaterSession = {
  id: string;
  createdAt: string;
  amount: number;
};

export function sortWaterSessions(sessions: WaterSession[]) {
  return [...sessions].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function formatWaterDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

export function formatUnits(amount: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(amount);
}

export const WATER_RATE = 16.7;
export const WATER_BILL_MULTIPLIER = 2;
export const WATER_VAT_RATE = 0.15;

export type WaterBill = {
  /** Absolute difference between the two readings, in units. */
  diff: number;
  /** diff × WATER_RATE × 2, before VAT. */
  subtotal: number;
  vat: number;
  /** On-screen total: diff × WATER_RATE × 2 × 1.15. */
  total: number;
  fromDate: string;
  toDate: string;
};

export function calculateWaterBill(first: WaterSession, second: WaterSession): WaterBill {
  const diff = Math.abs(first.amount - second.amount);
  const subtotal = diff * WATER_RATE * WATER_BILL_MULTIPLIER;
  const vat = subtotal * WATER_VAT_RATE;

  return {
    diff,
    subtotal,
    vat,
    total: subtotal * (1 + WATER_VAT_RATE),
    fromDate: first.createdAt,
    toDate: second.createdAt,
  };
}

/** Estimated bill for 30 days, scaled from the usage between the two dates. */
export function estimateMonthlyWaterBill(bill: WaterBill) {
  const days = Math.max(
    1,
    (new Date(bill.toDate).getTime() - new Date(bill.fromDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  return ((bill.diff * WATER_RATE) / days) * 30 * (1 + WATER_VAT_RATE);
}

/** Line shown under the last-usage amount on the WASA page. */
export function describeWaterBill(bill: WaterBill) {
  return `${formatUnits(bill.diff)} units × ${WATER_RATE} × ${WATER_BILL_MULTIPLIER} + ${WATER_VAT_RATE * 100}% VAT`;
}
