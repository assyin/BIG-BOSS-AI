import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  fullscreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = 'large',
  fullscreen = false,
}) => {
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <ActivityIndicator size={size} color={Colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  message: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
  },
});

export default LoadingState;
