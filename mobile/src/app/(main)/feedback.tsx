import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Platform, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import FeedbackService, { FeedbackSubmit } from '@/services/feedback.service';

/**
 * Sprint 6.5 — Écran feedback in-app.
 * Rating 1-5 stars + catégorie + texte + submit.
 */
const CATEGORIES: { key: FeedbackSubmit['category']; label: string; icon: any; color: string }[] = [
  { key: 'bug', label: '🐛 Bug', icon: 'bug-outline', color: Colors.error },
  { key: 'feature', label: '💡 Idée', icon: 'bulb-outline', color: Colors.warning },
  { key: 'general', label: '💬 Général', icon: 'chatbubble-outline', color: Colors.info },
  { key: 'praise', label: '❤️ Compliment', icon: 'heart-outline', color: Colors.primary },
];

export default function FeedbackScreen() {
  const [rating, setRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackSubmit['category']>('general');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (rating < 1) {
      Alert.alert('Note requise', 'Donne une note de 1 à 5 ⭐');
      return;
    }
    if (content.trim().length < 5) {
      Alert.alert('Message trop court', 'Décris ton retour en quelques mots');
      return;
    }

    setSubmitting(true);
    try {
      await FeedbackService.submit({
        rating,
        category,
        content: content.trim(),
      });
      Alert.alert(
        '✅ Merci !',
        'Ton retour a été envoyé. On revient vers toi rapidement 💪',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error || 'Impossible d\'envoyer le feedback');
    } finally {
      setSubmitting(false);
    }
  }, [rating, category, content]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ton avis 💬</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Aide-nous à améliorer BBF 🇲🇦</Text>
          <Text style={styles.introText}>
            Ton retour est important. Bugs, idées de features, ou juste un mot, on lit tout.
          </Text>
        </View>

        {/* Rating stars */}
        <Text style={styles.sectionLabel}>Ta note globale</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
              <Ionicons
                name={rating >= n ? 'star' : 'star-outline'}
                size={40}
                color={rating >= n ? Colors.gold : Colors.lightGray}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating === 0 ? 'Tape une étoile' :
           rating === 1 ? 'Très décevant' :
           rating === 2 ? 'Décevant' :
           rating === 3 ? 'Moyen' :
           rating === 4 ? 'Bien' : 'Excellent !'}
        </Text>

        {/* Category */}
        <Text style={styles.sectionLabel}>Catégorie</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.categoryChip,
                category === c.key && { backgroundColor: c.color, borderColor: c.color },
              ]}
              onPress={() => setCategory(c.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.categoryText,
                category === c.key && { color: Colors.white },
              ]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <Text style={styles.sectionLabel}>Détails</Text>
        <TextInput
          style={styles.contentInput}
          placeholder={
            category === 'bug' ? 'Décris le bug : étapes, écran, comportement attendu...' :
            category === 'feature' ? 'Quelle feature te ferait plaisir ?' :
            category === 'praise' ? 'Dis-nous ce que tu aimes 💪' :
            'Ton message...'
          }
          placeholderTextColor={Colors.lightGray}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={1000}
        />
        <Text style={styles.charCount}>{content.length}/1000</Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (rating === 0 || content.trim().length < 5 || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || content.trim().length < 5 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={Colors.white} />
              <Text style={styles.submitBtnText}>Envoyer</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 48 : 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { ...Typography.h4, color: Colors.dark },
  content: { padding: 16, paddingBottom: 32 },

  introCard: {
    backgroundColor: '#FAF3E4',
    borderRadius: 16, padding: 16, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: Colors.gold,
  },
  introTitle: { fontSize: Fonts.size.md, fontWeight: Fonts.weight.bold, color: Colors.dark, marginBottom: 4 },
  introText: { fontSize: Fonts.size.sm, color: Colors.gray, lineHeight: 20 },

  sectionLabel: {
    fontSize: Fonts.size.md, fontWeight: Fonts.weight.semiBold, color: Colors.dark,
    marginTop: 12, marginBottom: 10,
  },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 8 },
  ratingLabel: { textAlign: 'center', fontSize: Fonts.size.sm, color: Colors.gray, marginTop: 4 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  categoryText: { fontSize: Fonts.size.sm, color: Colors.dark, fontWeight: Fonts.weight.medium },

  contentInput: {
    backgroundColor: Colors.white,
    minHeight: 120, padding: 14, borderRadius: 12,
    fontSize: Fonts.size.base, color: Colors.dark,
    textAlignVertical: 'top',
    borderWidth: 1, borderColor: Colors.border,
  },
  charCount: { fontSize: 10, color: Colors.lightGray, textAlign: 'right', marginTop: 4 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 14,
    marginTop: 24,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  submitBtnDisabled: { backgroundColor: Colors.lightGray, shadowOpacity: 0 },
  submitBtnText: { color: Colors.white, fontSize: Fonts.size.md, fontWeight: Fonts.weight.semiBold },
});
