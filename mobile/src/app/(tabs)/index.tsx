import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ms } from 'react-native-size-matters';
import { formatSessionDate, parsePastedReadings, sanitizeReadingInput, type MeterReading, type MeterSession } from '@lib/meter-ops';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { LastUsageCard } from '@/components/LastUsageCard';
import { MeterReadingsChart } from '@/components/MeterReadingsChart';
import { Notice } from '@/components/Notice';
import { OwnerPicker } from '@/components/OwnerPicker';
import { Pill } from '@/components/Pill';
import { RecentConsumptionCard } from '@/components/RecentConsumptionCard';
import { SectionHeader } from '@/components/SectionHeader';
import { SessionRow } from '@/components/SessionRow';
import { SwitchRow } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { BottomSheetModal } from '@/components/BottomSheetModal';
import { useLastUsage, useSessions } from '@/hooks';
import { createId } from '@/ids';
import { color, font } from '@/theme';

type Sheet = 'add' | 'calculate' | 'import' | null;

const sessionSubtitle = (session: MeterSession) =>
  `${session.readings.length} meter reading${session.readings.length === 1 ? '' : 's'}`;

const keyExtractor = (session: MeterSession) => session.id;

const atNoon = (date: Date) => {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
};

export default function DpdcScreen() {
  const router = useRouter();
  const { sessions, loaded, save } = useSessions();
  const lastUsage = useLastUsage();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [draftReadings, setDraftReadings] = useState<MeterReading[]>([]);

  const closeSheet = useCallback(() => setSheet(null), []);

  const openSession = useCallback((id: string) => router.push({ pathname: '/sessions/[sessionId]', params: { sessionId: id } }), [router]);

  const deleteSession = useCallback(
    (id: string) => {
      Alert.alert('Delete this session?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => save(sessions.filter((s) => s.id !== id)) },
      ]);
    },
    [save, sessions],
  );

  const createSession = useCallback(
    async (readings: MeterReading[], createdAt: string) => {
      const session: MeterSession = { id: createId(), createdAt, readings };
      await save([session, ...sessions]);
      setSheet(null);
      openSession(session.id);
    },
    [openSession, save, sessions],
  );

  const renderItem = useCallback(
    ({ item }: { item: MeterSession }) => (
      <SessionRow
        id={item.id}
        onDelete={deleteSession}
        onPress={openSession}
        subtitle={sessionSubtitle(item)}
        title={formatSessionDate(item.createdAt)}
      />
    ),
    [deleteSession, openSession],
  );

  const header = useMemo(
    () => (
      <View style={s.header}>
        <Card>
          <SectionHeader
            eyebrow="Meter Ops"
            title="Home"
            description="Start a session, enter meter readings manually, and save each reading with the owner name."
          />
          <Button icon="add" label="Add Session" onPress={() => setSheet('add')} />
          <Button disabled={!loaded || sessions.length < 2} icon="calculator-outline" label="Calculate" onPress={() => setSheet('calculate')} variant="secondary" />
          <Text style={s.draft}>
            {draftReadings.length > 0
              ? `Current draft: ${draftReadings.length} reading${draftReadings.length === 1 ? '' : 's'}`
              : 'No active draft yet'}
          </Text>
        </Card>
        <LastUsageCard usage={lastUsage} />
        {sessions.length >= 2 ? <MeterReadingsChart sessions={sessions} /> : null}
        {sessions.length >= 2 ? <RecentConsumptionCard sessions={sessions} /> : null}
        <View style={s.listHeader}>
          <SectionHeader eyebrow="Sessions" title="All saved sessions" />
          <View style={s.listTools}>
            <IconButton icon="clipboard-outline" label="Paste readings" onPress={() => setSheet('import')} />
            <Pill label={`${sessions.length} total`} />
          </View>
        </View>
      </View>
    ),
    [draftReadings.length, lastUsage, loaded, sessions],
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
            <EmptyState icon="document-text-outline" title="No sessions yet" message="Start one with the Add Session button." />
          ) : (
            <Text style={s.loading}>Loading sessions...</Text>
          )
        }
        ListHeaderComponent={header}
        renderItem={renderItem}
      />

      {sheet === 'add' ? (
        <AddSessionSheet
          draftReadings={draftReadings}
          onClose={closeSheet}
          onDraftChange={setDraftReadings}
          onEnd={(readings) => {
            setDraftReadings([]);
            return createSession(readings, new Date().toISOString());
          }}
          onPaste={() => setSheet('import')}
        />
      ) : null}
      {sheet === 'calculate' ? <CalculateSheet onClose={closeSheet} sessions={sessions} /> : null}
      {sheet === 'import' ? (
        <PasteImportSheet onClose={closeSheet} onImport={(readings, createdAt) => createSession(readings, createdAt)} />
      ) : null}
    </>
  );
}

