import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { ms } from 'react-native-size-matters';
import { exportBackup, importBackup } from '@/backup';
import { color, font } from '@/theme';
import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { SectionHeader } from './SectionHeader';

const messageOf = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

export function HeaderMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const run = async (close: () => void, action: () => Promise<void>, failureTitle: string) => {
    setIsBusy(true);
    close();
    try {
      await action();
    } catch (error) {
      Alert.alert(failureTitle, messageOf(error));
    } finally {
      setIsBusy(false);
    }
  };

  const onExport = (close: () => void) => run(close, exportBackup, 'Export failed');

  const onImport = (close: () => void) =>
    run(
      close,
      async () => {
        const outcome = await importBackup();
        if (outcome === 'imported') {
          Alert.alert('Import complete', 'Your data has been restored.');
        }
      },
      'Import failed',
    );

  return (
    <>
      <IconButton icon="ellipsis-vertical" label="Backup menu" onPress={() => setIsOpen(true)} />
      {isOpen ? (
        <BottomSheetModal onClose={() => setIsOpen(false)}>
          {(close) => (
            <>
              <SectionHeader eyebrow="Backup" title="Export or import" />
              <Text style={s.reminder}>
                Your data lives only on this phone. Uninstalling the app erases it, so export a backup regularly.
              </Text>
              <Button disabled={isBusy} icon="share-outline" label="Export backup" onPress={() => onExport(close)} />
              <Button disabled={isBusy} icon="download-outline" label="Import backup" onPress={() => onImport(close)} variant="secondary" />
            </>
          )}
        </BottomSheetModal>
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  reminder: { fontFamily: font.regular, fontSize: ms(13), lineHeight: ms(19), color: color.body },
});
