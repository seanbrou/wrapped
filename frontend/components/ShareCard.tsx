import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable, Share, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, type, space, radii, motion, type StoryAccent } from '../lib/theme';

const { width: W } = Dimensions.get('window');

interface Props {
  stat: string;
  headline: string;
  service: string;
  accent: StoryAccent;
  onShare?: () => Promise<void> | void;
}

export function ShareCard({ stat, headline, accent, onShare }: Props) {
  const mark = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const detail = useRef(new Animated.Value(0)).current;
  const cta = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(mark, { toValue: 1, ...motion.springSoft, useNativeDriver: true }),
      Animated.timing(title, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(detail, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(cta, { toValue: 1, ...motion.springSoft, useNativeDriver: true }),
    ]).start();

    // Subtle glow pulse on the CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function share() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (onShare) {
        await onShare();
        return;
      }
      await Share.share({
        message: `${headline}\n${stat}\nMade with Wrapped.`,
      });
    } catch {}
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[accent.fg + '00', accent.fg + '08']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View
        style={[
          styles.markRow,
          {
            opacity: mark,
            transform: [{
              translateY: mark.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
            }],
          },
        ]}
      >
        <Text style={[styles.mark, { color: accent.fg }]}>wrapped.</Text>
        <Text style={[styles.year, { color: accent.fg }]}>2026</Text>
      </Animated.View>

      <View style={styles.center}>
        <Animated.Text
          style={[
            styles.title,
            {
              color: accent.fg,
              opacity: title,
              transform: [{
                translateY: title.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
              }],
            },
          ]}
        >
          {headline}
        </Animated.Text>

        <Animated.View
          style={[styles.divider, { backgroundColor: accent.fg, opacity: title.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.4],
          }) }]}
        />

        <Animated.Text
          style={[
            styles.detail,
            {
              color: accent.fg,
              opacity: detail,
            },
          ]}
        >
          {stat}
        </Animated.Text>
      </View>

      <Animated.View
        style={[
          styles.footer,
          {
            opacity: cta,
            transform: [{
              translateY: cta.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
            }],
          },
        ]}
      >
        <Pressable
          onPress={share}
          style={({ pressed }) => [
            styles.shareBtn,
            { backgroundColor: accent.fg },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Animated.View
            style={[
              styles.btnGlow,
              {
                backgroundColor: accent.fg,
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
              },
            ]}
          />
          <Text style={[styles.shareText, { color: accent.bg }]}>Share your year</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: 110,
    paddingBottom: 80,
  },
  markRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mark: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  year: {
    ...type.eyebrow,
    fontSize: 11,
    opacity: 0.75,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  title: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '800',
    letterSpacing: -2.4,
    includeFontPadding: false,
    paddingTop: 4,
  },
  divider: {
    width: 48,
    height: 2,
    borderRadius: 1,
  },
  detail: {
    ...type.body,
    opacity: 0.82,
    maxWidth: W - space.lg * 2 - 20,
  },
  footer: {
    alignItems: 'stretch',
  },
  shareBtn: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  btnGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  shareText: {
    ...type.bodyMedium,
    fontWeight: '700',
    letterSpacing: -0.1,
    zIndex: 1,
  },
});
