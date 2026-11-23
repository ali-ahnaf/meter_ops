import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ms } from 'react-native-size-matters';
import { A4_HEIGHT_PX, A4_WIDTH_PX, billLayout } from '@lib/bill-layout';
import { printBills, type BillImage } from '@/billPrint';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { TextField } from '@/components/TextField';
import { color, font } from '@/theme';

const toNumber = (text: string) => Number(text.replace(/[^0-9]/g, '')) || 0;

export default function BillsScreen() {
  const [images, setImages] = useState<BillImage[]>([]);
  const [perPage, setPerPage] = useState('6');
  const [cols, setCols] = useState('3');
  const [gap, setGap] = useState('8');
  const [margin, setMargin] = useState('24');
  const [printing, setPrinting] = useState(false);

  const { c, rows, pages } = billLayout(images, toNumber(perPage), toNumber(cols));
  const gapPx = Math.min(toNumber(gap), 60);
  const marginPx = Math.min(toNumber(margin), 80);

  const addImages = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
    });
    if (result.canceled) return;
    const picked = result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' }));
    setImages((prev) => [...prev, ...picked]);
  }, []);

  const print = async () => {
    setPrinting(true);
    try {
      await printBills({ pages, c, rows, gap: gapPx, margin: marginPx });
    } catch (error) {
      Alert.alert('Could not print', error instanceof Error ? error.message : String(error));
    } finally {
      setPrinting(false);
    }
  };

  const header = (
    <View style={s.header}>
      <Card>
        <SectionHeader
          eyebrow="Bills"
          title="Fit images on A4"
          description="Upload bill images. They are laid out on A4 pages with aspect ratio preserved."
        />
        <Button icon="images-outline" label="Upload images" onPress={addImages} variant="secondary" />
        <View style={s.fields}>
          <NumberField label="Images / page" value={perPage} onChange={setPerPage} />
          <NumberField label="Columns (0 = auto)" value={cols} onChange={setCols} />
          <NumberField label="Gap (px)" value={gap} onChange={setGap} />
          <NumberField label="Margin (px)" value={margin} onChange={setMargin} />
        </View>
        <Button
          icon="print-outline"
          label={printing ? 'Preparing...' : 'Print / Save PDF'}
          onPress={print}
          disabled={!images.length || printing}
        />
        <Button icon="trash-outline" label="Clear" onPress={() => setImages([])} variant="secondary" disabled={!images.length} />
        <Text style={s.count}>{images.length ? `${images.length} image${images.length > 1 ? 's' : ''}` : 'No images'}</Text>
      </Card>
    </View>
  );

  return (
    <FlatList
      contentContainerStyle={s.content}
      contentInsetAdjustmentBehavior="automatic"
      data={pages}
      ItemSeparatorComponent={Separator}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(page, index) => `${index}:${page[0]?.uri}`}
      ListHeaderComponent={header}
      renderItem={({ item }) => <A4Page images={item} c={c} rows={rows} gap={gapPx} margin={marginPx} />}
    />
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.field}>
      <TextField inputMode="numeric" keyboardType="number-pad" label={label} onChangeText={onChange} value={value} />
    </View>
  );
}

type A4PageProps = { images: BillImage[]; c: number; rows: number; gap: number; margin: number };

// On-screen preview: scales the 794x1123 px web page down to the card width so
// margin and gap keep the same proportions as the printed page.
const A4Page = memo(function A4Page({ images, c, rows, gap, margin }: A4PageProps) {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);
  const scale = width / A4_WIDTH_PX;

  const grid = useMemo(
    () => Array.from({ length: rows }, (_, r) => Array.from({ length: c }, (_, col) => images[r * c + col])),
    [images, c, rows],
  );

  return (
    <View onLayout={onLayout} style={[s.page, { padding: margin * scale, gap: gap * scale }]}>
      {grid.map((row, r) => (
        <View key={r} style={[s.row, { gap: gap * scale }]}>
          {row.map((image, col) => (
            <View key={col} style={s.cell}>
              {image ? <Image source={{ uri: image.uri }} resizeMode="contain" style={s.image} /> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

function Separator() {
  return <View style={s.separator} />;
}

const s = StyleSheet.create({
  content: { padding: ms(16), paddingBottom: ms(40) },
  header: { marginBottom: ms(16) },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(12) },
  field: { width: '47%' },
  count: { fontFamily: font.regular, fontSize: ms(13), color: color.muted },
  separator: { height: ms(16) },
  page: {
    width: '100%',
    aspectRatio: A4_WIDTH_PX / A4_HEIGHT_PX,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
