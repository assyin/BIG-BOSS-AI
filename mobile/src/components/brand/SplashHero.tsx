/**
 * SplashHero — Écran de loading "Atlas & Médina"
 *
 * Note: utilise un fond solide (Colors.primary) au lieu du gradient
 * tant que l'APK n'a pas expo-linear-gradient compilé en natif.
 * Quand on rebuild l'APK avec expo-linear-gradient, on pourra remettre le gradient.
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '@/constants/colors';
import { Logo } from './Logo';
import { ZelligePattern } from './ZelligePattern';

const { width, height } = Dimensions.get('window');

export const SplashHero: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <ZelligePattern
          width={width}
          height={height}
          color={Colors.white}
          opacity={0.08}
          tileSize={70}
        />
      </View>
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
