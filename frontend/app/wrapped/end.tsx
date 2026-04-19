import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii, shadows, motion, SERVICE_CONFIGS } from '../../lib/theme';

const { width: W, height: H } = Dimensions.get('window');

export default function EndScreen() {
  const router = useRouter();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const yearScale = useRef(new Animated.Value(0.5)).current;
  const yearOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(30)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(20)).current;
  const orbPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ambient orb pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();

    // Entrance sequence
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(logoScale, { toValue: 1, damping: 10, stiffness: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(yearScale, { toValue: 1, damping: 8, stiffness: 80, useNativeDriver: true }),
        Animated.timing(yearOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(contentY, { toValue: 0, ...motion.springGentle, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(btnY, { toValue: 0, ...motion.springGentle, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `My 2026 Wrapped — relive your year in stories. Made with Wrapped ✨`,
      });
    } catch {}
  }

  function handleRestart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/dashboard');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Background orbs */}
      <Animated.View
        style={[
          styles.orb1,
          {
            opacity: orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.14] }),
            transform: [{ translateY: orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb2,
          {
            opacity: orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.1] }),
            transform: [{ translateX: orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
          },
        ]}
      />

      <View style={styles.content}>
        {/* Logo badge */}
        <Animated.View style={[styles.logoArea, { transform: [{ scale: logoScale }] }]}>
          <LinearGradient
            colors={[colors.accentPurple, colors.accentFuchsia]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBadge}
          >
            <Text style={styles.logoText}>W</Text>
          </LinearGradient>
        </Animated.View>

        {/* Year */}
        <Animated.Text
          style={[
            styles.yearText,
            {
              opacity: yearOpacity,
              transform: [{ scale: yearScale }],
            },
          ]}
        >
          2026
        </Animated.Text>

        {/* Subtitle */}
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentY }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.subtitle}>Your year, unwrapped.</Text>

          {/* Service icons */}
          <View style={styles.serviceRow}>
            {SERVICE_CONFIGS.map((svc, i) => (
              <View key={svc.id} style={[styles.serviceBadge, { backgroundColor: svc.iconBg }]}>
                <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actions,
            {
              opacity: btnOpacity,
              transform: [{ translateY: btnY }],
            },
          ]}
        >
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <LinearGradient
              colors={[colors.accentPurple, colors.accentFuchsia]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareBtnGradient}
            >
              <Text style={styles.shareBtnText}>Share Your Wrapped</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleRestart} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Start Over</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tertiaryBtn} activeOpacity={0.7}>
            <Text style={styles.tertiaryBtnText}>Save as PDF</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute',
    width: W * 1.4,
    height: W * 1.4,
    borderRadius: W,
    backgroundColor: colors.accentPurple,
    top: -W * 0.5,
    left: -W * 0.3,
  },
  orb2: {
    position: 'absolute',
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W,
    backgroundColor: colors.accentCyan,
    bottom: -W * 0.2,
    right: -W * 0.3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoArea: {
    marginBottom: spacing.xl,
    ...shadows.glowPurple,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
  },
  yearText: {
    fontSize: 96,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -6,
    lineHeight: 100,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.secondary,
    marginBottom: spacing.xxl,
    letterSpacing: 0.5,
  },
  serviceRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  serviceBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceEmoji: {
    fontSize: 22,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  shareBtn: {
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.glowFuchsia,
  },
  shareBtnGradient: {
    paddingVertical: 18,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  shareBtnText: {
    ...typography.bodySemibold,
    color: '#fff',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 16,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...typography.bodyMedium,
    color: colors.secondary,
  },
  tertiaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tertiaryBtnText: {
    ...typography.caption,
    color: colors.tertiary,
    letterSpacing: 1,
  },
});