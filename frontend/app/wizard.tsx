import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  colors, type, space, radii,
  SERVICE_CONFIGS, serviceById, layout,
} from '../lib/theme';
import { api } from '../lib/api';
import { TEMPLATES, Template, PERIODS } from '../lib/mockData';
import Confetti from '../components/Confetti';
import LiquidGlass from '../components/LiquidGlass';

const ACCENT_FG: Record<string, string> = {
  mint: colors.mint, red: colors.red, amber: colors.amber,
  sky: colors.sky, lilac: colors.lilac, coral: colors.coral,
};

const STEPS = ['Template', 'Apps', 'Range', 'Go'] as const;
type StepIdx = 0 | 1 | 2 | 3;

const { width: W, height: WIZ_H } = Dimensions.get('window');
const WIZ_BOTTOM_OFF = Math.round(WIZ_H * 0.38);
const WIZ_BOTTOM_H = Math.round(WIZ_H * 0.62);

export default function Wizard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string }>();

  const [step, setStep] = useState<StepIdx>(0);
  const [templateId, setTemplateId] = useState<string | null>(
    typeof params.templateId === 'string' ? params.templateId : null,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>('year');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;

  // Hydrate services + preselect from template if one was passed in
  useEffect(() => {
    api.listServices().then(list => {
      const ids = list.filter(s => s.isConnected).map(s => s.id);
      setConnectedIds(ids);

      if (templateId) {
        const t = TEMPLATES.find(x => x.id === templateId);
        if (t) {
          const preselect = t.services.length > 0
            ? t.services.filter(s => ids.includes(s))
            : ids;
          setSelected(preselect);
          // Skip straight to apps step so the user can confirm
          setStep(1);
        }
      }
    });
  }, [templateId]);

  useEffect(() => {
    Animated.timing(stepAnim, {
      toValue: step,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [step, stepAnim]);

  const template = useMemo(
    () => (templateId ? TEMPLATES.find(t => t.id === templateId) : null),
    [templateId],
  );
  const accentFg = template ? (ACCENT_FG[template.accentKey] ?? colors.primary) : colors.primary;

  function pickTemplate(t: Template) {
    Haptics.selectionAsync();
    setTemplateId(t.id);
    const preselect = t.services.length > 0
      ? t.services.filter(s => connectedIds.includes(s))
      : connectedIds;
    setSelected(preselect);
    setStep(1);
  }

  function toggleService(id: string) {
    Haptics.selectionAsync();
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  function back() {
    if (step === 0) return close();
    setStep((step - 1) as StepIdx);
  }

  function close() {
    if (router.canGoBack()) router.back();
  }

  function next() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 3) setStep((step + 1) as StepIdx);
  }

  async function generate() {
    if (selected.length === 0 || generating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setGenerating(true);
    progress.setValue(0);

    try {
      const result = await api.generateWrapped(selected, {
        templateId: template?.id,
        templateName: template?.name ?? 'Custom mix',
        accentKey: template?.accentKey ?? 'lilac',
        period,
        onSyncProgress: ({ stage, completed, total }) => {
          if (stage === 'syncing') {
            progress.setValue(total > 0 ? completed / (total + 1) : 0.5);
            return;
          }

          progress.setValue(0.92);
        },
      });
      Animated.timing(progress, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      router.replace(`/wrapped/${result.sessionId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wrapped generation failed.';
      Alert.alert('Could not generate recap', message);
      setGenerating(false);
    }
  }

  const canAdvance =
    (step === 0 && !!templateId) ||
    (step === 1 && selected.length > 0) ||
    (step === 2 && !!period);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.grabberWrap}>
        <View style={styles.grabber} />
      </View>

      {/* ─── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>{step === 0 ? 'Close' : 'Back'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New recap</Text>
        <Pressable onPress={close} hitSlop={12} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { textAlign: 'right' }]}>Cancel</Text>
        </Pressable>
      </View>

      {/* ─── Progress bar ────────────────────────────────────── */}
      <View style={styles.progress}>
        {STEPS.map((_, i) => {
          const active = i <= step;
          return (
            <View
              key={i}
              style={[
                styles.progressSeg,
                active && { backgroundColor: colors.primary },
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.progressLabel}>
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </Text>

      {/* ─── Body ────────────────────────────────────────────── */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <>
            <Text style={styles.title}>Pick a template.</Text>
            <Text style={styles.subtitle}>
              Start with a preset, or build your own mix.
            </Text>
            <View style={styles.templateList}>
              {TEMPLATES.map(t => {
                const on = templateId === t.id;
                const fg = ACCENT_FG[t.accentKey] ?? colors.primary;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => pickTemplate(t)}
                    style={({ pressed }) => [
                      styles.templateOption,
                      on && { borderColor: fg, borderWidth: 2 },
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={[styles.templateSwatch, { backgroundColor: fg }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.templateOptionTop}>
                        <Text style={styles.templateOptionName}>{t.name}</Text>
                        <Text style={styles.templateOptionTag}>{t.tag}</Text>
                      </View>
                      <Text style={styles.templateOptionBlurb}>{t.blurb}</Text>
                    </View>
                    <Text style={[styles.templateOptionChev, on && { color: fg }]}>
                      {on ? '✓' : '›'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title}>Which apps?</Text>
            <Text style={styles.subtitle}>
              {template
                ? `We preselected the apps for ${template.name}. Toggle any off if you like.`
                : 'Pick the apps you want in this recap.'}
            </Text>
            <View style={styles.servicesList}>
              {SERVICE_CONFIGS.map(svc => {
                const on = selected.includes(svc.id);
                const linked = connectedIds.includes(svc.id);
                return (
                  <Pressable
                    key={svc.id}
                    onPress={() => linked && toggleService(svc.id)}
                    disabled={!linked}
                    style={({ pressed }) => [
                      styles.serviceRow,
                      pressed && linked && styles.rowPressed,
                      !linked && styles.serviceRowDisabled,
                    ]}
                  >
                    <View style={[styles.serviceMark, { backgroundColor: svc.color }]}>
                      <Text style={styles.serviceMarkText}>{svc.mark}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{svc.name}</Text>
                      <Text style={styles.serviceTag}>
                        {linked ? svc.tagline : 'Not linked — connect in Accounts first'}
                      </Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      on && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}>
                      {on && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Pick a range.</Text>
            <Text style={styles.subtitle}>
              How far back should we look? Demo currently uses sample full-year data.
            </Text>
            <View style={styles.rangeList}>
              {PERIODS.map(p => {
                const on = period === p.value;
                return (
                  <Pressable
                    key={p.value}
                    onPress={() => { Haptics.selectionAsync(); setPeriod(p.value); }}
                    style={({ pressed }) => [
                      styles.rangeOption,
                      on && styles.rangeOptionOn,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View>
                      <Text style={[styles.rangeLabel, on && styles.rangeLabelOn]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.rangeCaption, on && styles.rangeCaptionOn]}>
                        {p.value === 'year' && 'From Jan 1 through today'}
                        {p.value === '6months' && 'The last six months'}
                        {p.value === 'all' && 'Everything we have on file'}
                      </Text>
                    </View>
                    <View style={[
                      styles.radio,
                      on && { borderColor: colors.primary },
                    ]}>
                      {on && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 3 && (
          <View style={styles.reviewWrap}>
            <Confetti mode="drift" count={30} bandHeight={520} seed={81} />
            <Confetti
              mode="drift"
              count={44}
              seed={93}
              bandOffset={WIZ_BOTTOM_OFF}
              bandHeight={WIZ_BOTTOM_H}
              style={{ opacity: 0.85 }}
            />
            <Text style={styles.title}>Ready to roll.</Text>
            <Text style={styles.subtitle}>Here's what we're about to generate.</Text>

            <LiquidGlass
              style={styles.reviewCard}
              effect="liquid"
              elevated
              intensity={88}
              color={`${accentFg}30`}
              tint="tinted"
              radius={radii.xl}
            >
              <View style={[styles.reviewSwatch, { backgroundColor: accentFg }]} />
              <Text style={styles.reviewName}>{template?.name ?? 'Custom mix'}</Text>
              <Text style={styles.reviewBlurb}>
                {template?.blurb ?? 'Your hand-picked apps, your choice of range.'}
              </Text>

              <View style={styles.reviewRule} />

              <Text style={styles.reviewLabel}>Apps</Text>
              <View style={styles.reviewChips}>
                {selected.map(id => {
                  const svc = serviceById[id];
                  if (!svc) return null;
                  return (
                    <View key={id} style={styles.reviewChip}>
                      <View style={[styles.reviewChipDot, { backgroundColor: svc.color }]} />
                      <Text style={styles.reviewChipText}>{svc.name}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.reviewLabel}>Range</Text>
              <Text style={styles.reviewValue}>
                {PERIODS.find(p => p.value === period)?.label ?? 'This year'}
              </Text>

              <Text style={styles.reviewLabel}>Length</Text>
              <Text style={styles.reviewValue}>
                ~{Math.max(5, selected.length * 3)} screens
              </Text>
            </LiquidGlass>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ─── Footer CTA ──────────────────────────────────────── */}
      <View style={styles.footer}>
        {generating && (
          <View style={styles.genTrack}>
            <Animated.View
              style={[styles.genFill, {
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]}
            />
          </View>
        )}
        {step < 3 ? (
          <Pressable
            onPress={next}
            disabled={!canAdvance}
            style={({ pressed }) => [
              pressed && styles.ctaPressed,
            ]}
          >
            <LiquidGlass
              style={[!canAdvance ? styles.ctaDisabled : styles.cta]}
              effect="liquid"
              intensity={!canAdvance ? 40 : 92}
              tint="light"
              radius={radii.pill}
              rim
              highlight
              elevated={canAdvance}
            >
              <Text style={[styles.ctaText, !canAdvance && styles.ctaTextDisabled]}>
                {step === 0 ? 'Continue' : step === 1 ? 'Set the range' : 'Review'}
              </Text>
            </LiquidGlass>
          </Pressable>
        ) : (
          <Pressable
            onPress={generate}
            disabled={generating || selected.length === 0}
            style={({ pressed }) => [
              pressed && styles.ctaPressed,
            ]}
          >
            <LiquidGlass
              style={[!(generating || selected.length === 0) ? styles.cta : styles.ctaDisabled]}
              effect="liquid"
              intensity={(generating || selected.length === 0) ? 40 : 92}
              tint="light"
              radius={radii.pill}
              rim
              highlight
              elevated={!generating && selected.length > 0}
            >
              <Text style={[
                styles.ctaText,
                (selected.length === 0) && styles.ctaTextDisabled,
              ]}>
                {generating ? 'Generating your recap…' : 'Generate recap'}
              </Text>
            </LiquidGlass>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: layout.screen,

  grabberWrap: {
    paddingTop: 8,
    alignItems: 'center',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairlineStrong,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  headerBtn: {
    minWidth: 60,
  },
  headerBtnText: {
    ...type.bodySmallMedium,
    color: colors.secondary,
  },
  headerTitle: {
    ...type.titleSmall,
    color: colors.primary,
  },

  // Progress
  progress: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: space.lg,
    marginBottom: 8,
  },
  progressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.hairlineStrong,
  },
  progressLabel: {
    ...type.caption,
    color: colors.tertiary,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  title: {
    ...type.display,
    color: colors.primary,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1.5,
  },
  subtitle: {
    ...type.body,
    color: colors.secondary,
    marginTop: space.md,
    marginBottom: space.xl,
    maxWidth: 360,
  },

  rowPressed: { opacity: 0.7 },

  // Template step
  templateList: { gap: space.sm },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  templateSwatch: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  templateOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.sm,
  },
  templateOptionName: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  templateOptionTag: {
    ...type.caption,
    color: colors.tertiary,
  },
  templateOptionBlurb: {
    ...type.bodySmall,
    color: colors.secondary,
    marginTop: 2,
  },
  templateOptionChev: {
    ...type.title,
    color: colors.tertiary,
    width: 20,
    textAlign: 'center',
  },

  // Services step
  servicesList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  serviceRowDisabled: { opacity: 0.45 },
  serviceMark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceMarkText: {
    color: colors.inverse,
    fontWeight: '700',
    fontSize: 14,
  },
  serviceName: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  serviceTag: {
    ...type.caption,
    color: colors.tertiary,
    marginTop: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    color: colors.inverse,
    fontSize: 14,
    fontWeight: '700',
  },

  // Range step
  rangeList: { gap: space.sm },
  rangeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  rangeOptionOn: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  rangeLabel: {
    ...type.titleSmall,
    color: colors.primary,
  },
  rangeLabelOn: {
    color: colors.primary,
  },
  rangeCaption: {
    ...type.bodySmall,
    color: colors.tertiary,
    marginTop: 2,
  },
  rangeCaptionOn: { color: colors.secondary },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  // Review step
  reviewWrap: {
    position: 'relative',
  },
  reviewCard: {
    padding: space.lg,
  },
  reviewSwatch: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    marginBottom: space.md,
  },
  reviewName: {
    ...type.title,
    color: colors.primary,
  },
  reviewBlurb: {
    ...type.bodySmall,
    color: colors.secondary,
    marginTop: 4,
  },
  reviewRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginVertical: space.lg,
  },
  reviewLabel: {
    ...type.eyebrow,
    color: colors.tertiary,
    marginBottom: 6,
    marginTop: space.md,
  },
  reviewValue: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  reviewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundAlt,
  },
  reviewChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reviewChipText: {
    ...type.caption,
    color: colors.primary,
  },

  // Footer
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    backgroundColor: colors.background,
  },
  genTrack: {
    height: 2,
    backgroundColor: colors.hairline,
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  genFill: {
    height: 2,
    backgroundColor: colors.primary,
  },
  cta: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  ctaText: {
    ...type.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  ctaTextDisabled: {
    color: colors.tertiary,
  },
});
