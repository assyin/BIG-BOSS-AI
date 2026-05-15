/**
 * Big Boss Fitness — Logo
 *
 * Étoile à 8 pointes en CSS pur (pas de SVG).
 * Construite avec 2 carrés superposés à 45°, comme dans les vrais zelliges.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

interface LogoProps {
  size?: number;
  variant?: 'mark' | 'full' | 'splash';
  color?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 80,
  variant = 'mark',
  color = Colors.primary,
}) => {
  // Carrés à superposer pour faire l'étoile à 8 pointes
  const squareSize = size * 0.78;

  const renderMark = () => (
    <View style={[styles.markContainer, { width: size, height: size }]}>
      {/* Premier carré (droit) */}
      <View
        style={[
          styles.starSquare,
          {
            width: squareSize,
            height: squareSize,
            backgroundColor: color,
            borderRadius: size * 0.05,
          },
        ]}
      />
      {/* Deuxième carré (rotation 45°) */}
      <View
        style={[
          styles.starSquare,
          styles.rotated,
          {
            width: squareSize,
            height: squareSize,
            backgroundColor: color,
            borderRadius: size * 0.05,
          },
        ]}
      />
      {/* Cercle central pour effet zellige */}
      <View
        style={[
          styles.centerCircle,
          {
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: size * 0.275,
            backgroundColor: Colors.primaryDark,
          },
        ]}
      />
      {/* BB monogram */}
      <Text
        style={[
          styles.bbText,
          {
            fontSize: size * 0.32,
            color: Colors.white,
          },
        ]}
      >
        BB
      </Text>
    </View>
  );

  if (variant === 'mark') {
    return renderMark();
  }

  if (variant === 'full') {
    return (
      <View style={styles.fullContainer}>
        {renderMark()}
        <View style={styles.textContainer}>
          <Text style={[styles.brandName, { fontSize: size * 0.22 }]}>BIG BOSS</Text>
          <Text style={[styles.brandSub, { fontSize: size * 0.14 }]}>FITNESS</Text>
        </View>
      </View>
    );
  }

  // splash
  return (
    <View style={styles.splashContainer}>
      {renderMark()}
      <Text style={[styles.splashTitle, { fontSize: size * 0.32 }]}>BIG BOSS</Text>
      <Text style={[styles.splashSub, { fontSize: size * 0.18 }]}>FITNESS</Text>
      <View style={styles.divider} />
      <Text style={[styles.tagline, { fontSize: size * 0.14 }]}>ولاد البلاد</Text>
      <Text style={[styles.taglineFr, { fontSize: size * 0.12 }]}>Made in Morocco</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  markContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starSquare: {
    position: 'absolute',
  },
  rotated: {
    transform: [{ rotate: '45deg' }],
  },
  centerCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bbText: {
    fontFamily: Fonts.family.displayBold,
    fontWeight: '900',
    letterSpacing: 1,
    position: 'absolute',
    textShadowColor: 'rgba(44, 24, 16, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Full variant
  fullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: Fonts.family.displayBold,
    color: Colors.dark,
    letterSpacing: 1.5,
    lineHeight: 22,
  },
  brandSub: {
    fontFamily: Fonts.family.displayMedium,
    color: Colors.primary,
    letterSpacing: 2,
    lineHeight: 16,
  },

  // Splash variant
  splashContainer: {
    alignItems: 'center',
    gap: 4,
  },
  splashTitle: {
    fontFamily: Fonts.family.displayBold,
    color: Colors.white,
    letterSpacing: 2,
    marginTop: 16,
  },
  splashSub: {
    fontFamily: Fonts.family.displayMedium,
    color: Colors.white,
    letterSpacing: 4,
    opacity: 0.9,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.gold,
    marginVertical: 12,
    borderRadius: 1,
  },
  tagline: {
    fontFamily: Fonts.family.arBold,
    color: Colors.gold,
    letterSpacing: 2,
  },
  taglineFr: {
    fontFamily: Fonts.family.regular,
    color: Colors.white,
    opacity: 0.7,
    letterSpacing: 2,
    marginTop: 4,
  },
});

export default Logo;
