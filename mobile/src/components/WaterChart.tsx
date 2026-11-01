import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { ms } from 'react-native-size-matters';
import type { WaterSession } from '@lib/water-ops';
import { color, font } from '@/theme';
import { Card } from './Card';
import { useChartWidth } from './chartLayout';
import { SectionHeader } from './SectionHeader';

type WaterChartProps = { sessions: WaterSession[] };

function WaterChartBase({ sessions }: WaterChartProps) {
  const chartWidth = useChartWidth();

  const data = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((session) => {
          const date = new Date(session.createdAt);
          return { value: session.amount, label: `${date.getDate()}/${date.getMonth() + 1}` };
        }),
    [sessions],
  );

  if (sessions.length < 2) {
    return null;
  }

  const spacing = Math.max(ms(48), chartWidth / Math.max(1, data.length - 1));

  return (
    <Card>
      <SectionHeader eyebrow="Trends" title="Amount over time" />
      <LineChart
        data={data}
        color={color.water}
        dataPointsColor={color.water}
        thickness={2}
        dataPointsRadius={3}
        height={ms(220)}
        width={chartWidth}
        initialSpacing={ms(12)}
        endSpacing={ms(12)}
        spacing={spacing}
        noOfSections={4}
        rulesColor={color.border}
        yAxisColor="transparent"
        xAxisColor={color.border}
        yAxisTextStyle={s.axis}
        xAxisLabelTextStyle={s.axis}
        yAxisLabelWidth={ms(44)}
        adjustToWidth={false}
      />
    </Card>
  );
}

export const WaterChart = memo(WaterChartBase);

const s = StyleSheet.create({
  axis: { fontFamily: font.regular, fontSize: ms(10), color: color.muted },
});
