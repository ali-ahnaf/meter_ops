import { useWindowDimensions } from 'react-native';
import { ms } from 'react-native-size-matters';

/** Screen gutter (16 each side) + card padding and border (~19 each side) + y-axis labels. */
export function useChartWidth() {
  const { width } = useWindowDimensions();
  return width - ms(32) - ms(38) - ms(44);
}
