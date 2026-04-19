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
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radii } from '../../lib/theme';

const { width } = Dimensions.get('window');

export default function EndScreen() {
  const router = useRouter();
  const logoScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, damping: 8, stiffness: 80, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleShare() {
    try {
      await Share.share({
        message: `My 2026 Wrapped — relive your year in stories. Made with Wrapped ✨`,
      });
    } catch (e) { /* ignore */ }
  }

  function handleRestart() {
    router.replace('/(tabs)/dashboard');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Background glow */}
      <View style={styles.bgGlow} />

      <Animated.View style={[styles.content, { opacity: textOpacity }]}>
        {/* Logo */}
        <Animated.View style={[styles.logoArea, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>W</Text>
          </View>
        </Animated.View>

        {/* Year */}
        <Text style={styles.yearText}>2026</Text>
        <Text style={styles.subtitleText}>Your year, unwrapped.</Text>

        {/* Service icons row */}
        <View style={styles.serviceRow}>
          {['🎧', '❤️', '🏃', '📚', '🎮'].map((emoji, i) => (
            <View key={i} style={styles.serviceBadge}>
              <Text style={styles.serviceEmoji}>{emoji}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Animated.View style={[styles.actions, { opacity: btnOpacity }]}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Text style={styles.shareBtnText}>Share Your Wrapped</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.restartBtn} onPress={handleRestart} activeOpacity={0.8}>
            <Text style={styles.restartBtnText}>Start Over</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: width * 1.8,
    height: width * 1.8,
    borderRadius: width,
    backgroundColor: colors.accentFuchsia,
    opacity: 0.06,
    top: -width * 0.5,
    left: -width * 0.4,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.accentFuchsia,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
  },
  yearText: {
    ...typography.displayLarge,
    fontSize: 96,
    lineHeight: 100,
    color: colors.primary,
    letterSpacing: -4,
    marginBottom: spacing.sm,
  },
  subtitleText: {
    ...typography.body,
    color: colors.secondary,
    marginBottom: spacing.xl,
  },
  serviceRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  serviceBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceEmoji: {
    fontSize: 20,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  shareBtn: {
    width: '100%',
    backgroundColor: colors.accentFuchsia,
    paddingVertical: 18,
    borderRadius: radii.full,
    alignItems: 'center',
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  shareBtnText: {
    ...typography.h3,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  restartBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 18,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  restartBtnText: {
    ...typography.bodyMedium,
    color: colors.secondary,
  },
});