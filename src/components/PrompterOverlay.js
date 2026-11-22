import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { BRAND } from '../theme/brand';

export function PrompterOverlay({
  topOffset,
  height,
  bgOpacity,
  scrollMode,
  isRecording,
  isScrolling,
  script,
  phrases,
  currentPhraseIdx,
  phraseProgress,
  fontSize,
  textAlign,
  scrollRef,
  phraseScrollRef,
  phraseLayoutsRef,
  scrollOffsetRef,
  contentHeightRef,
  containerHeightRef,
  updateMaxScroll,
  onSelectPhrase,
}) {
  const lineHeight = fontSize * 1.38;

  return (
    <View
      style={[
        styles.prompterWrapper,
        {
          top: topOffset,
          height,
          backgroundColor: `rgba(7, 7, 20, ${bgOpacity})`,
        },
        isScrolling && !isRecording && styles.prompterWrapperActive,
        isRecording && styles.prompterWrapperRecording,
      ]}
      onLayout={(e) => {
        containerHeightRef.current = e.nativeEvent.layout.height;
        updateMaxScroll();
      }}
    >
      {/* Filete de 2px no topo indicando status sem atrapalhar a leitura */}
      <View
        style={[
          styles.topAccentHairline,
          isScrolling && !isRecording && { backgroundColor: BRAND.gold },
          isRecording && { backgroundColor: BRAND.rec },
        ]}
      />

      {scrollMode === 'phrases' ? (
        <ScrollView
          ref={phraseScrollRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.phraseListContent}
          showsVerticalScrollIndicator={false}
        >
          {phrases.map((phrase, index) => {
            const isCurrent = index === currentPhraseIdx;
            const isPast = index < currentPhraseIdx;
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.75}
                onPress={() => onSelectPhrase(index)}
                onLayout={(e) => {
                  phraseLayoutsRef.current[index] = e.nativeEvent.layout.y;
                }}
                style={[
                  styles.phraseCard,
                  isCurrent && styles.phraseCardCurrent,
                  isPast && styles.phraseCardPast,
                ]}
              >
                <Text
                  style={[
                    styles.prompterText,
                    {
                      fontSize,
                      lineHeight,
                      textAlign,
                      color: isCurrent
                        ? BRAND.white
                        : isPast
                        ? 'rgba(170, 168, 186, 0.24)'
                        : 'rgba(245, 243, 255, 0.42)',
                    },
                  ]}
                >
                  {phrase}
                </Text>

                {isCurrent && isScrolling && (
                  <View style={styles.phraseProgressTrack}>
                    <View
                      style={[
                        styles.phraseProgressFill,
                        { width: `${Math.round(phraseProgress * 100)}%` },
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: height * 0.78 }} />
        </ScrollView>
      ) : (
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
            <Text
              style={[
                styles.prompterText,
                { fontSize, lineHeight, textAlign },
              ]}
            >
              {script || '(Roteiro vazio — toque em Roteiro para escrever)'}
            </Text>
            <View style={{ height: height * 0.78 }} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  prompterWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 0,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
  },
  prompterWrapperActive: {
    borderBottomColor: 'rgba(255, 199, 102, 0.4)',
  },
  prompterWrapperRecording: {
    borderBottomColor: 'rgba(239, 68, 68, 0.4)',
  },
  topAccentHairline: {
    height: 2,
    width: '100%',
    backgroundColor: 'rgba(198, 174, 255, 0.22)',
  },
  readingFocusHighlight: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(134, 87, 255, 0.08)',
    borderLeftWidth: 2,
    borderLeftColor: BRAND.gold,
    zIndex: 5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  phraseListContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  phraseCard: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  phraseCardCurrent: {
    backgroundColor: 'rgba(134, 87, 255, 0.1)',
    borderLeftColor: BRAND.gold,
  },
  phraseCardPast: {
    opacity: 0.45,
  },
  phraseProgressTrack: {
    height: 2,
    backgroundColor: 'rgba(218, 210, 255, 0.14)',
    marginTop: 8,
    overflow: 'hidden',
  },
  phraseProgressFill: {
    height: '100%',
    backgroundColor: BRAND.gold,
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