function Separator() {
  return <View style={s.separator} />;
}

type AddSessionSheetProps = {
  draftReadings: MeterReading[];
  onDraftChange: (readings: MeterReading[]) => void;
  onEnd: (readings: MeterReading[]) => Promise<void>;
  onPaste: () => void;
  onClose: () => void;
};

function AddSessionSheet({ draftReadings, onDraftChange, onEnd, onPaste, onClose }: AddSessionSheetProps) {
  const [ownerName, setOwnerName] = useState('');
  const [readingInput, setReadingInput] = useState('');
  const [isMotherMeter, setIsMotherMeter] = useState(false);
  const [error, setError] = useState('');

  const motherTaken = draftReadings.some((r) => r.isMotherMeter);

  const save = (action: 'continue' | 'end') => {
    const name = ownerName.trim();
    const value = Number(readingInput.trim());

    if (!name) {
      setError('Owner name is required.');
      return;
    }
    if (!Number.isFinite(value) || readingInput.trim() === '') {
      setError('Enter a valid meter reading before continuing.');
      return;
    }

    const reading: MeterReading = {
      id: createId(),
      ownerName: name,
      reading: value,
      ocrText: '',
      capturedAt: new Date().toISOString(),
      ...(isMotherMeter && { isMotherMeter: true }),
    };
    const next = [...draftReadings, reading];

    if (action === 'continue') {
      onDraftChange(next);
      setOwnerName('');
      setReadingInput('');
      setIsMotherMeter(false);
      setError('');
      return;
    }

    // `onEnd` clears the draft and opens the new session, which unmounts this sheet.
    onEnd(next);
  };

  return (
    <BottomSheetModal onClose={onClose}>
      {() => (
        <>
          <View style={s.sheetHead}>
            <SectionHeader eyebrow="Add reading" title="Enter reading details" />
            <Button icon="clipboard-outline" label="Paste" onPress={onPaste} variant="secondary" />
          </View>
          {error ? <Notice message={error} /> : null}
          <OwnerPicker onChange={setOwnerName} value={ownerName} />
          <SwitchRow
            disabled={!isMotherMeter && motherTaken}
            hint={!isMotherMeter && motherTaken ? 'Already set for this session' : undefined}
            label="Mother meter"
            onValueChange={setIsMotherMeter}
            value={isMotherMeter}
          />
          <TextField
            inputMode="decimal"
            keyboardType="decimal-pad"
            label="Meter reading"
            onChangeText={(text) => setReadingInput(sanitizeReadingInput(text))}
            placeholder="Enter reading"
            value={readingInput}
          />
          <Text style={s.draft}>
            {draftReadings.length} reading{draftReadings.length === 1 ? '' : 's'} in this draft
          </Text>
          <View style={s.actions}>
            <Button label="End Session" onPress={() => save('end')} style={s.action} variant="secondary" />
            <Button label="Continue" onPress={() => save('continue')} style={s.action} />
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}

function CalculateSheet({ sessions, onClose }: { sessions: MeterSession[]; onClose: () => void }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 2) return current;
      return [...current, id];
    });

  return (
    <BottomSheetModal onClose={onClose}>
      {(close) => (
        <>
          <SectionHeader eyebrow="Compare sessions" title="Select exactly two sessions" description="Pick the older and newer meter snapshots you want to compare." />
          {sessions.map((session) => {
            const isSelected = selected.includes(session.id);
            const isDisabled = !isSelected && selected.length >= 2;
            return (
              <Pressable
                key={session.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                disabled={isDisabled}
                onPress={() => toggle(session.id)}
                style={[s.pick, isSelected && s.picked, isDisabled && s.pickDisabled]}
              >
                <View style={s.pickText}>
                  <Text style={s.pickTitle}>{formatSessionDate(session.createdAt)}</Text>
                  <Text style={s.pickSub}>{sessionSubtitle(session)}</Text>
                </View>
                <View style={[s.check, isSelected && s.checked]}>
                  <Ionicons name="checkmark" size={ms(16)} color={isSelected ? color.onPrimary : color.faint} />
                </View>
              </Pressable>
            );
          })}
          <View style={s.footer}>
            <Text style={s.pickSub}>{selected.length} of 2 sessions selected</Text>
            <Button
              disabled={selected.length !== 2}
              label="Calculate"
              onPress={() => {
                close();
                router.push({ pathname: '/consumption', params: { first: selected[0], second: selected[1] } });
              }}
            />
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}

type PasteImportSheetProps = { onImport: (readings: MeterReading[], createdAt: string) => Promise<void>; onClose: () => void };

function PasteImportSheet({ onImport, onClose }: PasteImportSheetProps) {
  const [date, setDate] = useState(() => atNoon(new Date()));
  const [text, setText] = useState('');

  const capturedAt = atNoon(date).toISOString();
  const parsedCount = useMemo(() => parsePastedReadings(text, capturedAt, createId).length, [text, capturedAt]);

  return (
    <BottomSheetModal onClose={onClose}>
      {() => (
        <>
          <SectionHeader eyebrow="Import readings" title="Paste meter readings" description="One reading per line as OWNER READING, e.g. MM 11458.8." />
          <DateTimeField label="Session date" onChange={setDate} value={date} />
          <TextField
            autoCapitalize="characters"
            autoCorrect={false}
            label="Readings"
            multiline
            onChangeText={setText}
            placeholder={'MM    11458.8\n1A    28926.3\n1B    26646.3\n2A    16508'}
            value={text}
          />
          <View style={s.footer}>
            <Text style={s.pickSub}>{parsedCount} readings parsed</Text>
            <Button disabled={parsedCount === 0} label="Import session" onPress={() => onImport(parsePastedReadings(text, capturedAt, createId), capturedAt)} />
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}

const s = StyleSheet.create({
  content: { padding: ms(16), paddingBottom: ms(40) },
  header: { gap: ms(16), marginBottom: ms(16) },
  separator: { height: ms(12) },
  draft: { fontFamily: font.regular, fontSize: ms(12), color: color.muted },
  loading: { fontFamily: font.regular, fontSize: ms(14), color: color.body },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTools: { flexDirection: 'row', alignItems: 'center', gap: ms(4) },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: ms(12) },
  actions: { flexDirection: 'row', gap: ms(12) },
  action: { flex: 1 },
  pick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: color.border, borderRadius: ms(18), padding: ms(14), backgroundColor: color.surface },
  picked: { borderColor: color.primaryBorder, backgroundColor: color.primarySoft },
  pickDisabled: { opacity: 0.5 },
  pickText: { gap: ms(2), flex: 1 },
  pickTitle: { fontFamily: font.semibold, fontSize: ms(14), color: color.heading },
  pickSub: { fontFamily: font.regular, fontSize: ms(12), color: color.muted },
  check: { width: ms(32), height: ms(32), borderRadius: 999, borderWidth: 1, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: color.primary, borderColor: color.primary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ms(12), backgroundColor: color.chip, borderRadius: ms(16), padding: ms(12) },
});
