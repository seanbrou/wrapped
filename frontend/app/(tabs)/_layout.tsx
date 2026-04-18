import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accentPurple,
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="services"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🔗</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'My Wrapped',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>✨</Text>
          ),
        }}
      />
    </Tabs>
  );
}
