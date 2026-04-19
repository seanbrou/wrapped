import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
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

// Editorial ranked list. No icons, no cards. Large rank numeral +
// wordmark name + small stat. Each row fades in as a staggered reveal.
export function TopListCard({ title, items, service, accent }: Props) {
  const svc = serviceById[service];
  const header = useRef(new Animated.Value(0)).current;
  const rows = useRef(items.map(() => new Animated.Value(0))).current;

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

  return (
    <View style={styles.root}>
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
        <Text style={[styles.title, { color: accent.fg }]}>
          {title}
        </Text>
      </Animated.View>

      <View style={styles.list}>
        {items.map((item, idx) => (
          <Animated.View
            key={item.rank}
            style={[
              styles.row,
              idx < items.length - 1 && { borderBottomColor: accent.fg + '22', borderBottomWidth: StyleSheet.hairlineWidth },
              {
                opacity: rows[idx],
                transform: [{
                  translateY: rows[idx].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
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
  eyebrow: {
    ...type.eyebrow,
    opacity: 0.7,
    marginBottom: space.sm,
  },
  title: {
    ...type.display,
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
