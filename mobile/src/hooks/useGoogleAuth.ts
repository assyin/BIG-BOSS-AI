import { useEffect } from 'react';

// Dynamically load Google auth modules so the app doesn't crash if native
// expo-web-browser is not yet bundled in the client (requires a rebuild).
let Google: any = null;
let WebBrowser: any = null;
let modulesLoaded = false;
let loadError: string | null = null;

try {
  Google = require('expo-auth-session/providers/google');
  WebBrowser = require('expo-web-browser');
  if (WebBrowser?.maybeCompleteAuthSession) {
    WebBrowser.maybeCompleteAuthSession();
  }
  modulesLoaded = true;
} catch (e: any) {
  loadError = e?.message || 'Google auth native modules unavailable';
  console.log('Google auth disabled:', loadError);
}

const GOOGLE_CLIENT_IDS = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
};

/**
 * Hook that wraps expo-auth-session Google provider.
 * Returns:
 *   - promptAsync: function to trigger the Google sign-in UI
 *   - ready: true if the native module AND OAuth client IDs are configured
 */
export function useGoogleAuth(onIdToken: (idToken: string) => void) {
  // If native modules are missing, return a safe no-op
  if (!modulesLoaded || !Google) {
    return {
      promptAsync: async () => {
        throw new Error('Google auth non configure. Installe expo-web-browser et rebuild.');
      },
      ready: false,
      response: null,
    };
  }

  const hasAnyClientId = !!(
    GOOGLE_CLIENT_IDS.androidClientId ||
    GOOGLE_CLIENT_IDS.iosClientId ||
    GOOGLE_CLIENT_IDS.webClientId
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_CLIENT_IDS.androidClientId,
    iosClientId: GOOGLE_CLIENT_IDS.iosClientId,
    clientId: GOOGLE_CLIENT_IDS.webClientId,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        onIdToken(idToken);
      }
    }
  }, [response, onIdToken]);

  return {
    promptAsync,
    ready: !!request && hasAnyClientId,
    response,
  };
}
