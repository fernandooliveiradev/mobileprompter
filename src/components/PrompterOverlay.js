import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PROMPTER_MODES } from '../utils/scriptUtils';
import { BRAND } from '../theme/brand';

export function PrompterOverlay({
  topOffset,
  height,
  bgOpacity,
  prompterMode,
  isVoiceMode,
  isSpeakingNow,
  isRecording,
  isScrolling,
  phrases,
  script,
  currentPhraseIdx,
  phraseProgress,
  fontSize,
  phraseScrollRef,
  scrollRef,
  phraseLayoutsRef,
  scrollOffsetRef,
  contentHeightRef,
  containerHeightRef,
  updateMaxScroll,
  onScrollToPhrase,
  onResetScroll,
  onToggleScroll,
  onOpenVoiceSettings,
}) {
  const activeModeObj = PROMPTER_MODES.find((m) => m.id === prompterMode) || PROMPTER_MODES[0];

  return (
    <View
      style={[
        styles.prompterWrapper,
        {
          top: topOffset,
          height,
          backgroundColor: `rgba(7, 7, 20, ${bgOpacity})`,
        },
        isSpeakingNow && isVoiceMode && styles.prompterWrapperSpeaking,
      ]}
      onLayout={(e) => {
        containerHeightRef.current = e.nativeEvent.layout.height;
        updateMaxScroll();
      }}
    >
      {/* Barra Superior Editorial / Instrumento */}
      <View style={styles.prompterTopBar}>
        <TouchableOpacity
          style={styles.modeTrigger}
          activeOpacity={0.75}
          onPress={onOpenVoiceSettings}
        >
          <View
            style={[
              styles.statusDot,
              isVoiceMode && isSpeakingNow && styles.statusDotSpeaking,
              isRecording && !isVoiceMode && styles.statusDotRecording,
            ]}
          />
          <Text style={styles.modeStatusText}>
            {activeModeObj.label.toUpperCase()}
          </Text>
          <Feather name="chevron-down" size={12} color={BRAND.muted} />
        </TouchableOpacity>

        {/* Controles essenciais em grade hairline */}
        <View style={styles.playbackActions}>
          {prompterMode === 'voice_phrases' && (
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => onScrollToPhrase(Math.max(0, currentPhraseIdx - 1))}
              >
                <Feather name="chevron-up" size={14} color={BRAND.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() =>
                  onScrollToPhrase(Math.min(phrases.length - 1, currentPhraseIdx + 1))
                }
              >
                <Feather name="chevron-down" size={14} color={BRAND.white} />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.iconBtn} onPress={onResetScroll}>
            <Feather name="rotate-ccw" size={13} color={BRAND.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, styles.playBtn, isScrolling && styles.playBtnActive]}
            onPress={onToggleScroll}
          >
            <Feather
              name={isScrolling ? 'pause' : 'play'}
              size={13}
              color={isScrolling ? BRAND.ink : BRAND.white}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* MODO 1: FRASES POR VOZ */}
      {prompterMode === 'voice_phrases' ? (
        <ScrollView
          ref={phraseScrollRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.phraseListContent}
          showsVerticalScrollIndicator={false}
        >
          {phrases.map((phrase, index) => {
            const isCurrent = index === currentPhraseIdx;
            const isPast = index < currentPhraseIdx;
            const num = String(index + 1).padStart(2, '0');
            const total = String(phrases.length).padStart(2, '0');
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.75}
                onPress={() => onScrollToPhrase(index)}
                onLayout={(e) => {
                  phraseLayoutsRef.current[index] = e.nativeEvent.layout.y;
                }}
                style={[
                  styles.phraseCard,
                  isCurrent && styles.phraseCardCurrent,
                  isCurrent && isSpeakingNow && styles.phraseCardSpeaking,
                  isPast && styles.phraseCardPast,
                ]}
              >
                <View style={styles.phraseHeaderRow}>
                  <Text
                    style={[
                      styles.phraseIndexBadge,
                      isCurrent && styles.phraseIndexBadgeActive,
                    ]}
                  >
                    {num} / {total}
                  </Text>
                  {isCurrent && isScrolling && (
                    <Text
                      style={[
                        styles.phraseVoiceHint,
                        isSpeakingNow && styles.phraseVoiceHintActive,
                      ]}
                    >
                      {isSpeakingNow ? 'OUVINDO' : 'AGUARDANDO VOZ'}
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.prompterText,
                    {
                      fontSize: isCurrent ? fontSize : Math.max(16, fontSize - 4),
                      lineHeight: (isCurrent ? fontSize : Math.max(16, fontSize - 4)) * 1.34,
                      color: isCurrent
                        ? BRAND.white
                        : isPast
                        ? 'rgba(170, 168, 186, 0.3)'
                        : 'rgba(245, 243, 255, 0.5)',
                    },
                  ]}
                >
                  {phrase}
                </Text>

                {isCurrent && (
                  <View style={styles.phraseProgressTrack}>
                    <View
                      style={[
                        styles.phraseProgressFill,
                        {
                          width: `${Math.round(phraseProgress * 100)}%`,
                          backgroundColor: isSpeakingNow ? BRAND.gold : BRAND.lilac,
                        },
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: height * 0.75 }} />
        </ScrollView>
      ) : (
        /* MODO 2 & 3: ROLAGEM CONTÍNUA */
        <>
          <View
            pointerEvents="none"
            style={[styles.readingFocusHighlight, { height: fontSize * 1.6 }]}
          />
          <ScrollView
            ref={scrollRef}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            }}
            onContentSizeChange={(_, h) => {
              contentHeightRef.current = h;
              updateMaxScroll();
            }}
          >
            <Text style={[styles.prompterText, { fontSize, lineHeight: fontSize * 1.38 }]}>
              {script}
            </Text>
            <View style={{ height: height * 0.75 }} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  prompterWrapper: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: BRAND.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  prompterWrapperSpeaking: {
    borderColor: 'rgba(255, 199, 102, 0.45)',
  },
  prompterTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    backgroundColor: 'rgba(4, 4, 11, 0.65)',
  },
  modeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 3,
    paddingRight: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.dim,
  },
  statusDotSpeaking: {
    backgroundColor: BRAND.gold,
  },
  statusDotRecording: {
    backgroundColor: BRAND.rec,
  },
  modeStatusText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  playbackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: BRAND.radius,
    backgroundColor: 'rgba(245, 243, 255, 0.04)',
    borderWidth: 1,
    borderColor: BRAND.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    borderColor: BRAND.lineStrong,
    backgroundColor: BRAND.violetSoft,
  },
  playBtnActive: {
    backgroundColor: BRAND.white,
    borderColor: BRAND.white,
  },
  scrollArea: {
    flex: 1,
  },
  phraseListContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  phraseCard: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: BRAND.radius,
    marginBottom: 6,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  phraseCardCurrent: {
    backgroundColor: 'rgba(134, 87, 255, 0.1)',
    borderLeftColor: BRAND.lilac,
  },
  phraseCardSpeaking: {
    borderLeftColor: BRAND.gold,
    backgroundColor: 'rgba(255, 199, 102, 0.08)',
  },
  phraseCardPast: {
    opacity: 0.45,
  },
  phraseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  phraseIndexBadge: {
    fontFamily: BRAND.fontMono,
    color: BRAND.dim,
    fontSize: 10,
    letterSpacing: 1,
  },
  phraseIndexBadgeActive: {
    color: BRAND.gold,
  },
  phraseVoiceHint: {
    fontFamily: BRAND.fontMono,
    color: BRAND.muted,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  phraseVoiceHintActive: {
    color: BRAND.gold,
  },
  phraseProgressTrack: {
    height: 2,
    backgroundColor: 'rgba(218, 210, 255, 0.14)',
    marginTop: 9,
    overflow: 'hidden',
  },
  phraseProgressFill: {
    height: '100%',
  },
  readingFocusHighlight: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(134, 87, 255, 0.08)',
    borderLeftWidth: 2,
    borderLeftColor: BRAND.gold,
    zIndex: 5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  prompterText: {
    fontFamily: BRAND.fontDisplay,
    color: BRAND.white,
    fontWeight: '600',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(4, 4, 11, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
