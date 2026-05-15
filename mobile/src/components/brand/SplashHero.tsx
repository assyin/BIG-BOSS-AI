/**
 * SplashHero — Écran de loading premium "Atlas & Médina"
 *
 * Affiché pendant le chargement initial de l'app (après le splash natif).
 * Background : gradient terre Marrakech → safran
 * Pattern : zellige subtil
 * Logo : étoile zellige + BB + tagline Darija
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { Logo } from './Logo';
import { ZelligePattern } from './ZelligePattern';

const { width, height } = Dimensions.get('window');

export const SplashHero: React.FC = () => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.gradientHero as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Zellige pattern overlay */}
      <View style={StyleSheet.absoluteFillObject}>
        <ZelligePattern
          width={width}
          height={height}
          color={Colors.white}
          opacity={0.08}
          tileSize={70}
        />
      </View>
      {/* Logo + tagline */}
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
