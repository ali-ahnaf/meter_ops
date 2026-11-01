import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { buildConsumptionComparison } from '@lib/consumption';
import { formatSessionDate, type MeterSession } from '@lib/meter-ops';
import { Button } from './Button';
import { Card } from './Card';
import { ConsumptionTable } from './ConsumptionTable';
import { EmptyState } from './EmptyState';
import { Pill } from './Pill';
import { SectionHeader } from './SectionHeader';
import { ms } from 'react-native-size-matters';

type RecentConsumptionCardProps = { sessions: MeterSession[] };

export function RecentConsumptionCard({ sessions }: RecentConsumptionCardProps) {
  const router = useRouter();
  // sessions arrive sorted newest-first, so the two most recent are [0] and [1].
  const newerSession = sessions[0];
  const olderSession = sessions[1];

  const comparison = useMemo(() => {
    if (!newerSession || !olderSession) {
      return null;
    }
    return buildConsumptionComparison(olderSession, newerSession);
  }, [newerSession, olderSession]);

  if (!comparison) {
    return null;
  }

  return (
    <Card>
      <SectionHeader eyebrow="Latest" title="Recent consumption" description="Calculated from the two most recent sessions." />
      <View style={s.dates}>
        <Pill label={formatSessionDate(comparison.olderSession.createdAt)} />
        <Pill label={formatSessionDate(comparison.newerSession.createdAt)} />
      </View>
      {comparison.rows.length === 0 ? (
        <EmptyState icon="calculator-outline" title="No comparable meter owners" message="The two most recent sessions do not share any owner names, so there is nothing to subtract." />
      ) : (
        <>
          <ConsumptionTable rows={comparison.rows} />
          <Button
            icon="calculator-outline"
            label="View full report"
            onPress={() =>
              router.push({
                pathname: '/consumption',
                params: { first: comparison.olderSession.id, second: comparison.newerSession.id },
              })
            }
            variant="secondary"
          />
        </>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(8) },
});
