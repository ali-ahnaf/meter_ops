import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { ms } from 'react-native-size-matters';
import type { MeterSession } from '@lib/meter-ops';
import { chartColors, color, font } from '@/theme';
import { Card } from './Card';
import { useChartWidth } from './chartLayout';
import { SectionHeader } from './SectionHeader';

type MeterReadingsChartProps = { sessions: MeterSession[] };

const normalizeOwner = (name: string) => name.trim().toLocaleLowerCase();
const shortDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

function MeterReadingsChartBase({ sessions }: MeterReadingsChartProps) {
  const chartWidth = useChartWidth();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const { meters, labels } = useMemo(() => {
    const displayNames = new Map<string, string>();
    for (const session of sessions) {
      for (const reading of session.readings) {
        const key = normalizeOwner(reading.ownerName);
        if (!displayNames.has(key)) displayNames.set(key, reading.ownerName);
      }
    }

    const ascending = [...sessions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const names = [...displayNames.entries()]
      .map(([key, display]) => ({ key, display }))
      .sort((a, b) => a.display.localeCompare(b.display));

    const series = names.map(({ key, display }, index) => {
      const values = ascending.map((session) => session.readings.find((r) => normalizeOwner(r.ownerName) === key)?.reading ?? null);
      // The chart can't skip a point, so a missing reading repeats the nearest known one.
      const firstKnown = values.find((v) => v !== null) ?? 0;
      let last = firstKnown;
      const filled = values.map((v) => {
        last = v ?? last;
        return last;
      });
      return { key, display, color: chartColors[index % chartColors.length], values: filled };
    });

    return { meters: series, labels: ascending.map((s) => shortDate(s.createdAt)) };
  }, [sessions]);

  const dataSet = useMemo(
    () =>
      meters
        .filter((meter) => !hidden.has(meter.key))
        .map((meter) => ({
          data: meter.values.map((value, i) => ({ value, label: labels[i] })),
          color: meter.color,
          dataPointsColor: meter.color,
          thickness: 2,
          dataPointsRadius: 3,
        })),
    [meters, labels, hidden],
  );

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (sessions.length < 2) {
    return null;
  }

  const spacing = Math.max(ms(48), chartWidth / Math.max(1, labels.length - 1));

  return (
    <Card>
      <SectionHeader eyebrow="Trends" title="Readings over time" />
      <View style={s.toggles}>
        {meters.map((meter) => {
          const isHidden = hidden.has(meter.key);
          return (
            <Pressable
              key={meter.key}
              accessibilityRole="button"
              accessibilityState={{ selected: !isHidden }}
              hitSlop={4}
              onPress={() => toggle(meter.key)}
              style={[s.toggle, isHidden && s.toggleHidden]}
            >
              <View style={[s.dot, { backgroundColor: isHidden ? color.borderStrong : meter.color }]} />
              <Text style={[s.toggleText, isHidden && s.toggleTextHidden]}>{meter.display}</Text>
            </Pressable>
          );
        })}
      </View>
      {dataSet.length > 0 ? (
        <LineChart
          dataSet={dataSet}
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
      ) : (
        <Text style={s.hint}>Select a meter to show its line.</Text>
      )}
    </Card>
  );
}

export const MeterReadingsChart = memo(MeterReadingsChartBase);

const s = StyleSheet.create({
  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(8) },
  toggle: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: ms(8), paddingHorizontal: ms(12), borderRadius: 999, borderWidth: 1, borderColor: 'transparent', backgroundColor: color.chip },
  toggleHidden: { backgroundColor: color.surface, borderColor: color.border },
  dot: { width: ms(10), height: ms(10), borderRadius: 999 },
  toggleText: { fontFamily: font.medium, fontSize: ms(13), color: color.body },
  toggleTextHidden: { color: color.faint },
  axis: { fontFamily: font.regular, fontSize: ms(10), color: color.muted },
  hint: { fontFamily: font.regular, fontSize: ms(13), color: color.muted },
});
