import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ms } from 'react-native-size-matters';
import { buildConsumptionComparison } from '@lib/consumption';
import { formatSessionDate } from '@lib/meter-ops';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConsumptionTable } from '@/components/ConsumptionTable';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { Pill } from '@/components/Pill';
import { SectionHeader } from '@/components/SectionHeader';
import { useSessions } from '@/hooks';
import { saveLastUsage } from '@/storage';

export default function ConsumptionScreen() {
  const router = useRouter();
  const { first, second } = useLocalSearchParams<{ first?: string; second?: string }>();
  const { sessions, loaded } = useSessions();

  const comparison = useMemo(() => {
    const firstSession = sessions.find((session) => session.id === first);
    const secondSession = sessions.find((session) => session.id === second);
    if (!firstSession || !secondSession) {
      return null;
    }
    return buildConsumptionComparison(firstSession, secondSession);
  }, [first, second, sessions]);

  const amount = comparison ? comparison.rows.reduce((sum, row) => sum + row.cost, 0) : null;
  const hasRows = comparison !== null && comparison.rows.length > 0;
  const fromDate = comparison?.olderSession.createdAt;
  const toDate = comparison?.newerSession.createdAt;

  useEffect(() => {
    if (!hasRows || amount === null) {
      return;
    }
    saveLastUsage({ amount, calculatedAt: new Date().toISOString(), fromDate, toDate });
  }, [hasRows, amount, fromDate, toDate]);

  return (
    <ScrollView contentContainerStyle={s.content} contentInsetAdjustmentBehavior="automatic">
      <Card>
        <SectionHeader
          eyebrow="Consumption"
          title="Session comparison"
          description="Normal meter consumption: newer reading minus older reading. Cost: progressive slab tariff (lifeline 4.63 within 50 units, otherwise stepped 5.26 → 17.25) + 5% VAT. Mother meter net consumption: raw diff minus sum of all normal meter consumptions. Mother meter cost uses the flat 12.5/unit rate + 5% VAT plus an extra 15% transformer loss."
        />
      </Card>

      {!loaded ? null : !first || !second ? (
        <UnavailableCard message="Pick two sessions from the home page before opening the calculation view." onBack={() => router.back()} />
      ) : !comparison ? (
        <UnavailableCard message="One or both selected sessions could not be found on this phone." onBack={() => router.back()} />
      ) : (
        <>
          <Card>
            <View style={s.pills}>
              <Pill label={`Date 1: ${formatSessionDate(comparison.olderSession.createdAt)}`} />
              <Pill label={`Date 2: ${formatSessionDate(comparison.newerSession.createdAt)}`} />
              <Pill label={`${comparison.rows.length} matched meter${comparison.rows.length === 1 ? '' : 's'}`} tone="primary" />
            </View>
            {comparison.missingFromOlder.length > 0 || comparison.missingFromNewer.length > 0 ? (
              <Notice
                tone="warning"
                message={[
                  'Only owners that exist in both sessions are included.',
                  comparison.missingFromOlder.length > 0 ? `Missing from date 1: ${comparison.missingFromOlder.join(', ')}.` : '',
                  comparison.missingFromNewer.length > 0 ? `Missing from date 2: ${comparison.missingFromNewer.join(', ')}.` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ) : null}
          </Card>
          <Card>
            {comparison.rows.length === 0 ? (
              <EmptyState icon="calculator-outline" title="No comparable meter owners" message="The selected sessions do not share any owner names, so there is nothing useful to subtract." />
            ) : (
              <ConsumptionTable rows={comparison.rows} showReadings />
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function UnavailableCard({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <Card>
      <EmptyState icon="calculator-outline" title="Calculation unavailable" message={message} />
      <Button label="Go back" onPress={onBack} />
    </Card>
  );
}

const s = StyleSheet.create({
  content: { padding: ms(16), paddingBottom: ms(40), gap: ms(16) },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(8) },
});
