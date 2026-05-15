import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';

interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  fullscreen?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Oups!',
  message = 'Une erreur est survenue',
  icon = 'alert-circle-outline',
  actionLabel = 'Réessayer',
  onAction,
  fullscreen = false,
}) => {
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <Ionicons name={icon} size={56} color={Colors.error} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color={Colors.white} />
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    ...Typography.h4,
    color: Colors.dark,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 14,
  },
  buttonText: {
    ...Typography.button,
    color: Colors.white,
  },
});

export default ErrorState;
