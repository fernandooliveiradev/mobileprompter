import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
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
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

import { BRAND } from './src/theme/brand';
import {
  STORAGE_KEY,
  DEFAULT_SCRIPT,
  splitScriptIntoPhrases,
  formatTime,
} from './src/utils/scriptUtils';
import { CameraSurface } from './src/components/CameraSurface';
import { PrompterOverlay } from './src/components/PrompterOverlay';
import { SettingsModal } from './src/components/SettingsModal';
import { ScriptEditorModal } from './src/components/ScriptEditorModal';

function PrompterScreen() {
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
  const currentPhraseIdxRef = useRef(0);
  const phraseProgressRef = useRef(0);
  const lastProgressUiSyncRef = useRef(0);

  // Estado principal
  const [facing, setFacing] = useState('front');
  const [isRecording, setIsRecording] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Configurações do Teleprompter (Timer contínuo ou por frases)
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [scrollMode, setScrollMode] = useState('phrases'); // 'continuous' | 'phrases'
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [phraseProgress, setPhraseProgress] = useState(0);
  const [speed, setSpeed] = useState(3.4); // 1.0 a 10.0 em passos de 0.2
  const [countdownSeconds, setCountdownSeconds] = useState(3); // 0 (OFF) ou 3 a 10
  const [fontSize, setFontSize] = useState(24);
  const [textAlign, setTextAlign] = useState('left');
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [boxSizeMode, setBoxSizeMode] = useState(1);

  const phrases = useMemo(() => splitScriptIntoPhrases(script), [script]);

  // Modais e abas
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsTab, setSettingsTab] = useState('scroll');
  const [editorVisible, setEditorVisible] = useState(false);
  const [recordedTakes, setRecordedTakes] = useState([]);
  const [lastSavedToast, setLastSavedToast] = useState(null);

  // Mantém a tela acesa no celular
  useEffect(() => {
    if (Platform.OS === 'web') return;
    activateKeepAwakeAsync('olv-prompter').catch(() => {});
    return () => {
      deactivateKeepAwake('olv-prompter');
    };
  }, []);

  // Carrega Space Grotesk no Preview Web
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

  // Carregar roteiro e preferências salvas
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved !== null) setScript(saved);
      })
      .catch(() => {});

    AsyncStorage.getItem('@olv_prompter_prefs_v1')
      .then((raw) => {
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p.scrollMode === 'continuous' || p.scrollMode === 'phrases') {
          setScrollMode(p.scrollMode);
        }
        if (typeof p.speed === 'number') setSpeed(p.speed);
        if (typeof p.countdownSeconds === 'number') setCountdownSeconds(p.countdownSeconds);
        if (typeof p.fontSize === 'number') setFontSize(p.fontSize);
        if (typeof p.textAlign === 'string') setTextAlign(p.textAlign);
        if (typeof p.bgOpacity === 'number') setBgOpacity(p.bgOpacity);
        if (typeof p.boxSizeMode === 'number') setBoxSizeMode(p.boxSizeMode);
      })
      .catch(() => {});
  }, []);

  // Salvar preferências automaticamente
  useEffect(() => {
    const payload = JSON.stringify({
      scrollMode,
      speed,
      countdownSeconds,
      fontSize,
      textAlign,
      bgOpacity,
      boxSizeMode,
    });
    AsyncStorage.setItem('@olv_prompter_prefs_v1', payload).catch(() => {});
  }, [scrollMode, speed, countdownSeconds, fontSize, textAlign, bgOpacity, boxSizeMode]);

  // Limpa cache de posições Y das frases quando o layout do texto muda
  useEffect(() => {
    phraseLayoutsRef.current = {};
  }, [script, fontSize, textAlign]);

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

  const saveScript = async (newText) => {
    setScript(newText);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newText);
    } catch (e) {}
  };

  // Motor de rolagem por Timer (Contínuo ou Por Frases com cadência)
  useEffect(() => {
    if (!isScrolling) return;

    const tickMs = 30;
    const fontScale = fontSize / 24;
    const stepPerTick = (0.25 + Math.pow(speed - 1, 1.28) * 0.22) * fontScale;

    const interval = setInterval(() => {
      if (scrollMode === 'phrases') {
        const idx = currentPhraseIdxRef.current;
        if (idx >= phrases.length) {
          setIsScrolling(false);
          return;
        }
        const currentText = phrases[idx] || '';
        const wordCount = Math.max(2, currentText.split(/\s+/).length);
        const effectiveUnits = Math.max(wordCount, Math.round(currentText.length / 5.5));
        // 1.0x (~680ms/unidade) -> 3.4x (~480ms) -> 10.0x (~150ms)
        const msPerUnit = Math.max(140, 680 - (speed - 1) * 59);
        const targetDurationMs = effectiveUnits * msPerUnit;

        const nextProg = Math.min(1, phraseProgressRef.current + tickMs / targetDurationMs);
        phraseProgressRef.current = nextProg;

        const now = Date.now();
        if (now - lastProgressUiSyncRef.current >= 95 || nextProg >= 1) {
          lastProgressUiSyncRef.current = now;
          setPhraseProgress(nextProg);
        }

        if (nextProg >= 1) {
          if (idx + 1 < phrases.length) {
            scrollToPhrase(idx + 1);
          } else {
            setIsScrolling(false);
          }
        }
        return;
      }

      const nextOffset = scrollOffsetRef.current + stepPerTick;
      if (maxScrollRef.current > 0 && nextOffset >= maxScrollRef.current) {
        scrollOffsetRef.current = maxScrollRef.current;
        setIsScrolling(false);
        return;
      }
      scrollOffsetRef.current = nextOffset;
      scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
    }, tickMs);

    return () => clearInterval(interval);
  }, [isScrolling, scrollMode, speed, fontSize, phrases, scrollToPhrase]);

  // Contagem regressiva (3s a 10s -> inicia gravação)
  useEffect(() => {
    if (countdown === null) return;

    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown((c) => (c !== null ? c - 1 : null));
      } else {
        setCountdown(null);
        startCameraRecording();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

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
        const asset = await MediaLibrary.Asset.create(uri);
        return { saved: true, assetId: asset?.id || null };
      }
      return { saved: false, assetId: null };
    } catch {
      return { saved: false, assetId: null };
    }
  };

  const handleDeleteTake = async (take) => {
    const performDelete = async () => {
      try {
        if (Platform.OS !== 'web' && take.assetId && MediaLibrary.Asset) {
          const asset = new MediaLibrary.Asset(take.assetId);
          await asset.delete();
        }
      } catch (e) {}
      setRecordedTakes((prev) => prev.filter((t) => t.id !== take.id));
      setLastSavedToast((curr) => (curr?.id === take.id ? null : curr));
    };

    if (Platform.OS === 'web') {
      performDelete();
      return;
    }

    Alert.alert(
      'Deletar vídeo?',
      'Este take será removido da lista e da galeria do celular.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Deletar', style: 'destructive', onPress: performDelete },
      ]
    );
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

      const startTime = Date.now();
      const video = await cameraRef.current.recordAsync();
      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      setIsRecording(false);
      setIsScrolling(false);

      if (video?.uri) {
        const { saved: savedToGallery, assetId } = await saveVideoToGallery(video.uri);
        const newTake = {
          id: String(Date.now()),
          uri: video.uri,
          assetId,
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
          assetId: null,
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

    if (countdown !== null) {
      setCountdown(null);
      return;
    }

    setSettingsVisible(false);
    setIsScrolling(false);

    if (countdownSeconds > 0) {
      setCountdown(countdownSeconds);
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
              Libere o acesso à câmera e ao microfone para gravar vídeos em tela cheia com teleprompter.
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
        <CameraSurface cameraRef={cameraRef} facing={facing} />

        {/* TELEPROMPTER NO TOPO — 100% LARGURA, SÓ O TEXTO */}
        <PrompterOverlay
          topOffset={Math.max(insets.top * 0.35, 10)}
          height={currentPrompterHeight}
          bgOpacity={bgOpacity}
          scrollMode={scrollMode}
          isRecording={isRecording}
          isScrolling={isScrolling}
          script={script}
          phrases={phrases}
          currentPhraseIdx={currentPhraseIdx}
          phraseProgress={phraseProgress}
          fontSize={fontSize}
          textAlign={textAlign}
          scrollRef={scrollRef}
          phraseScrollRef={phraseScrollRef}
          phraseLayoutsRef={phraseLayoutsRef}
          scrollOffsetRef={scrollOffsetRef}
          contentHeightRef={contentHeightRef}
          containerHeightRef={containerHeightRef}
          updateMaxScroll={updateMaxScroll}
          onSelectPhrase={scrollToPhrase}
        />

        {/* CONTAGEM REGRESSIVA EM MODAL TRANSPARENTE (SEMPRE VISÍVEL POR CIMA DA CÂMERA NO ANDROID) */}
        <Modal
          visible={countdown !== null}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setCountdown(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.countdownOverlay}
            onPress={() => setCountdown(null)}
          >
            <View style={styles.countdownBox}>
              <Text style={styles.countdownLabel}>PREPARE-SE</Text>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <Text style={styles.countdownCancel}>TOQUE PARA CANCELAR</Text>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* TOAST DE VÍDEO GRAVADO (COM DELETAR E ENVIAR) */}
        {lastSavedToast && !isRecording && (
          <View
            style={[
              styles.savedCardToast,
              { bottom: Math.max(insets.bottom, 12) + 108 },
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
            <View style={styles.savedCardActions}>
              <TouchableOpacity
                style={styles.savedCardDeleteBtn}
                onPress={() => handleDeleteTake(lastSavedToast)}
              >
                <Feather name="trash-2" size={14} color={BRAND.rec} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.savedCardShareBtn}
                onPress={() => shareVideoFile(lastSavedToast.uri)}
              >
                <Text style={styles.savedCardShareText}>ENVIAR ↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* HUD INFERIOR ULTRA LIMPO (APENAS 3 CONTROLES: ROTEIRO | REC | AJUSTES) */}
        <View style={[styles.bottomHud, { paddingBottom: Math.max(insets.bottom + 14, 24) }]}>
          <View style={styles.minimalDockRow}>
            {/* Esquerda: Roteiro */}
            <TouchableOpacity
              style={[styles.minimalBtn, isRecording && styles.dockBtnHidden]}
              disabled={isRecording}
              onPress={() => {
                setIsScrolling(false);
                setEditorVisible(true);
              }}
            >
              <Feather name="edit-3" size={20} color={BRAND.white} />
            </TouchableOpacity>

            {/* Centro: Obturador REC */}
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

            {/* Direita: Ajustes (abre o modal com as 4 tabs: Rolagem, Visual, Câmera, Takes) */}
            <TouchableOpacity
              style={[
                styles.minimalBtn,
                styles.minimalBtnAccent,
                isRecording && styles.dockBtnHidden,
              ]}
              disabled={isRecording}
              onPress={() => setSettingsVisible(true)}
            >
              <Feather name="sliders" size={20} color={BRAND.gold} />
              {recordedTakes.length > 0 && (
                <View style={styles.takesBadge}>
                  <Text style={styles.takesBadgeText}>{recordedTakes.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* MODAL COM 4 ABAS: ROLAGEM | VISUAL | CÂMERA | TAKES */}
        <SettingsModal
          visible={settingsVisible}
          activeTab={settingsTab}
          onChangeTab={setSettingsTab}
          onClose={() => setSettingsVisible(false)}
          bottomInset={insets.bottom}
          scrollMode={scrollMode}
          onChangeScrollMode={(mode) => {
            setScrollMode(mode);
            resetScroll();
          }}
          speed={speed}
          onChangeSpeed={setSpeed}
          countdownSeconds={countdownSeconds}
          onChangeCountdownSeconds={setCountdownSeconds}
          isScrolling={isScrolling}
          onTogglePreviewScroll={() => setIsScrolling((prev) => !prev)}
          onResetScroll={resetScroll}
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          textAlign={textAlign}
          onChangeTextAlign={setTextAlign}
          bgOpacity={bgOpacity}
          onChangeBgOpacity={setBgOpacity}
          boxSizeMode={boxSizeMode}
          onChangeBoxSizeMode={setBoxSizeMode}
          facing={facing}
          onChangeFacing={setFacing}
          takes={recordedTakes}
          onShareTake={shareVideoFile}
          onDeleteTake={handleDeleteTake}
        />

        {/* MODAL: EDITOR DE ROTEIRO */}
        <ScriptEditorModal
          visible={editorVisible}
          script={script}
          topInset={insets.top}
          bottomInset={insets.bottom}
          onChangeScript={saveScript}
          onDone={() => {
            setEditorVisible(false);
            resetScroll();
          }}
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

  // CONTAGEM REGRESSIVA (MODAL)
  countdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 4, 11, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownBox: {
    minWidth: 170,
    paddingVertical: 22,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(7, 7, 20, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.gold,
  },
  countdownLabel: {
    fontFamily: BRAND.fontMono,
    color: BRAND.lilac,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 4,
  },
  countdownNumber: {
    fontFamily: BRAND.fontDisplay,
    color: BRAND.gold,
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 82,
  },
  countdownCancel: {
    fontFamily: BRAND.fontMono,
    color: BRAND.muted,
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: 8,
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
  savedCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedCardDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: BRAND.radius,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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

  // HUD INFERIOR ULTRA LIMPO
  bottomHud: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  minimalDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
  },
  minimalBtn: {
    width: 50,
    height: 50,
    borderRadius: BRAND.radius,
    backgroundColor: 'rgba(7, 7, 20, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  minimalBtnAccent: {
    borderColor: 'rgba(255, 199, 102, 0.45)',
    backgroundColor: 'rgba(14, 13, 28, 0.88)',
  },
  dockBtnHidden: {
    opacity: 0,
  },
  takesBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: BRAND.gold,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  takesBadgeText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.ink,
    fontSize: 10,
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
    marginBottom: 10,
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
    width: 74,
    height: 74,
    borderRadius: 37,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.rec,
  },
  shutterInnerStop: {
    width: 24,
    height: 24,
    borderRadius: BRAND.radius,
  },
});
