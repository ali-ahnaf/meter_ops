import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ms } from 'react-native-size-matters';
import { sanitizeReadingInput } from '@lib/meter-ops';
import {
  calculateWaterBill,
  describeWaterBill,
  estimateMonthlyWaterBill,
  formatUnits,
  formatWaterDate,
  WATER_RATE,
  type WaterSession,
} from '@lib/water-ops';
import { BottomSheetModal } from '@/components/BottomSheetModal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { LastUsageCard } from '@/components/LastUsageCard';
import { Notice } from '@/components/Notice';
import { Pill } from '@/components/Pill';
import { SectionHeader } from '@/components/SectionHeader';
import { SessionRow } from '@/components/SessionRow';
import { TextField } from '@/components/TextField';
import { WaterChart } from '@/components/WaterChart';
import { useWaterLastUsage, useWaterSessions } from '@/hooks';
import { createId } from '@/ids';
import { saveWaterLastUsage } from '@/storage';
import { color, font } from '@/theme';

type Sheet = 'create' | 'calculate' | null;

const keyExtractor = (session: WaterSession) => session.id;
const atNoon = (date: Date) => {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
};

export default function WasaScreen() {
  const { sessions, loaded, save } = useWaterSessions();
  const lastUsage = useWaterLastUsage();
  const [sheet, setSheet] = useState<Sheet>(null);

  const closeSheet = useCallback(() => setSheet(null), []);

  const deleteSession = useCallback(
    (id: string) => {
      Alert.alert('Delete this session?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => save(sessions.filter((s) => s.id !== id)) },
      ]);
    },
    [save, sessions],
  );

  const renderItem = useCallback(
    ({ item }: { item: WaterSession }) => (
      <SessionRow id={item.id} onDelete={deleteSession} subtitle={`${formatUnits(item.amount)} units`} title={formatWaterDate(item.createdAt)} />
    ),
    [deleteSession],
  );

  const header = useMemo(
    () => (
      <View style={s.header}>
        <Card>
          <SectionHeader
            eyebrow="WASA"
            title="Water"
            description="Log water meter sessions. Enter the date and amount in units for each reading."
          />
          <Text style={s.tariff}>WASA water tariff for Residential Connection - 16.7 tk per m3 (1m3 = 1 unit)</Text>
          <Button icon="calculator-outline" label="Calculate" onPress={() => setSheet('calculate')} variant="secondary" />
          <Button icon="add" label="Create Session" onPress={() => setSheet('create')} />
        </Card>
        <LastUsageCard usage={lastUsage} />
        <WaterChart sessions={sessions} />
        <View style={s.listHeader}>
          <SectionHeader eyebrow="Sessions" title="All saved sessions" />
          <Pill label={`${sessions.length} total`} />
        </View>
      </View>
    ),
    [lastUsage, sessions],
  );

  return (
    <>
      <FlatList
        contentContainerStyle={s.content}
        contentInsetAdjustmentBehavior="automatic"
        data={sessions}
        ItemSeparatorComponent={Separator}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          loaded ? (
            <EmptyState icon="water-outline" title="No sessions yet" message="Start one with the Create Session button." />
          ) : (
            <Text style={s.tariff}>Loading sessions...</Text>
          )
        }
        ListHeaderComponent={header}
        renderItem={renderItem}
      />
      {sheet === 'create' ? (
        <CreateSheet
          onClose={closeSheet}
          onCreate={async (session) => {
            await save([session, ...sessions]);
            setSheet(null);
          }}
        />
      ) : null}
      {sheet === 'calculate' ? <CalculateSheet onClose={closeSheet} sessions={sessions} /> : null}
    </>
  );
}

function Separator() {
  return <View style={s.separator} />;
}

type CreateSheetProps = { onCreate: (session: WaterSession) => Promise<void>; onClose: () => void };

function CreateSheet({ onCreate, onClose }: CreateSheetProps) {
  const [date, setDate] = useState(() => new Date());
  const [amountInput, setAmountInput] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const amount = Number(amountInput.trim());
    if (!Number.isFinite(amount) || amountInput.trim() === '') {
      setError('Enter a valid amount in units.');
      return;
    }
    onCreate({ id: createId(), createdAt: atNoon(date).toISOString(), amount });
  };

  return (
    <BottomSheetModal onClose={onClose}>
      {() => (
        <>
          <SectionHeader eyebrow="New session" title="Create water session" />
          {error ? <Notice message={error} /> : null}
          <DateTimeField label="Date" onChange={setDate} value={date} />
          <TextField
            inputMode="decimal"
            keyboardType="decimal-pad"
            label="Amount (units)"
            onChangeText={(text) => setAmountInput(sanitizeReadingInput(text))}
            placeholder="Enter amount in units"
            value={amountInput}
          />
          <Button label="Create Session" onPress={submit} />
        </>
      )}
    </BottomSheetModal>
  );
}

