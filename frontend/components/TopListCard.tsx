import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, type, space, motion, serviceById, type StoryAccent } from '../lib/theme';

interface Item {
  rank: number;
  name: string;
  stat: string;
}
interface Props {
  title: string;
  items: Item[];
  service: string;
  accent: StoryAccent;
}

export function TopListCard({ title, items, service, accent }: Props) {
  const svc = serviceById[service];
  const header = useRef(new Animated.Value(0)).current;
  const rows = useRef(items.map(() => new Animated.Value(0))).current;

  // Beat animation for Spotify
  const beat1 = useRef(new Animated.Value(1)).current;
  const beat2 = useRef(new Animated.Value(1)).current;
  const beat3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(header, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(130, rows.map(r =>
        Animated.spring(r, { toValue: 1, ...motion.springSoft, useNativeDriver: true })
      )),
    ]).start();
  }, []);

  useEffect(() => {
    if (service !== 'spotify') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(beat1, { toValue: 1.6, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(beat2, { toValue: 1.3, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(beat3, { toValue: 1.5, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(beat1, { toValue: 1, duration: 350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(beat2, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(beat3, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.delay(200),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [service]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[accent.fg + '00', accent.fg + '06']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: header,
            transform: [{
              translateY: header.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
            }],
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: accent.fg }]}>
          {svc?.name ?? service}
        </Text>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: accent.fg }]}>
            {title}
          </Text>
          {service === 'spotify' && (
            <View style={styles.beatRow}>
              <Animated.View style={[styles.beatBar, { backgroundColor: accent.fg, transform: [{ scaleY: beat1 }] }]} />
              <Animated.View style={[styles.beatBar, { backgroundColor: accent.fg, transform: [{ scaleY: beat2 }] }]} />
              <Animated.View style={[styles.beatBar, { backgroundColor: accent.fg, transform: [{ scaleY: beat3 }] }]} />
            </View>
          )}
        </View>
      </Animated.View>

      <View style={styles.list}>
        {items.map((item, idx) => (
          <Animated.View
            key={item.rank}
            style={[
              styles.row,
              idx < items.length - 1 && { borderBottomColor: accent.fg + '18', borderBottomWidth: StyleSheet.hairlineWidth },
              {
                opacity: rows[idx],
                transform: [{
                  translateY: rows[idx].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
                }, {
                  scale: rows[idx].interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }),
                }],
              },
            ]}
          >
            <Text style={[styles.rank, { color: accent.fg }]}>
              {String(item.rank).padStart(2, '0')}
            </Text>
            <View style={styles.rowBody}>
              <Text
                style={[styles.name, { color: accent.fg }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.name}
              </Text>
              <Text style={[styles.stat, { color: accent.fg }]}>
                {item.stat}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
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
  header: {
    marginBottom: space.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    ...type.eyebrow,
    opacity: 0.7,
    marginBottom: space.sm,
  },
  title: {
    ...type.display,
  },
  beatRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 16,
  },
  beatBar: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
    opacity: 0.5,
  },
  list: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  rank: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -2,
    width: 66,
    opacity: 0.55,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  stat: {
    ...type.bodySmall,
    opacity: 0.65,
  },
});
