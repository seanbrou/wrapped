import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, type, shadows, radii } from '../../lib/theme';
import LiquidGlass from '../../components/LiquidGlass';

function TabLabel({ focused, label }: { focused: boolean; label: string }) {
  return (
    <View style={styles.labelWrap}>
      <Text style={[styles.label, focused && styles.labelOn]}>{label}</Text>
      <View style={[styles.dot, focused && styles.dotOn]} />
    </View>
  );
}

function CreateButton() {
  const router = useRouter();
  return (
    <View style={styles.fabHolder} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/wizard');
        }}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityLabel="Create new recap"
      >
        <Text style={styles.fabGlyph}>+</Text>
      </Pressable>
      <Text style={styles.fabCaption}>New recap</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <LiquidGlass
              style={StyleSheet.absoluteFill as any}
              effect="frost"
              intensity={70}
              tint="light"
              radius={0}
              rim={false}
              highlight={false}
            />
            <View style={styles.barHairline} />
          </View>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tertiary,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabLabel focused={focused} label="Home" />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarButton: () => <CreateButton />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ focused }) => <TabLabel focused={focused} label="Accounts" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    height: 88,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  barHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    minWidth: 80,
  },
  label: {
    ...type.caption,
    color: colors.tertiary,
    letterSpacing: 0.6,
  },
  labelOn: {
    color: colors.primary,
    fontWeight: '700',
  },
  dot: {
    marginTop: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  dotOn: {
    backgroundColor: colors.primary,
  },

  // Center FAB
  fabHolder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  fab: {
    marginTop: -26,
    width: 62,
    height: 62,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
  fabGlyph: {
    color: colors.inverse,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '300',
    marginTop: -2,
  },
  fabCaption: {
    ...type.caption,
    color: colors.tertiary,
    marginTop: 6,
    letterSpacing: 0.6,
  },
});
