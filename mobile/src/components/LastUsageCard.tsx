import { StyleSheet, Text, View } from 'react-native';
import { ms } from 'react-native-size-matters';
import type { LastUsage } from '@lib/meter-ops';
import { formatWaterDate } from '@lib/water-ops';
import { formatCost } from '@lib/consumption';
import { color, font } from '@/theme';
import { Card } from './Card';
import { Pill } from './Pill';
import { SectionHeader } from './SectionHeader';

type LastUsageCardProps = { usage: LastUsage | null };

export function LastUsageCard({ usage }: LastUsageCardProps) {
  if (!usage) {
    return null;
  }

  return (
    <Card>
      <SectionHeader eyebrow="Latest" title="Last session usage" description="Amount from your most recent calculation." />
      {usage.fromDate && usage.toDate ? (
        <View style={s.dates}>
          <Pill label={formatWaterDate(usage.fromDate)} />
          <Text style={s.arrow}>→</Text>
          <Pill label={formatWaterDate(usage.toDate)} />
        </View>
      ) : null}
      <View style={s.amountBox}>
        <Text selectable style={s.amount}>৳{formatCost(usage.amount)}</Text>
        {usage.detail ? <Text style={s.detail}>{usage.detail}</Text> : null}
        <Text style={s.calculated}>Calculated {formatWaterDate(usage.calculatedAt)}</Text>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  dates: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: ms(8) },
  arrow: { color: color.faint },
  amountBox: { gap: ms(4), borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted, borderRadius: ms(18), padding: ms(16) },
  amount: { fontFamily: font.bold, fontSize: ms(28), color: color.heading },
  detail: { fontFamily: font.regular, fontSize: ms(12), color: color.muted },
  calculated: { fontFamily: font.regular, fontSize: ms(11), color: color.faint },
});