function CalculateSheet({ sessions, onClose }: { sessions: WaterSession[]; onClose: () => void }) {
  const [firstId, setFirstId] = useState('');
  const [secondId, setSecondId] = useState('');

  const bill = useMemo(() => {
    const first = sessions.find((session) => session.id === firstId);
    const second = sessions.find((session) => session.id === secondId);
    if (!first || !second || first.id === second.id) {
      return null;
    }
    return calculateWaterBill(first, second);
  }, [sessions, firstId, secondId]);

  const total = bill?.total;
  const fromDate = bill?.fromDate;
  const toDate = bill?.toDate;
  const detail = bill ? describeWaterBill(bill) : undefined;

  useEffect(() => {
    if (total === undefined) {
      return;
    }
    saveWaterLastUsage({ amount: total, calculatedAt: new Date().toISOString(), fromDate, toDate, detail });
  }, [total, fromDate, toDate, detail]);

  return (
    <BottomSheetModal onClose={onClose}>
      {() => (
        <>
          <SectionHeader eyebrow="Calculate" title="Bill between sessions" />
          {sessions.length < 2 ? (
            <Notice tone="warning" message="Need at least two sessions to calculate." />
          ) : (
            <>
              <SessionPicker label="First session" onSelect={setFirstId} selectedId={firstId} sessions={sessions} />
              <SessionPicker label="Second session" onSelect={setSecondId} selectedId={secondId} sessions={sessions} />
              {bill ? (
                <View style={s.result}>
                  <Text style={s.resultSub}>
                    {formatUnits(bill.diff)} units x {WATER_RATE} x 2
                  </Text>
                  <Text selectable style={s.resultTotal}>৳{formatUnits(bill.total)}</Text>
                  <Text style={s.resultSub}>
                    Subtotal ৳{formatUnits(bill.subtotal)} + 15% VAT ৳{formatUnits(bill.vat)} = Total ৳{formatUnits(bill.total)}
                  </Text>
                  <Text style={s.resultFaint}>Estimated bill for 1 month: ৳{formatUnits(estimateMonthlyWaterBill(bill))}</Text>
                </View>
              ) : firstId && secondId ? (
                <Notice message="Pick two different sessions." />
              ) : null}
            </>
          )}
        </>
      )}
    </BottomSheetModal>
  );
}

type SessionPickerProps = { label: string; sessions: WaterSession[]; selectedId: string; onSelect: (id: string) => void };

function SessionPicker({ label, sessions, selectedId, onSelect }: SessionPickerProps) {
  return (
    <View style={s.picker}>
      <Text style={s.pickerLabel}>{label}</Text>
      {sessions.map((session) => {
        const selected = session.id === selectedId;
        return (
          <Pressable
            key={session.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(session.id)}
            style={[s.option, selected && s.optionSelected]}
          >
            <Text style={s.optionText}>
              {formatWaterDate(session.createdAt)} — {formatUnits(session.amount)} units
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: ms(16), paddingBottom: ms(40) },
  header: { gap: ms(16), marginBottom: ms(16) },
  separator: { height: ms(12) },
  tariff: { fontFamily: font.regular, fontSize: ms(13), lineHeight: ms(19), color: color.body },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  result: { gap: ms(4), borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted, borderRadius: ms(18), padding: ms(16) },
  resultTotal: { fontFamily: font.bold, fontSize: ms(26), color: color.heading },
  resultSub: { fontFamily: font.regular, fontSize: ms(12), color: color.muted },
  resultFaint: { fontFamily: font.regular, fontSize: ms(11), color: color.faint, marginTop: ms(4) },
  picker: { gap: ms(8) },
  pickerLabel: { fontFamily: font.medium, fontSize: ms(12), color: color.body },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: ms(14), borderWidth: 1, borderColor: color.border, borderRadius: ms(14), backgroundColor: color.surface },
  optionSelected: { borderColor: color.primaryBorder, backgroundColor: color.primarySoft },
  optionText: { fontFamily: font.regular, fontSize: ms(13), color: color.heading },
});
