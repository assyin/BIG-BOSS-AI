import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useSessionStore } from '@/store/session.store';

/**
 * Sprint 3.2 — Badge "X sets en attente" / "Sync en cours" affiché en haut de l'écran session active.
 * Tap pour forcer une synchro manuelle.
 */
export function OfflineSyncIndicator() {
  const pending = useSessionStore((s) => s.pendingOpsCount);
  const isSyncing = useSessionStore((s) => s.isSyncing);
  const syncPendingOps = useSessionStore((s) => s.syncPendingOps);

  if (pending === 0 && !isSyncing) return null;

  const handleTap = () => {
    if (!isSyncing) syncPendingOps().catch(() => {});
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSyncing ? styles.syncing : styles.pending]}
      onPress={handleTap}
      activeOpacity={0.8}
      disabled={isSyncing}
    >
      {isSyncing ? (
        <>
          <ActivityIndicator size="small" color={Colors.white} />
          <Text style={styles.text}>Sync en cours…</Text>
        </>
      ) : (
        <>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.white} />
          <Text style={styles.text}>
            {pending} {pending > 1 ? 'sets en attente' : 'set en attente'} — tap pour réessayer
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 8,
  },
  pending: {
    backgroundColor: '#C84B31', // terre marrakech
  },
  syncing: {
    backgroundColor: '#4A7C59', // vert atlas
  },
  text: {
    color: Colors.white,
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
  },
});

export default OfflineSyncIndicator;
