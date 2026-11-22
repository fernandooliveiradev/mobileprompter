import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { CameraView } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { BRAND } from '../theme/brand';

export function CameraSurface({
  cameraRef,
  facing,
  isVoiceMode,
  isScrolling,
  simulatedSpeaking,
  onToggleSimulatedSpeaking,
}) {
  if (Platform.OS !== 'web') {
    return (
      <CameraView
        ref={cameraRef}
        style={styles.fullScreenCamera}
        facing={facing}
        mode="video"
        mirror={facing === 'front'}
        videoQuality="1080p"
        videoStabilizationMode="auto"
      />
    );
  }

  return (
    <View style={styles.webCameraStage}>
      {/* Grade técnica 3x3 sutil */}
      <View style={styles.gridH1} pointerEvents="none" />
      <View style={styles.gridH2} pointerEvents="none" />
      <View style={styles.gridV1} pointerEvents="none" />
      <View style={styles.gridV2} pointerEvents="none" />

      {/* Miras de canto da câmera */}
      <View style={[styles.cornerMark, styles.cornerTL]} pointerEvents="none" />
      <View style={[styles.cornerMark, styles.cornerTR]} pointerEvents="none" />
      <View style={[styles.cornerMark, styles.cornerBL]} pointerEvents="none" />
      <View style={[styles.cornerMark, styles.cornerBR]} pointerEvents="none" />

      <View style={styles.webCenterMeta}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrowText}>
            PREVIEW WEB · LENTE {facing === 'front' ? 'FRONTAL' : 'TRASEIRA'}
          </Text>
        </View>

        <Text style={styles.brandMark}>
          olv<Text style={styles.brandMarkLight}> prompter</Text>
        </Text>
        <Text style={styles.domainText}>fernandodeoliveira.pro</Text>

        {isVoiceMode && (
          <TouchableOpacity
            style={[
              styles.simVoiceBtn,
              simulatedSpeaking && styles.simVoiceBtnActive,
            ]}
            onPress={onToggleSimulatedSpeaking}
          >
            <Feather
              name={simulatedSpeaking ? 'mic' : 'mic-off'}
              size={13}
              color={simulatedSpeaking ? BRAND.ink : BRAND.white}
            />
            <Text
              style={[
                styles.simVoiceBtnText,
                simulatedSpeaking && styles.simVoiceBtnTextActive,
              ]}
            >
              {simulatedSpeaking
                ? isScrolling
                  ? 'SIMULANDO FALA'
                  : 'VOZ ATIVA · DÊ PLAY'
                : 'SIMULAR FALA (WEB)'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenCamera: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  webCameraStage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridH1: {
    position: 'absolute',
    top: '33.3%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(218, 210, 255, 0.06)',
  },
  gridH2: {
    position: 'absolute',
    top: '66.6%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(218, 210, 255, 0.06)',
  },
  gridV1: {
    position: 'absolute',
    left: '33.3%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(218, 210, 255, 0.06)',
  },
  gridV2: {
    position: 'absolute',
    left: '66.6%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(218, 210, 255, 0.06)',
  },
  cornerMark: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: 'rgba(198, 174, 255, 0.25)',
  },
  cornerTL: {
    top: 16,
    left: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  cornerTR: {
    top: 16,
    right: 16,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  cornerBL: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
  },
  cornerBR: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  webCenterMeta: {
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 140,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.gold,
  },
  eyebrowText: {
    fontFamily: BRAND.fontMono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: BRAND.lilac,
  },
  brandMark: {
    fontFamily: BRAND.fontDisplay,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: BRAND.white,
  },
  brandMarkLight: {
    fontWeight: '400',
    color: BRAND.muted,
  },
  domainText: {
    fontFamily: BRAND.fontMono,
    fontSize: 11,
    color: BRAND.dim,
    marginTop: 4,
    letterSpacing: 0.6,
  },
  simVoiceBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.panel,
    borderWidth: 1,
    borderColor: BRAND.lineStrong,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BRAND.radius,
  },
  simVoiceBtnActive: {
    backgroundColor: BRAND.gold,
    borderColor: BRAND.gold,
  },
  simVoiceBtnText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  simVoiceBtnTextActive: {
    color: BRAND.ink,
  },
});
