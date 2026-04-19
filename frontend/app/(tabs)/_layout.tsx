import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radii } from '../../lib/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
        {emoji}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 20,
          paddingTop: 10,
          paddingHorizontal: 8,
        },
        tabBarActiveTintColor: colors.accentFuchsia,
        tabBarInactiveTintColor: colors.tertiary,
        tabBarLabelStyle: {
          ...typography.caption,
          letterSpacing: 1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="services"
        options={{
          title: 'CONNECT',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚡" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'WRAPPED',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎁" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  tabIconActive: {
    backgroundColor: 'rgba(224, 64, 251, 0.15)',
  },
  tabEmoji: {
    fontSize: 18,
    opacity: 0.4,
  },
  tabEmojiActive: {
    opacity: 1,
  },
});