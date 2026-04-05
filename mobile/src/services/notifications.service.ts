import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationsService = {
  /**
   * Register for push notifications and send token to backend
   */
  async registerAsync(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'ae013a05-4971-405a-b4d3-7b9eb3ccdc3a',
      });
      const token = tokenData.data;

      // Send token to backend
      await api.post('/api/users/push-token', { token }).catch(() => {});

      // Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Big Boss Fitness',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      console.log('Push token registered:', token);
      return token;
    } catch (err) {
      console.error('Failed to get push token:', err);
      return null;
    }
  },

  /**
   * Add listeners for notification events
   */
  addListeners(
    onReceived?: (notification: Notifications.Notification) => void,
    onTapped?: (response: Notifications.NotificationResponse) => void,
  ) {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      onReceived?.(notification);
    });

    const tappedSub = Notifications.addNotificationResponseReceivedListener((response) => {
      onTapped?.(response);
    });

    return () => {
      receivedSub.remove();
      tappedSub.remove();
    };
  },
};

export default NotificationsService;
