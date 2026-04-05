import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Seances',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercices',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="nutrition-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progres',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden sub-routes */}
      <Tabs.Screen
        name="nutrition/add-meal"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="nutrition/recipes"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="nutrition/recipe-detail"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="progress/add-measurement"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="progress/compare"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="progress/report"
        options={{
          href: null,
        }}
      />
      {/* Programme sub-routes */}
      <Tabs.Screen
        name="programme/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="programme/week"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="programme/completed"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="programme/nutrition-plan"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="sessions/coach-vision"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="points/history"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="community/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="community/post"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="challenges/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="rewards/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="achievements/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="affiliation/index"
        options={{ href: null }}
      />
      {/* coach/history is handled by coach/_layout.tsx Stack */}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: Platform.OS === 'ios' ? 88 : 110,
    paddingBottom: Platform.OS === 'ios' ? 28 : 52,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.medium,
  },
});
