import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register, isLoading } = useAuthStore();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    if (!email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caracteres';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      router.replace('/(auth)/onboarding');
    } catch (err: any) {
      Alert.alert("Erreur d'inscription", err?.message || "Impossible de creer le compte");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo variant="full" size={64} />
            <Text style={styles.subtitle}>Creer un compte</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nom complet"
              placeholder="Ton nom"
              leftIcon="person-outline"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={errors.name}
            />

            <Input
              label="Email"
              placeholder="ton@email.com"
              leftIcon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <Input
              label="Mot de passe"
              placeholder="Min. 6 caracteres"
              leftIcon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              isPassword
              error={errors.password}
            />

            <Input
              label="Confirmer le mot de passe"
              placeholder="Retape ton mot de passe"
              leftIcon="lock-closed-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              error={errors.confirmPassword}
            />

            <Button
              title="Creer mon compte"
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              size="lg"
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Deja un compte ? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.link}>Se connecter</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.madeIn}>
              <Text style={styles.madeInText}>Made in Morocco 🇲🇦</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 14,
  },
  title: {
    ...Typography.h3,
    color: Colors.dark,
    marginBottom: 6,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.gray,
  },
  form: {
    width: '100%',
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
    marginTop: 24,
  },
  madeInText: {
    fontFamily: Fonts.family.regular,
    fontSize: 12,
    color: Colors.gray,
    letterSpacing: 1.5,
  },
});
