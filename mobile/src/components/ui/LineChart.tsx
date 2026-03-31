import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

export interface LineChartDataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  color?: string;
  height?: number;
  title?: string;
  unit?: string;
}

export function LineChart({
  data,
  color = Colors.primary,
  height = 160,
  title,
  unit = 'kg',
}: LineChartProps) {
  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.1;
  const effectiveMin = minVal - padding;
  const effectiveMax = maxVal + padding;
  const effectiveRange = effectiveMax - effectiveMin;

  const chartHeight = height - 40; // room for labels
  const gridLines = 4;
  const gridValues: number[] = [];
  for (let i = 0; i < gridLines; i++) {
    gridValues.push(effectiveMin + (effectiveRange / (gridLines - 1)) * i);
  }

  const getY = (value: number) => {
    const ratio = (value - effectiveMin) / effectiveRange;
    return chartHeight - ratio * chartHeight;
  };

  // Calculate line segments between points
  const columnWidth = data.length > 1 ? 100 / (data.length - 1) : 100;

  return (
    <View style={styles.wrapper}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={[styles.chartContainer, { height }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {gridValues.reverse().map((val, idx) => (
            <Text key={idx} style={styles.yLabel}>
              {Math.round(val)}
            </Text>
          ))}
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          {gridValues.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.gridLine,
                {
                  top: (idx / (gridLines - 1)) * chartHeight,
                },
              ]}
            />
          ))}

          {/* Area fill under the line */}
          {data.map((point, idx) => {
            if (idx === data.length - 1 && data.length > 1) return null;
            const y = getY(point.value);
            const nextY = idx < data.length - 1 ? getY(data[idx + 1].value) : y;
            const barTop = Math.min(y, nextY);
            const barHeight = chartHeight - barTop;
            const left = data.length > 1
              ? `${(idx / (data.length - 1)) * 100}%`
              : '0%';
            const width = data.length > 1
              ? `${(1 / (data.length - 1)) * 100}%`
              : '100%';

            return (
              <View
                key={`area-${idx}`}
                style={{
                  position: 'absolute',
                  left: left as any,
                  top: barTop,
                  width: width as any,
                  height: barHeight,
                  backgroundColor: color + '15',
                }}
              />
            );
          })}

          {/* Line segments (thin bars rotated to connect dots) */}
          {data.map((point, idx) => {
            if (idx === data.length - 1) return null;
            const next = data[idx + 1];
            const x1Pct = (idx / (data.length - 1)) * 100;
            const x2Pct = ((idx + 1) / (data.length - 1)) * 100;
            const y1 = getY(point.value);
            const y2 = getY(next.value);

            // We approximate the line with a thin tall View.
            // Use absolute positioning with a colored bottom border approach.
            // Simpler: draw a thin horizontal bar at midpoint
            const midY = (y1 + y2) / 2;
            const dy = y2 - y1;
            // Width in percent difference
            const segWidthPct = x2Pct - x1Pct;

            return (
              <View
                key={`line-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${x1Pct}%` as any,
                  top: midY - 1,
                  width: `${segWidthPct}%` as any,
                  height: 2.5,
                  backgroundColor: color,
                  borderRadius: 1.5,
                  transform: [
                    { rotate: `${Math.atan2(dy, 200) * (180 / Math.PI)}deg` },
                  ],
                  transformOrigin: 'left center',
                }}
              />
            );
          })}

          {/* Data points (dots) */}
          {data.map((point, idx) => {
            const y = getY(point.value);
            const leftPct = data.length > 1
              ? (idx / (data.length - 1)) * 100
              : 50;

            return (
              <View
                key={`dot-${idx}`}
                style={[
                  styles.dot,
                  {
                    backgroundColor: color,
                    borderColor: Colors.white,
                    left: `${leftPct}%` as any,
                    top: y - 5,
                    marginLeft: -5,
                  },
                ]}
              >
                {/* Value label on the last point */}
                {idx === data.length - 1 && (
                  <View style={styles.valueBubble}>
                    <Text style={[styles.valueBubbleText, { color }]}>
                      {point.value}{unit}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* X-axis labels */}
          <View style={[styles.xAxis, { top: chartHeight + 4 }]}>
            {data.map((point, idx) => {
              const leftPct = data.length > 1
                ? (idx / (data.length - 1)) * 100
                : 50;
              return (
                <Text
                  key={idx}
                  style={[
                    styles.xLabel,
                    {
                      left: `${leftPct}%` as any,
                      transform: [{ translateX: -18 }],
                    },
                  ]}
                  numberOfLines={1}
                >
                  {point.label}
                </Text>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  title: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 32,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  yLabel: {
    fontSize: 9,
    color: Colors.lightGray,
    fontWeight: Fonts.weight.medium,
    textAlign: 'right',
    paddingRight: 4,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
    opacity: 0.6,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    zIndex: 10,
  },
  valueBubble: {
    position: 'absolute',
    bottom: 14,
    left: -16,
    width: 50,
    alignItems: 'center',
  },
  valueBubbleText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold,
  },
  xAxis: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 16,
  },
  xLabel: {
    position: 'absolute',
    fontSize: 9,
    color: Colors.lightGray,
    fontWeight: Fonts.weight.medium,
    width: 36,
    textAlign: 'center',
  },
});

export default LineChart;
