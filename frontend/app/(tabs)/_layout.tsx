import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radii } from '../../lib/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
      {focused && <View style={styles.tabDot} />}
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
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 88,
          paddingBottom: 30,
          paddingTop: 12,
          paddingHorizontal: 16,
        },
        tabBarActiveTintColor: colors.accentFuchsia,
        tabBarInactiveTintColor: colors.tertiary,
        tabBarLabelStyle: {
          ...typography.overline,
          fontSize: 10,
          letterSpacing: 2,
          marginTop: 4,
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
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  tabIconActive: {
    backgroundColor: 'rgba(224, 64, 251, 0.1)',
  },
  tabEmoji: {
    fontSize: 20,
    opacity: 0.35,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentFuchsia,
  },
});