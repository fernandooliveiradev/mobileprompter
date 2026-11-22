import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as NavigationBar from 'expo-navigation-bar';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';

import { BRAND } from './src/theme/brand';
import {
  STORAGE_KEY,
  DEFAULT_SCRIPT,
  splitScriptIntoPhrases,
  formatTime,
} from './src/utils/scriptUtils';
import { useVoiceActivity } from './src/hooks/useVoiceActivity';
import { CameraSurface } from './src/components/CameraSurface';
import { PrompterOverlay } from './src/components/PrompterOverlay';
import { SettingsModal } from './src/components/SettingsModal';
import { ScriptEditorModal } from './src/components/ScriptEditorModal';
import { TakesModal } from './src/components/TakesModal';

function PrompterScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const cameraRef = useRef(null);
  const scrollRef = useRef(null);
  const phraseScrollRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const maxScrollRef = useRef(0);
  const contentHeightRef = useRef(0);
  const containerHeightRef = useRef(0);
  const phraseLayoutsRef = useRef({});

  // Estado principal
  const [facing, setFacing] = useState('front');
  const [isRecording, setIsRecording] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Modos e progresso
  const [prompterMode, setPrompterMode] = useState('voice_phrases');
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [phraseProgress, setPhraseProgress] = useState(0);
  const phraseProgressRef = useRef(0);
  const currentPhraseIdxRef = useRef(0);

  // Configurações do Estúdio
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [speed, setSpeed] = useState(4);
  const [fontSize, setFontSize] = useState(24);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [boxSizeMode, setBoxSizeMode] = useState(1);
  const [micSensitivity, setMicSensitivity] = useState(2);
  const [useCountdown, setUseCountdown] = useState(true);

  // Modais e abas
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsTab, setSettingsTab] = useState('voice');
  const [editorVisible, setEditorVisible] = useState(false);
  const [takesModalVisible, setTakesModalVisible] = useState(false);
  const [recordedTakes, setRecordedTakes] = useState([]);
  const [lastSavedToast, setLastSavedToast] = useState(null);

  const phrases = useMemo(() => splitScriptIntoPhrases(script), [script]);
  const isVoiceMode =
    prompterMode === 'voice_phrases' || prompterMode === 'voice_scroll';

  const {
    voiceLevel,
    isSpeakingNow,
    isSpeakingRef,
    lastSpokenTimestampRef,
    forceStartStream,
    simulatedSpeaking,
    setSimulatedSpeaking,
  } = useVoiceActivity({
    isActive: isScrolling && isVoiceMode,
    micGranted: Platform.OS === 'web' || micPermission?.granted,
    micSensitivity,
  });

  // Carrega Space Grotesk no Preview Web (mesma tipografia de fernandodeoliveira.pro)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const id = 'fo-space-grotesk-font';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  // Modo imersivo no Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setVisibilityAsync?.('hidden')?.catch?.(() => {});
      } catch (e) {}
    }
  }, []);

  // Carregar roteiro salvo
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved !== null) setScript(saved);
      })
      .catch(() => {});
  }, []);

  const saveScript = async (newText) => {
    setScript(newText);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newText);
    } catch (e) {}
  };

  const openSettings = (tab = 'voice') => {
    setSettingsTab(tab);
    setSettingsVisible(true);
  };

  const scrollToPhrase = useCallback((idx) => {
    currentPhraseIdxRef.current = idx;
    setCurrentPhraseIdx(idx);
    phraseProgressRef.current = 0;
    setPhraseProgress(0);

    const targetY = phraseLayoutsRef.current[idx] ?? idx * 72;
    phraseScrollRef.current?.scrollTo({
      y: Math.max(0, targetY - 6),
      animated: true,
    });
  }, []);

  // Motor de avanço (Frases por Voz, Contínuo por Voz e Timer)
  useEffect(() => {
    if (!isScrolling) return;

    const tickMs = 30;
    const interval = setInterval(() => {
      const speaking = isSpeakingRef.current;
      const silenceMs = Date.now() - lastSpokenTimestampRef.current;

      if (prompterMode === 'voice_phrases') {
        const idx = currentPhraseIdxRef.current;
        if (idx >= phrases.length) {
          setIsScrolling(false);
          return;
        }

        const currentText = phrases[idx] || '';
        const wordCount = Math.max(2, currentText.split(/\s+/).length);
        const msPerWord = Math.max(130, 520 - speed * 42);
        const targetDurationMs = wordCount * msPerWord;

        if (speaking) {
          const nextProg = Math.min(1, phraseProgressRef.current + tickMs / targetDurationMs);
          phraseProgressRef.current = nextProg;
          setPhraseProgress(nextProg);

          if (nextProg >= 1) {
            if (idx + 1 < phrases.length) {
              scrollToPhrase(idx + 1);
            } else {
              setIsScrolling(false);
            }
          }
        } else if (
          phraseProgressRef.current >= 0.68 &&
          silenceMs >= 380 &&
          silenceMs <= 1500
        ) {
          if (idx + 1 < phrases.length) {
            scrollToPhrase(idx + 1);
          } else {
            setIsScrolling(false);
          }
        }
        return;
      }

      if (prompterMode === 'voice_scroll' && !speaking) {
        return;
      }

      const pixelsPerTick = speed * 0.38;
      const nextOffset = scrollOffsetRef.current + pixelsPerTick;
      if (maxScrollRef.current > 0 && nextOffset >= maxScrollRef.current) {
        scrollOffsetRef.current = maxScrollRef.current;
        setIsScrolling(false);
        return;
      }
      scrollOffsetRef.current = nextOffset;
      scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
    }, tickMs);

    return () => clearInterval(interval);
  }, [isScrolling, prompterMode, speed, phrases, scrollToPhrase]);

  // Timer da gravação
  useEffect(() => {
    let timer;
    if (isRecording) {
      setRecordSeconds(0);
      timer = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const updateMaxScroll = () => {
    maxScrollRef.current = Math.max(0, contentHeightRef.current - containerHeightRef.current);
  };

  const resetScroll = () => {
    setIsScrolling(false);
    scrollOffsetRef.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    scrollToPhrase(0);
  };

  const handleGrantPermissions = async () => {
    await requestCameraPermission();
    await requestMicPermission();
  };

  const saveVideoToGallery = async (uri) => {
    try {
      try {
        await MediaLibrary.requestPermissionsAsync(true, ['video']);
      } catch {}
      if (MediaLibrary.Asset?.create) {
        await MediaLibrary.Asset.create(uri);
      } else {
        await MediaLibrary.saveToLibraryAsync(uri);
      }
      return true;
    } catch {
      return false;
    }
  };

  const shareVideoFile = async (uri) => {
    if (Platform.OS === 'web') {
      Alert.alert('Preview Web', 'O compartilhamento de vídeo funciona no app Android/Expo Go.');
      return;
    }
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'video/mp4',
          dialogTitle: 'Salvar ou Compartilhar Vídeo',
        });
      } else {
        Alert.alert('Indisponível', 'Compartilhamento não disponível neste dispositivo.');
      }
    } catch (e) {
      Alert.alert('Erro ao abrir menu', e?.message || 'Tente novamente.');
    }
  };

  const startCameraRecording = async () => {
    if (Platform.OS === 'web') {
      setIsRecording(true);
      setIsScrolling(true);
      return;
    }

    if (!cameraRef.current) return;
    try {
      setIsRecording(true);
      setIsScrolling(true);
      if (isVoiceMode) {
        setTimeout(() => forceStartStream(), 250);
      }

      const startTime = Date.now();
      const video = await cameraRef.current.recordAsync();
      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      setIsRecording(false);
      setIsScrolling(false);

      if (video?.uri) {
        const savedToGallery = await saveVideoToGallery(video.uri);
        const newTake = {
          id: String(Date.now()),
          uri: video.uri,
          duration: durationSec,
          createdAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          savedToGallery,
        };
        setRecordedTakes((prev) => [newTake, ...prev]);
        setLastSavedToast(newTake);
        setTimeout(() => {
          setLastSavedToast((curr) => (curr?.id === newTake.id ? null : curr));
        }, 6000);
      }
    } catch (error) {
      setIsRecording(false);
      setIsScrolling(false);
      Alert.alert('Erro na gravação', error?.message || 'Não foi possível gravar o vídeo.');
    }
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      setIsScrolling(false);
      if (Platform.OS === 'web') {
        setIsRecording(false);
        const mockTake = {
          id: String(Date.now()),
          uri: 'preview-web.mp4',
          duration: Math.max(1, recordSeconds),
          createdAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          savedToGallery: false,
        };
        setRecordedTakes((prev) => [mockTake, ...prev]);
        setLastSavedToast(mockTake);
        setTimeout(() => {
          setLastSavedToast((curr) => (curr?.id === mockTake.id ? null : curr));
        }, 4000);
        return;
      }
      try {
        cameraRef.current?.stopRecording();
      } catch (e) {}
      return;
    }

    if (countdown !== null) return;
    setSettingsVisible(false);

    if (useCountdown) {
      setCountdown(3);
      let current = 3;
      const timer = setInterval(() => {
        current -= 1;
        if (current > 0) {
          setCountdown(current);
        } else {
          clearInterval(timer);
          setCountdown(null);
          startCameraRecording();
        }
      }, 1000);
    } else {
      startCameraRecording();
    }
  };

  if (Platform.OS !== 'web') {
    if (!cameraPermission || !micPermission) {
      return <View style={styles.container} />;
    }

    if (!cameraPermission.granted || !micPermission.granted) {
      return (
        <SafeAreaView style={styles.permissionContainer}>
          <StatusBar hidden />
          <View style={styles.permissionCard}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrow}>FERNANDODEOLIVEIRA.PRO</Text>
            </View>
            <Text style={styles.permissionTitle}>
              olv<Text style={styles.permissionTitleLight}> prompter</Text>
            </Text>
            <Text style={styles.permissionText}>
              Libere o acesso à câmera e ao microfone para gravar em tela cheia com rolagem guiada pela sua voz.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={handleGrantPermissions}>
              <Text style={styles.permissionButtonText}>PERMITIR CÂMERA E MICROFONE ↗</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
  }

  const effectiveHeight = Platform.OS === 'web' ? Math.min(windowHeight, 840) : windowHeight;
  const prompterHeights = [
    effectiveHeight * 0.26,
    effectiveHeight * 0.36,
    effectiveHeight * 0.48,
  ];
  const currentPrompterHeight = prompterHeights[boxSizeMode];

  return (
    <View style={styles.webOuterBackdrop}>
      <View style={[styles.container, Platform.OS === 'web' && styles.webPhoneFrame]}>
        <StatusBar hidden translucent backgroundColor="transparent" />

        {/* CÂMERA */}
        <CameraSurface
          cameraRef={cameraRef}
          facing={facing}
          isVoiceMode={isVoiceMode}
          isScrolling={isScrolling}
          simulatedSpeaking={simulatedSpeaking}
          onToggleSimulatedSpeaking={() => setSimulatedSpeaking((s) => !s)}
        />

        {/* TELEPROMPTER NO TOPO */}
        <PrompterOverlay
          topOffset={Math.max(insets.top * 0.35, 10)}
          height={currentPrompterHeight}
          bgOpacity={bgOpacity}
          prompterMode={prompterMode}
          isVoiceMode={isVoiceMode}
          isSpeakingNow={isSpeakingNow}
          isRecording={isRecording}
          isScrolling={isScrolling}
          phrases={phrases}
          script={script}
          currentPhraseIdx={currentPhraseIdx}
          phraseProgress={phraseProgress}
          fontSize={fontSize}
          phraseScrollRef={phraseScrollRef}
          scrollRef={scrollRef}
          phraseLayoutsRef={phraseLayoutsRef}
          scrollOffsetRef={scrollOffsetRef}
          contentHeightRef={contentHeightRef}
          containerHeightRef={containerHeightRef}
          updateMaxScroll={updateMaxScroll}
          onScrollToPhrase={scrollToPhrase}
          onResetScroll={resetScroll}
          onToggleScroll={() => setIsScrolling((prev) => !prev)}
          onOpenVoiceSettings={() => openSettings('voice')}
        />

        {/* CONTAGEM REGRESSIVA */}
        {countdown !== null && (
          <View style={styles.countdownOverlay} pointerEvents="none">
            <View style={styles.countdownBox}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>
          </View>
        )}

        {/* TOAST DE VÍDEO GRAVADO */}
        {lastSavedToast && !isRecording && (
          <View
            style={[
              styles.savedCardToast,
              { bottom: Math.max(insets.bottom, 12) + 148 },
            ]}
          >
            <View style={styles.savedCardLeft}>
              <View style={styles.savedDot} />
              <View>
                <Text style={styles.savedCardTitle}>
                  {lastSavedToast.savedToGallery ? 'SALVO NA GALERIA' : 'TAKE GRAVADO'}
                </Text>
                <Text style={styles.savedCardSub}>
                  DURAÇÃO {formatTime(lastSavedToast.duration)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.savedCardShareBtn}
              onPress={() => shareVideoFile(lastSavedToast.uri)}
            >
              <Text style={styles.savedCardShareText}>ENVIAR ↗</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HUD INFERIOR EDITORIAL */}
        <View style={[styles.bottomHud, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
          {/* Telemetria compacta clicável */}
          {!isRecording && (
            <View style={styles.telemetryStrip}>
              <TouchableOpacity
                style={styles.telemetryCell}
                onPress={() => openSettings('voice')}
              >
                <Text style={styles.telemetryKey}>RITMO</Text>
                <Text style={styles.telemetryVal}>{speed}X</Text>
              </TouchableOpacity>

              <View style={styles.telemetryDivider} />

              <TouchableOpacity
                style={styles.telemetryCell}
                onPress={() => openSettings('visual')}
              >
                <Text style={styles.telemetryKey}>FONTE</Text>
                <Text style={styles.telemetryVal}>{fontSize}PX</Text>
              </TouchableOpacity>

              <View style={styles.telemetryDivider} />

              <TouchableOpacity
                style={styles.telemetryCell}
                onPress={() => openSettings('camera')}
              >
                <Text style={styles.telemetryKey}>TIMER</Text>
                <Text
                  style={[
                    styles.telemetryVal,
                    useCountdown && { color: BRAND.gold },
                  ]}
                >
                  {useCountdown ? '3S' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dock Principal */}
          <View style={styles.dockRow}>
            <View style={styles.dockSideGroup}>
              <TouchableOpacity
                style={[styles.dockBtn, isRecording && styles.dockBtnHidden]}
                disabled={isRecording}
                onPress={() => {
                  setIsScrolling(false);
                  setEditorVisible(true);
                }}
              >
                <Feather name="edit-3" size={18} color={BRAND.white} />
                <Text style={styles.dockBtnLabel}>ROTEIRO</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockBtn, isRecording && styles.dockBtnHidden]}
                disabled={isRecording}
                onPress={() => setTakesModalVisible(true)}
              >
                <View>
                  <Feather name="film" size={18} color={BRAND.white} />
                  {recordedTakes.length > 0 && (
                    <View style={styles.takesBadge}>
                      <Text style={styles.takesBadgeText}>{recordedTakes.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.dockBtnLabel}>TAKES</Text>
              </TouchableOpacity>
            </View>

            {/* Obturador */}
            <View style={styles.shutterCenterGroup}>
              {isRecording && (
                <View style={styles.liveTimerPill}>
                  <View style={styles.liveRedDot} />
                  <Text style={styles.liveTimerText}>{formatTime(recordSeconds)}</Text>
                </View>
              )}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.shutterOuter, isRecording && styles.shutterOuterRecording]}
                onPress={handleToggleRecord}
              >
                <View style={[styles.shutterInner, isRecording && styles.shutterInnerStop]} />
              </TouchableOpacity>
            </View>

            <View style={styles.dockSideGroup}>
              <TouchableOpacity
                style={[styles.dockBtn, styles.dockBtnAccent, isRecording && styles.dockBtnHidden]}
                disabled={isRecording}
                onPress={() => openSettings(settingsTab)}
              >
                <Feather name="sliders" size={18} color={BRAND.gold} />
                <Text style={[styles.dockBtnLabel, { color: BRAND.gold }]}>AJUSTES</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockBtn, isRecording && styles.dockBtnHidden]}
                disabled={isRecording}
                onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
              >
                <Ionicons name="camera-reverse-outline" size={20} color={BRAND.white} />
                <Text style={styles.dockBtnLabel}>LENTE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* MODAL COM ABAS: AJUSTES */}
        <SettingsModal
          visible={settingsVisible}
          activeTab={settingsTab}
          onChangeTab={setSettingsTab}
          onClose={() => setSettingsVisible(false)}
          bottomInset={insets.bottom}
          prompterMode={prompterMode}
          onSelectMode={setPrompterMode}
          speed={speed}
          onChangeSpeed={setSpeed}
          micSensitivity={micSensitivity}
          onChangeMicSensitivity={setMicSensitivity}
          voiceLevel={voiceLevel}
          isVoiceMode={isVoiceMode}
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          bgOpacity={bgOpacity}
          onChangeBgOpacity={setBgOpacity}
          boxSizeMode={boxSizeMode}
          onChangeBoxSizeMode={setBoxSizeMode}
          useCountdown={useCountdown}
          onToggleCountdown={() => setUseCountdown((c) => !c)}
          facing={facing}
          onChangeFacing={setFacing}
        />

        {/* MODAL: EDITOR DE ROTEIRO */}
        <ScriptEditorModal
          visible={editorVisible}
          script={script}
          onChangeScript={saveScript}
          onDone={() => {
            setEditorVisible(false);
            resetScroll();
          }}
        />

        {/* MODAL: TAKES GRAVADOS */}
        <TakesModal
          visible={takesModalVisible}
          takes={recordedTakes}
          bottomInset={insets.bottom}
          onClose={() => setTakesModalVisible(false)}
          onShare={shareVideoFile}
        />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PrompterScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webOuterBackdrop: {
    flex: 1,
    backgroundColor: BRAND.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: BRAND.ink,
    overflow: 'hidden',
  },
  webPhoneFrame: {
    maxWidth: 420,
    maxHeight: 860,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: BRAND.ink,
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: BRAND.panel,
    padding: 28,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.gold,
  },
  eyebrow: {
    fontFamily: BRAND.fontMono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: BRAND.lilac,
  },
  permissionTitle: {
    fontFamily: BRAND.fontDisplay,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1,
    color: BRAND.white,
    marginBottom: 12,
  },
  permissionTitleLight: {
    fontWeight: '400',
    color: BRAND.muted,
  },
  permissionText: {
    fontSize: 15,
    color: BRAND.muted,
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: BRAND.white,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: BRAND.radius,
    alignItems: 'center',
  },
  permissionButtonText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.ink,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // CONTAGEM REGRESSIVA
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  countdownBox: {
    width: 104,
    height: 104,
    backgroundColor: 'rgba(7, 7, 20, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.gold,
  },
  countdownNumber: {
    fontFamily: BRAND.fontDisplay,
    color: BRAND.gold,
    fontSize: 54,
    fontWeight: '700',
  },

  // TOAST DE VÍDEO SALVO
  savedCardToast: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: 'rgba(7, 7, 20, 0.94)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BRAND.gold,
    zIndex: 40,
  },
  savedCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.gold,
  },
  savedCardTitle: {
    fontFamily: BRAND.fontMono,
    color: BRAND.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  savedCardSub: {
    fontFamily: BRAND.fontMono,
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 2,
  },
  savedCardShareBtn: {
    backgroundColor: BRAND.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BRAND.radius,
  },
  savedCardShareText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.ink,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // HUD INFERIOR
  bottomHud: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  telemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 7, 20, 0.84)',
    borderWidth: 1,
    borderColor: BRAND.line,
    marginBottom: 14,
  },
  telemetryCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  telemetryKey: {
    fontFamily: BRAND.fontMono,
    color: BRAND.dim,
    fontSize: 9,
    letterSpacing: 1,
  },
  telemetryVal: {
    fontFamily: BRAND.fontMono,
    color: BRAND.white,
    fontSize: 11,
    fontWeight: '700',
  },
  telemetryDivider: {
    width: 1,
    height: 14,
    backgroundColor: BRAND.line,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 2,
  },
  dockSideGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dockBtn: {
    width: 58,
    height: 54,
    borderRadius: BRAND.radius,
    backgroundColor: 'rgba(7, 7, 20, 0.84)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  dockBtnAccent: {
    borderColor: 'rgba(255, 199, 102, 0.45)',
    backgroundColor: 'rgba(14, 13, 28, 0.92)',
  },
  dockBtnHidden: {
    opacity: 0,
  },
  dockBtnLabel: {
    fontFamily: BRAND.fontMono,
    color: BRAND.muted,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  takesBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: BRAND.gold,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  takesBadgeText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.ink,
    fontSize: 9,
    fontWeight: '800',
  },
  shutterCenterGroup: {
    alignItems: 'center',
  },
  liveTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.ink,
    borderWidth: 1,
    borderColor: BRAND.rec,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    gap: 6,
  },
  liveRedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.rec,
  },
  liveTimerText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: BRAND.white,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 7, 20, 0.35)',
  },
  shutterOuterRecording: {
    borderColor: BRAND.rec,
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: BRAND.rec,
  },
  shutterInnerStop: {
    width: 24,
    height: 24,
    borderRadius: BRAND.radius,
  },
});
