import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useLocalSearchParams } from 'expo-router';
import { ms } from 'react-native-size-matters';
import { formatReading, formatSessionDate, sanitizeReadingInput, type MeterReading, type MeterSession } from '@lib/meter-ops';
import { BottomSheetModal } from '@/components/BottomSheetModal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Notice } from '@/components/Notice';
import { OwnerPicker } from '@/components/OwnerPicker';
import { Pill } from '@/components/Pill';
import { SectionHeader } from '@/components/SectionHeader';
import { SwitchRow } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { useSessions } from '@/hooks';
import { createId } from '@/ids';
import { color, font } from '@/theme';

type ReadingChanges = { ownerName: string; reading: number; isMotherMeter: boolean; capturedAt: string };

/** `null` means closed, `'new'` adds a reading, otherwise the reading being edited. */
type SheetTarget = 'new' | MeterReading | null;

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { sessions, loaded, save } = useSessions();
  const [target, setTarget] = useState<SheetTarget>(null);

  const session = sessions.find((item) => item.id === sessionId) ?? null;

  const update = (change: (current: MeterSession) => MeterSession) => {
    if (!session) return;
    return save(sessions.map((item) => (item.id === session.id ? change(item) : item)));
  };

  const setDate = (date: Date) => update((current) => ({ ...current, createdAt: date.toISOString() }));

  const updateReading = (readingId: string, changes: ReadingChanges) =>
    update((current) => ({
      ...current,
      readings: current.readings.map((r) => {
        if (r.id !== readingId) return r;
        const { isMotherMeter, ...rest } = { ...r, ...changes };
        return isMotherMeter ? { ...rest, isMotherMeter: true } : rest;
      }),
    }));

  const addReading = (changes: ReadingChanges) =>
    update((current) => {
      const alreadyHasMotherMeter = current.readings.some((r) => r.isMotherMeter);
      const reading: MeterReading = {
        id: createId(),
        ownerName: changes.ownerName,
        reading: changes.reading,
        capturedAt: new Date().toISOString(),
        ocrText: '',
        ...(changes.isMotherMeter && !alreadyHasMotherMeter && { isMotherMeter: true }),
      };
      return { ...current, readings: [...current.readings, reading] };
    });

  const deleteReading = (reading: MeterReading) => {
    Alert.alert(`Delete ${reading.ownerName}?`, 'This reading will be removed from the session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => update((current) => ({ ...current, readings: current.readings.filter((r) => r.id !== reading.id) })),
      },
    ]);
  };

  if (!loaded) {
    return null;
  }

  if (!session) {
    return (
      <KeyboardAwareScrollView contentContainerStyle={s.content} contentInsetAdjustmentBehavior="automatic">
        <EmptyState icon="alert-circle-outline" title="Session not found" message="This session is missing from the data on this phone." />
      </KeyboardAwareScrollView>
    );
  }

  const hasMotherMeter = session.readings.some((r) => r.isMotherMeter);

  return (
    <>
      <KeyboardAwareScrollView contentContainerStyle={s.content} contentInsetAdjustmentBehavior="automatic" enableOnAndroid extraScrollHeight={ms(120)}>
        <Card>
          <SectionHeader eyebrow="Session detail" title="Meter readings" />
          <DateTimeField label="Created" mode="datetime" onChange={setDate} value={new Date(session.createdAt)} />
          <View style={s.pills}>
            <Pill label={`${session.readings.length} reading${session.readings.length === 1 ? '' : 's'}`} />
          </View>
        </Card>

        <Card>
          {session.readings.map((reading) => (
            <View key={reading.id} style={s.reading}>
              <View style={s.readingBody}>
                <Text style={s.owner}>
                  {reading.ownerName}
                  {reading.isMotherMeter ? <Text style={s.mm}> (MM)</Text> : null}
                </Text>
                <Text selectable style={s.value}>{formatReading(reading.reading)}</Text>
                <Text style={s.captured}>{formatSessionDate(reading.capturedAt)}</Text>
              </View>
              <IconButton icon="pencil-outline" label={`Edit ${reading.ownerName}`} onPress={() => setTarget(reading)} />
              <IconButton icon="trash-outline" label={`Delete ${reading.ownerName}`} onPress={() => deleteReading(reading)} tone="danger" />
            </View>
          ))}
          {session.readings.length === 0 ? <Text style={s.captured}>No readings yet.</Text> : null}
          <Button icon="add" label="Add entry" onPress={() => setTarget('new')} variant="secondary" />
        </Card>
      </KeyboardAwareScrollView>

      {target ? (
        <ReadingSheet
          hasMotherMeter={hasMotherMeter}
          onClose={() => setTarget(null)}
          onSave={(changes) => {
            if (target === 'new') return addReading(changes);
            return updateReading(target.id, changes);
          }}
          reading={target === 'new' ? null : target}
        />
      ) : null}
    </>
  );
}

