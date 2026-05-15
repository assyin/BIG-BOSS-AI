import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={Colors.lightGray} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {onAction && actionLabel && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.action}>{actionLabel}</Text>
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
    gap: 8,
  },
  title: {
    ...Typography.body,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 8,
  },
  message: {
    ...Typography.caption,
    color: Colors.lightGray,
    textAlign: 'center',
    lineHeight: 18,
  },
  action: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: Fonts.weight.semiBold,
    marginTop: 8,
  },
});

export default EmptyState;
