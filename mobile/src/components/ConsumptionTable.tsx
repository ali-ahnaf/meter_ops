import { StyleSheet, Text, View } from 'react-native';
import { ms } from 'react-native-size-matters';
import { formatCost, formatReadingWithUnit, TRANSFORMER_LOSS_RATE, type ConsumptionRow } from '@lib/consumption';
import { color, font } from '@/theme';
import { Pill } from './Pill';

type ConsumptionTableProps = {
  rows: ConsumptionRow[];
  /** Also show the old and new meter readings under each owner. */
  showReadings?: boolean;
};

export function ConsumptionTable({ rows, showReadings = false }: ConsumptionTableProps) {
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

  return (
    <View style={s.table}>
      {rows.map((row) => (
        <View key={row.ownerName} style={[s.row, row.isMotherMeter && s.motherRow]}>
          <View style={s.rowHead}>
            <View style={s.owner}>
              <Text selectable style={s.ownerName}>{row.ownerName}</Text>
              {row.isMotherMeter ? <Pill label="Mother" tone="mother" /> : null}
            </View>
            <Text selectable style={s.cost}>{formatCost(row.cost)}</Text>
          </View>
          <Text selectable style={s.detail}>
            {formatReadingWithUnit(row.consumption)}
            {row.isMotherMeter && row.rawConsumption !== undefined
              ? ` (raw: ${formatReadingWithUnit(row.rawConsumption)}) (+${TRANSFORMER_LOSS_RATE * 100}% loss)`
              : ''}
          </Text>
          {showReadings ? (
            <Text selectable style={s.detail}>
              {formatReadingWithUnit(row.oldReading.reading)}
              {row.isMotherMeter ? ` (${(row.oldReading.reading / 40).toFixed(2)}) units` : ''}
              {'  →  '}
              {formatReadingWithUnit(row.newReading.reading)}
              {row.isMotherMeter ? ` (${(row.newReading.reading / 40).toFixed(2)}) units` : ''}
            </Text>
          ) : null}
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Total</Text>
        <Text selectable style={s.totalCost}>{formatCost(totalCost)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  table: { borderWidth: 1, borderColor: color.border, borderRadius: ms(18), overflow: 'hidden' },
  row: { padding: ms(14), gap: ms(4), borderBottomWidth: 1, borderBottomColor: color.border, backgroundColor: color.surface },
  motherRow: { backgroundColor: color.motherSoft },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  owner: { flexDirection: 'row', alignItems: 'center', gap: ms(8) },
  ownerName: { fontFamily: font.semibold, fontSize: ms(15), color: color.heading },
  cost: { fontFamily: font.semibold, fontSize: ms(15), color: color.heading },
  detail: { fontFamily: font.regular, fontSize: ms(12), color: color.muted },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: ms(14), backgroundColor: color.surfaceMuted },
  totalLabel: { fontFamily: font.semibold, fontSize: ms(15), color: color.heading },
  totalCost: { fontFamily: font.bold, fontSize: ms(15), color: color.heading },
});