type ReadingSheetProps = {
  reading: MeterReading | null;
  hasMotherMeter: boolean;
  onSave: (changes: ReadingChanges) => Promise<void> | void;
  onClose: () => void;
};

function ReadingSheet({ reading, hasMotherMeter, onSave, onClose }: ReadingSheetProps) {
  const [ownerName, setOwnerName] = useState(reading?.ownerName ?? '');
  const [readingInput, setReadingInput] = useState(reading ? String(reading.reading) : '');
  const [isMotherMeter, setIsMotherMeter] = useState(reading?.isMotherMeter ?? false);
  const [capturedAt, setCapturedAt] = useState(() => new Date(reading?.capturedAt ?? Date.now()));
  const [error, setError] = useState('');

  const submit = async (close: () => void) => {
    const value = Number(readingInput.trim());
    if (!ownerName.trim()) {
      setError('Owner name is required.');
      return;
    }
    if (!Number.isFinite(value) || readingInput.trim() === '') {
      setError('Enter a valid meter reading.');
      return;
    }
    await onSave({ ownerName: ownerName.trim(), reading: value, isMotherMeter, capturedAt: capturedAt.toISOString() });
    close();
  };

  return (
    <BottomSheetModal onClose={onClose}>
      {(close) => (
        <>
          <SectionHeader eyebrow={reading ? 'Edit reading' : 'Add reading'} title={reading ? `Edit ${reading.ownerName}` : 'New entry'} />
          {error ? <Notice message={error} /> : null}
          <OwnerPicker onChange={setOwnerName} value={ownerName} />
          <SwitchRow
            disabled={!isMotherMeter && hasMotherMeter}
            hint={!isMotherMeter && hasMotherMeter ? 'Already set for this session' : undefined}
            label="Mother meter"
            onValueChange={setIsMotherMeter}
            value={isMotherMeter}
          />
          <TextField
            inputMode="decimal"
            keyboardType="decimal-pad"
            label="Meter reading"
            onChangeText={(text) => setReadingInput(sanitizeReadingInput(text))}
            placeholder="Reading"
            value={readingInput}
          />
          {reading ? <DateTimeField label="Captured" mode="datetime" onChange={setCapturedAt} value={capturedAt} /> : null}
          <Button label={reading ? 'Save changes' : 'Add entry'} onPress={() => submit(close)} />
        </>
      )}
    </BottomSheetModal>
  );
}

const s = StyleSheet.create({
  content: { padding: ms(16), paddingBottom: ms(40), gap: ms(16) },
  pills: { flexDirection: 'row', gap: ms(8) },
  reading: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: color.border, paddingBottom: ms(10) },
  readingBody: { flex: 1, gap: ms(2) },
  owner: { fontFamily: font.semibold, fontSize: ms(15), color: color.heading },
  mm: { fontFamily: font.regular, fontSize: ms(12), color: color.muted },
  value: { fontFamily: font.medium, fontSize: ms(14), color: color.body },
  captured: { fontFamily: font.regular, fontSize: ms(12), color: color.muted },
});
