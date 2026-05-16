import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { Logo } from '@/components/brand/Logo';
import { ZelligePattern } from '@/components/brand/ZelligePattern';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      await login({ email: email.trim().toLowerCase(), password });
      // Check if onboarding is completed
      const { profile } = useAuthStore.getState();
      if (profile && !(profile as any).onboardingCompleted) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(main)');
      }
    } catch (error: any) {
      Alert.alert('Erreur de connexion', error?.message || 'Email ou mot de passe incorrect');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Zellige banner subtle en haut */}
      <View style={styles.zelligeBanner}>
        <ZelligePattern width={500} height={180} color={Colors.primary} opacity={0.06} tileSize={48} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Logo variant="full" size={70} />
          <Text style={styles.welcome}>Bienvenue</Text>
          <Text style={styles.welcomeAr}>مرحبا بك</Text>
          <Text style={styles.subtitle}>Heureux de te revoir, champion 💪</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="ton@email.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Ton mot de passe"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.link}>Creer un compte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <View style={styles.madeIn}>
        <Text style={styles.madeInText}>Made in Morocco 🇲🇦</Text>
        <Text style={styles.madeInSub}>شويا بشويا</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  zelligeBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    overflow: 'hidden',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  welcome: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 28,
    color: Colors.dark,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  welcomeAr: {
    fontFamily: Fonts.family.arBold,
    fontSize: 20,
    color: Colors.goldDark,
    marginTop: -2,
  },
  subtitle: {
    fontFamily: Fonts.family.regular,
    fontSize: Fonts.size.base,
    color: Colors.medium,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    fontSize: Fonts.size.md,
    fontFamily: Fonts.family.regular,
    color: Colors.dark,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Fonts.size.md,
    fontFamily: Fonts.family.displaySemiBold,
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    ...Typography.body,
    color: Colors.gray,
  },
  link: {
    ...Typography.body,
    color: Colors.primary,
    fontFamily: Fonts.family.semiBold,
  },
  madeIn: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  madeInText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: 12,
    color: Colors.medium,
    letterSpacing: 1.5,
  },
  madeInSub: {
    fontFamily: Fonts.family.arRegular,
    fontSize: 12,
    color: Colors.light,
    marginTop: 2,
  },
});
