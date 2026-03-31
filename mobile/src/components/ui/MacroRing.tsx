import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

interface MacroRingProps {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  label: string;
  current: number;
  target: number;
  unit: string;
}

/**
 * Circular progress ring built with View + borderRadius.
 * Uses two half-circle clips to simulate an arc from 0-100%.
 */
export function MacroRing({
  size,
  strokeWidth,
  progress,
  color,
  label,
  current,
  target,
  unit,
}: MacroRingProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const degrees = clampedProgress * 360;
  const halfSize = size / 2;

  // We render a background ring and overlay two rotating half-circles to fill the arc.
  // For 0-180 degrees: rotate the right half.
  // For 180-360 degrees: keep right half fully visible, rotate left half.

  const rightRotation = degrees <= 180 ? degrees : 180;
  const leftRotation = degrees <= 180 ? 0 : degrees - 180;
  const showLeft = degrees > 180;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Background ring */}
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: color + '20',
          }}
        />

        {/* Right half clip */}
        <View
          style={{
            position: 'absolute',
            width: halfSize,
            height: size,
            right: 0,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: color,
              borderLeftColor: 'transparent',
              borderBottomColor: 'transparent',
              position: 'absolute',
              right: 0,
              transform: [
                { rotate: `${rightRotation}deg` },
              ],
            }}
          />
        </View>

        {/* Left half clip (only visible > 50%) */}
        {showLeft && (
          <View
            style={{
              position: 'absolute',
              width: halfSize,
              height: size,
              left: 0,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRightColor: 'transparent',
                borderTopColor: 'transparent',
                position: 'absolute',
                left: 0,
                transform: [
                  { rotate: `${leftRotation}deg` },
                ],
              }}
            />
          </View>
        )}

        {/* Center text */}
        <Text style={styles.centerValue}>{current}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.subLabel}>
        / {target}{unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerValue: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  label: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    marginTop: 4,
  },
  subLabel: {
    fontSize: Fonts.size.xs,
    color: Colors.lightGray,
  },
});

export default MacroRing;
