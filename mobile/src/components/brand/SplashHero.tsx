/**
 * SplashHero — Écran de loading "Atlas & Médina"
 *
 * Note: fallback temporaire (sans pattern zellige ni gradient) tant que
 * l'APK ne contient pas expo-linear-gradient ni react-native-svg natifs.
 * Quand l'APK est rebuild, réactiver ZelligePattern + LinearGradient.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Logo } from './Logo';

export const SplashHero: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Logo size={140} variant="splash" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SplashHero;
