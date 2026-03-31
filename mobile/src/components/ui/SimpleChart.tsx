import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

export interface ChartDataPoint {
  label: string;
  value: number;
}

interface SimpleChartProps {
  data: ChartDataPoint[];
  barColor?: string;
  highlightLastBar?: boolean;
  height?: number;
  showValues?: boolean;
  unit?: string;
}

export function SimpleChart({
  data,
  barColor = Colors.primary,
  highlightLastBar = true,
  height = 120,
  showValues = true,
  unit = '',
}: SimpleChartProps) {
  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const minBarHeight = 20;
  const maxBarHeight = height - 40; // leave room for value label on top

  return (
    <View style={[styles.container, { height: height + 30 }]}>
      <View style={styles.barsRow}>
        {data.map((point, idx) => {
          const normalized = (point.value - minVal) / range;
          const barHeight = normalized * maxBarHeight + minBarHeight;
          const isLast = highlightLastBar && idx === data.length - 1;
          const color = isLast ? barColor : barColor + '40';

          return (
            <View key={idx} style={styles.barColumn}>
              {showValues && (
                <Text
                  style={[styles.valueLabel, isLast && { color: barColor, fontWeight: Fonts.weight.bold }]}
                  numberOfLines={1}
                >
                  {point.value % 1 === 0 ? point.value : point.value.toFixed(1)}
                  {unit}
                </Text>
              )}
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: color,
                  },
                ]}
              />
              <Text style={styles.dateLabel} numberOfLines={1}>
                {point.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  valueLabel: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    fontWeight: Fonts.weight.medium,
    marginBottom: 4,
  },
  bar: {
    width: 24,
    borderRadius: 6,
    minHeight: 4,
  },
  dateLabel: {
    fontSize: 9,
    color: Colors.lightGray,
    fontWeight: Fonts.weight.medium,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default SimpleChart;
