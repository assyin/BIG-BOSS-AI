import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { SplashHero } from '@/components/brand/SplashHero';

export default function Index() {
  const { isAuthenticated, isLoading, profile, checkAuth } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setChecked(true));
  }, []);

  if (!checked || isLoading) {
    return <SplashHero />;
  }

  if (isAuthenticated) {
    if (profile && !(profile as any).onboardingCompleted) {
      return <Redirect href="/(auth)/onboarding" />;
    }
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
