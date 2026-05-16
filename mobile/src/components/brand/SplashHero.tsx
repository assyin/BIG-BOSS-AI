/**
 * SplashHero — Écran de loading "Atlas & Médina"
 *
 * Gradient brand (Terre Marrakech → Safran) + ZelligePattern + Logo CSS.
 * Réactivé après le rebuild APK natif qui inclut expo-linear-gradient + react-native-svg.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { Logo } from './Logo';
import { ZelligePattern } from './ZelligePattern';

export const SplashHero: React.FC = () => {
  return (
    <LinearGradient
      colors={Colors.gradientHero as unknown as readonly [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ZelligePattern width={500} height={900} color={Colors.white} opacity={0.1} tileSize={60} />
      <View style={styles.center}>
        <Logo size={140} variant="splash" />
        <Text style={styles.brandName}>Big Boss Fitness</Text>
        <Text style={styles.greeting}>السلام عليكم</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Made in Morocco 🇲🇦</Text>
        <Text style={styles.footerSub}>شويا بشويا</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  brandName: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 28,
    color: Colors.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  greeting: {
    fontFamily: Fonts.family.arBold,
    fontSize: 22,
    color: Colors.white,
    opacity: 0.95,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  footerSub: {
    fontFamily: Fonts.family.arRegular,
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
});

export default SplashHero;
