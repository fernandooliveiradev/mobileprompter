import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StatusBar,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as NavigationBar from 'expo-navigation-bar';
import { useAudioStream } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = '@mobileprompter_script_v3';
const { height: SCREEN_HEIGHT } = Dimensions.get('screen');

const DEFAULT_SCRIPT = `Olá! Agora o MobilePrompter ocupa 100% da tela e tem modo de rolagem por voz!

No modo Frases por Voz, você vai falando esta frase em destaque bem colada na câmera frontal.

Assim que terminar de falar a frase, ela passa automaticamente para a próxima!

Se você fizer uma pausa para respirar ou pensar, o teleprompter espera por você sem correr na frente.

Você também pode tocar em qualquer frase na tela para pular ou voltar quando quiser!`;

// Divide o roteiro em frases confortáveis para leitura próxima à lente
function splitScriptIntoPhrases(text) {
  if (!text || !text.trim()) return ['(Roteiro vazio - toque em Roteiro para editar)'];
  const rawLines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const phrases = [];
  for (const line of rawLines) {
    // Divide por pontuação de fim de frase mantendo a pontuação
    const sentences = line
      .split(/(?<=[.!?…;])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      if (words.length <= 14) {
        phrases.push(sentence);
      } else {
        // Se a frase for muito longa, divide em blocos de ~10 palavras ou por vírgula
        const subChunks = sentence
          .split(/(?<=[,:])\s+/)
          .map((c) => c.trim())
          .filter(Boolean);
        let current = '';
        for (const chunk of subChunks) {
          const combined = current ? `${current} ${chunk}` : chunk;
          if (combined.split(/\s+/).length <= 12) {
            current = combined;
          } else {
            if (current) phrases.push(current);
            // Se o próprio chunk ainda tiver mais de 14 palavras, fatia a cada 10 palavras
            const chunkWords = chunk.split(/\s+/);
            if (chunkWords.length > 14) {
              for (let i = 0; i < chunkWords.length; i += 10) {
                phrases.push(chunkWords.slice(i, i + 10).join(' '));
              }
              current = '';
            } else {
              current = chunk;
            }
          }
        }
        if (current) phrases.push(current);
      }
    }
  }
  return phrases.length > 0 ? phrases : ['(Roteiro vazio)'];
}

function PrompterScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();

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

  const [facing, setFacing] = useState('front');
  const [isRecording, setIsRecording] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Modos: 'voice_phrases' (Frases por Fala) | 'voice_scroll' (Contínuo por Fala) | 'auto_scroll' (Timer contínuo)
  const [prompterMode, setPrompterMode] = useState('voice_phrases');
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [phraseProgress, setPhraseProgress] = useState(0); // 0 a 1

  // Estado de detecção de voz em tempo real
  const [voiceLevel, setVoiceLevel] = useState(0); // 0 a 1 (para medidor visual)
  const [isSpeakingNow, setIsSpeakingNow] = useState(false);
  const [micSensitivity, setMicSensitivity] = useState(2); // 1: Baixa, 2: Normal, 3: Alta
  const lastSpokenTimestampRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const phraseProgressRef = useRef(0);
  const currentPhraseIdxRef = useRef(0);

  // Configurações visuais
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [speed, setSpeed] = useState(4); // 1 a 10
  const [fontSize, setFontSize] = useState(24);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [boxSizeMode, setBoxSizeMode] = useState(1); // 0: compacto, 1: médio, 2: grande
  const [useCountdown, setUseCountdown] = useState(true);
  const [activeControlTab, setActiveControlTab] = useState(null); // 'speed' | 'font' | null

  // Modais e Takes
  const [editorVisible, setEditorVisible] = useState(false);
  const [takesModalVisible, setTakesModalVisible] = useState(false);
  const [recordedTakes, setRecordedTakes] = useState([]);
  const [lastSavedToast, setLastSavedToast] = useState(null);

  const phrases = useMemo(() => splitScriptIntoPhrases(script), [script]);

  // Modo Tela Cheia Imersiva no Android (ocupa 100% da tela com a câmera)
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

  // Limiar de voz conforme sensibilidade escolhida
  const voiceThresholds = { 1: 0.026, 2: 0.014, 3: 0.007 };
  const activeThreshold = voiceThresholds[micSensitivity] || 0.014;

  // Callback de áudio PCM em tempo real (a cada ~100ms)
  const handleAudioBuffer = useCallback(
    (buffer) => {
      try {
        if (!buffer?.data) return;
        const samples = new Int16Array(buffer.data);
        if (samples.length === 0) return;

        let sumSquares = 0;
        const step = 4; // Amostragem rápida
        let count = 0;
        for (let i = 0; i < samples.length; i += step) {
          const norm = samples[i] / 32768;
          sumSquares += norm * norm;
          count++;
        }
        const rms = Math.sqrt(sumSquares / Math.max(1, count));
        const normalizedLevel = Math.min(1, rms / 0.12);
        setVoiceLevel(normalizedLevel);

        const now = Date.now();
        if (rms >= activeThreshold) {
          lastSpokenTimestampRef.current = now;
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeakingNow(true);
          }
        } else {
          // Hangover de 380ms para não cortar entre sílabas
          if (now - lastSpokenTimestampRef.current > 380 && isSpeakingRef.current) {
            isSpeakingRef.current = false;
            setIsSpeakingNow(false);
          }
        }
      } catch (e) {}
    },
    [activeThreshold]
  );

  const { stream: audioStream, isStreaming: isAudioStreaming } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer: handleAudioBuffer,
  });

  // Gerenciar captura de voz quando o teleprompter está ativo em modo de voz
  const isVoiceMode = prompterMode === 'voice_phrases' || prompterMode === 'voice_scroll';

  useEffect(() => {
    if (!micPermission?.granted) return;
    if (isScrolling && isVoiceMode) {
      try {
        audioStream.start();
      } catch (e) {}
    } else {
      try {
        if (isAudioStreaming) audioStream.stop();
      } catch (e) {}
      isSpeakingRef.current = false;
      setIsSpeakingNow(false);
      setVoiceLevel(0);
    }
    return () => {
      try {
        audioStream.stop();
      } catch (e) {}
    };
  }, [isScrolling, isVoiceMode, micPermission?.granted]);

  // Sincronizar scroll da lista de frases quando currentPhraseIdx muda
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

  // Motor principal de avanço (Modo Frases por Voz, Contínuo por Voz e Auto Timer)
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
        // Tempo estimado de fala para esta frase ajustado pela Velocidade (ex: ~320ms por palavra na vel 4)
        const msPerWord = Math.max(130, 520 - speed * 42);
        const targetDurationMs = wordCount * msPerWord;

        if (speaking) {
          const nextProg = Math.min(1, phraseProgressRef.current + tickMs / targetDurationMs);
          phraseProgressRef.current = nextProg;
          setPhraseProgress(nextProg);

          // Se completou 100% do tempo estimado da frase falando, avança para a próxima
          if (nextProg >= 1) {
            if (idx + 1 < phrases.length) {
              scrollToPhrase(idx + 1);
            } else {
              setIsScrolling(false);
            }
          }
        } else {
          // Se o usuário já falou pelo menos 68% da frase e fez uma pausa natural (> 380ms), avança!
          if (phraseProgressRef.current >= 0.68 && silenceMs >= 380 && silenceMs <= 1500) {
            if (idx + 1 < phrases.length) {
              scrollToPhrase(idx + 1);
            } else {
              setIsScrolling(false);
            }
          }
        }
        return;
      }

      // Modo Contínuo por Voz: só rola quando está falando
      if (prompterMode === 'voice_scroll' && !speaking) {
        return;
      }

      // Rolagem contínua suave (voice_scroll falando ou auto_scroll)
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
      timer = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
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

  const cyclePrompterMode = () => {
    setPrompterMode((prev) => {
      if (prev === 'voice_phrases') return 'voice_scroll';
      if (prev === 'voice_scroll') return 'auto_scroll';
      return 'voice_phrases';
    });
  };

  const getModeLabel = () => {
    if (prompterMode === 'voice_phrases') return 'Frases (Voz)';
    if (prompterMode === 'voice_scroll') return 'Contínuo (Voz)';
    return 'Auto (Timer)';
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
    } catch (err) {
      return false;
    }
  };

  const shareVideoFile = async (uri) => {
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

  const handleToggleRecord = async () => {
    if (isRecording) {
      setIsScrolling(false);
      try {
        cameraRef.current?.stopRecording();
      } catch (e) {}
      return;
    }

    if (countdown !== null) return;
    setActiveControlTab(null);

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

  const startCameraRecording = async () => {
    if (!cameraRef.current) return;
    try {
      setIsRecording(true);
      setIsScrolling(true);
      // Garante que o stream de voz rode junto com a gravação da câmera
      if (isVoiceMode) {
        setTimeout(() => {
          try {
            audioStream.start();
          } catch (e) {}
        }, 250);
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
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!cameraPermission || !micPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar hidden />
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconCircle}>
            <Feather name="video" size={32} color="#38BDF8" />
          </View>
          <Text style={styles.permissionTitle}>MobilePrompter</Text>
          <Text style={styles.permissionText}>
            Libere o acesso à Câmera e ao Microfone para gravar em tela cheia com rolagem guiada pela sua voz.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleGrantPermissions}>
            <Text style={styles.permissionButtonText}>Permitir Câmera e Microfone</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const prompterHeights = [SCREEN_HEIGHT * 0.26, SCREEN_HEIGHT * 0.36, SCREEN_HEIGHT * 0.5];
  const currentPrompterHeight = prompterHeights[boxSizeMode];

  return (
    <View style={styles.container}>
      {/* StatusBar oculta para ocupar 100% da tela até a borda superior da lente */}
      <StatusBar hidden translucent backgroundColor="transparent" />

      {/* CÂMERA FRONTAL OCUPANDO 100% DA TELA */}
      <CameraView
        ref={cameraRef}
        style={styles.fullScreenCamera}
        facing={facing}
        mode="video"
        mirror={facing === 'front'}
        videoQuality="1080p"
        videoStabilizationMode="auto"
      />

      {/* TELEPROMPTER COLADO NO TOPO (Borda a Borda junto da Lente Frontal) */}
      <View
        style={[
          styles.prompterWrapper,
          {
            top: Math.max(insets.top * 0.35, 6),
            height: currentPrompterHeight,
            backgroundColor: `rgba(8, 12, 20, ${bgOpacity})`,
          },
        ]}
        onLayout={(e) => {
          containerHeightRef.current = e.nativeEvent.layout.height;
          updateMaxScroll();
        }}
      >
        {/* Barra Superior do Teleprompter */}
        <View style={styles.prompterTopBar}>
          {/* Indicador de Olhar + Medidor de Voz ao Vivo */}
          <TouchableOpacity style={styles.modeSwitchChip} onPress={cyclePrompterMode}>
            <View
              style={[
                styles.voicePulseDot,
                isVoiceMode && isSpeakingNow && styles.voicePulseDotActive,
                isRecording && !isVoiceMode && styles.lensDotRecording,
              ]}
            />
            <Feather
              name={isVoiceMode ? 'mic' : 'clock'}
              size={12}
              color={isVoiceMode && isSpeakingNow ? '#34D399' : '#38BDF8'}
            />
            <Text style={styles.modeSwitchText}>{getModeLabel()}</Text>
          </TouchableOpacity>

          {/* Ações Rápidas do Teleprompter */}
          <View style={styles.prompterQuickActions}>
            {prompterMode === 'voice_phrases' && (
              <>
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => scrollToPhrase(Math.max(0, currentPhraseIdx - 1))}
                >
                  <Feather name="chevron-up" size={16} color="#E2E8F0" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() =>
                    scrollToPhrase(Math.min(phrases.length - 1, currentPhraseIdx + 1))
                  }
                >
                  <Feather name="chevron-down" size={16} color="#E2E8F0" />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.iconActionBtn} onPress={resetScroll}>
              <Feather name="rotate-ccw" size={15} color="#E2E8F0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconActionBtn, isScrolling && styles.iconActionBtnActive]}
              onPress={() => setIsScrolling((prev) => !prev)}
            >
              <Feather name={isScrolling ? 'pause' : 'play'} size={15} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => setBoxSizeMode((m) => (m + 1) % 3)}
            >
              <Feather
                name={boxSizeMode === 2 ? 'minimize-2' : 'maximize-2'}
                size={14}
                color="#E2E8F0"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scriptEditChip}
              onPress={() => {
                setIsScrolling(false);
                setEditorVisible(true);
              }}
            >
              <Feather name="edit-3" size={12} color="#38BDF8" />
              <Text style={styles.scriptEditChipText}>Roteiro</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MODO 1: FRASES POR VOZ (Passa frase por frase conforme você fala) */}
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
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.75}
                  onPress={() => scrollToPhrase(index)}
                  onLayout={(e) => {
                    phraseLayoutsRef.current[index] = e.nativeEvent.layout.y;
                  }}
                  style={[
                    styles.phraseCard,
                    isCurrent && styles.phraseCardCurrent,
                    isPast && styles.phraseCardPast,
                  ]}
                >
                  <View style={styles.phraseHeaderRow}>
                    <Text style={[styles.phraseIndexBadge, isCurrent && { color: '#38BDF8' }]}>
                      {index + 1}/{phrases.length}
                    </Text>
                    {isCurrent && isScrolling && (
                      <Text style={styles.phraseVoiceHint}>
                        {isSpeakingNow ? '🎙️ Ouvindo sua fala...' : '⏸ Aguardando você falar...'}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.prompterText,
                      {
                        fontSize: isCurrent ? fontSize : Math.max(16, fontSize - 4),
                        lineHeight: (isCurrent ? fontSize : Math.max(16, fontSize - 4)) * 1.35,
                        color: isCurrent
                          ? '#FFFFFF'
                          : isPast
                          ? 'rgba(148, 163, 184, 0.35)'
                          : 'rgba(226, 232, 240, 0.55)',
                      },
                    ]}
                  >
                    {phrase}
                  </Text>

                  {/* Barra de progresso da fala da frase atual */}
                  {isCurrent && (
                    <View style={styles.phraseProgressTrack}>
                      <View
                        style={[
                          styles.phraseProgressFill,
                          {
                            width: `${Math.round(phraseProgress * 100)}%`,
                            backgroundColor: isSpeakingNow ? '#34D399' : '#38BDF8',
                          },
                        ]}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: currentPrompterHeight * 0.75 }} />
          </ScrollView>
        ) : (
          /* MODO 2 & 3: ROLAGEM CONTÍNUA (Por Voz ou Timer) */
          <>
            <View
              pointerEvents="none"
              style={[styles.readingFocusHighlight, { height: fontSize * 1.65 }]}
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
              <Text style={[styles.prompterText, { fontSize, lineHeight: fontSize * 1.4 }]}>
                {script}
              </Text>
              <View style={{ height: currentPrompterHeight * 0.75 }} />
            </ScrollView>
          </>
        )}
      </View>

      {/* Contagem Regressiva Central */}
      {countdown !== null && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
          </View>
        </View>
      )}

      {/* Notificação Flutuante quando um vídeo acaba de ser gravado */}
      {lastSavedToast && !isRecording && (
        <View style={[styles.savedCardToast, { bottom: Math.max(insets.bottom, 12) + 148 }]}>
          <View style={styles.savedCardLeft}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <View>
              <Text style={styles.savedCardTitle}>
                {lastSavedToast.savedToGallery ? 'Salvo na Galeria!' : 'Vídeo gravado!'}
              </Text>
              <Text style={styles.savedCardSub}>Duração: {formatTime(lastSavedToast.duration)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.savedCardShareBtn}
            onPress={() => shareVideoFile(lastSavedToast.uri)}
          >
            <Feather name="share" size={14} color="#FFF" />
            <Text style={styles.savedCardShareText}>Salvar / Enviar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HUD INFERIOR */}
      <View style={[styles.bottomHud, { paddingBottom: Math.max(insets.bottom + 8, 18) }]}>
        {/* Sub-painel expansível para Ritmo/Velocidade */}
        {!isRecording && activeControlTab === 'speed' && (
          <View style={styles.adjustPopover}>
            <Text style={styles.adjustLabel}>
              {prompterMode === 'voice_phrases' ? 'Ritmo das Frases' : 'Velocidade de Rolagem'}
            </Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperCircle}
                onPress={() => setSpeed((s) => Math.max(1, s - 1))}
              >
                <Feather name="minus" size={18} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{speed}x</Text>
              <TouchableOpacity
                style={styles.stepperCircle}
                onPress={() => setSpeed((s) => Math.min(10, s + 1))}
              >
                <Feather name="plus" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sub-painel expansível para Tamanho da Fonte */}
        {!isRecording && activeControlTab === 'font' && (
          <View style={styles.adjustPopover}>
            <Text style={styles.adjustLabel}>Tamanho da Letra</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperCircle}
                onPress={() => setFontSize((f) => Math.max(16, f - 2))}
              >
                <Feather name="minus" size={18} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{fontSize}px</Text>
              <TouchableOpacity
                style={styles.stepperCircle}
                onPress={() => setFontSize((f) => Math.min(44, f + 2))}
              >
                <Feather name="plus" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pílula de Configurações Rápidas */}
        {!isRecording && (
          <View style={styles.quickPillsBar}>
            <TouchableOpacity
              style={[styles.quickPill, activeControlTab === 'speed' && styles.quickPillActive]}
              onPress={() => setActiveControlTab((t) => (t === 'speed' ? null : 'speed'))}
            >
              <Feather name="fast-forward" size={13} color="#38BDF8" />
              <Text style={styles.quickPillText}>Ritmo {speed}x</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickPill, activeControlTab === 'font' && styles.quickPillActive]}
              onPress={() => setActiveControlTab((t) => (t === 'font' ? null : 'font'))}
            >
              <Feather name="type" size={13} color="#38BDF8" />
              <Text style={styles.quickPillText}>{fontSize}px</Text>
            </TouchableOpacity>

            {isVoiceMode && (
              <TouchableOpacity
                style={styles.quickPill}
                onPress={() => setMicSensitivity((s) => (s % 3) + 1)}
              >
                <Feather name="mic" size={13} color="#34D399" />
                <Text style={styles.quickPillText}>
                  Mic {micSensitivity === 1 ? 'Baixo' : micSensitivity === 2 ? 'Médio' : 'Alto'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.quickPill}
              onPress={() =>
                setBgOpacity((o) => (o >= 0.75 ? 0.25 : Number((o + 0.25).toFixed(2))))
              }
            >
              <Feather name="sliders" size={13} color="#38BDF8" />
              <Text style={styles.quickPillText}>{Math.round(bgOpacity * 100)}%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickPill, useCountdown && styles.quickPillCountdownOn]}
              onPress={() => setUseCountdown((c) => !c)}
            >
              <Feather name="clock" size={13} color={useCountdown ? '#FBBF24' : '#94A3B8'} />
              <Text style={[styles.quickPillText, useCountdown && { color: '#FBBF24' }]}>
                {useCountdown ? '3s' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Barra Principal do Obturador */}
        <View style={styles.shutterRow}>
          <TouchableOpacity
            style={styles.sideCircleBtn}
            disabled={isRecording}
            onPress={() => setTakesModalVisible(true)}
          >
            <Feather name="film" size={22} color="#FFF" />
            {recordedTakes.length > 0 && (
              <View style={styles.takesBadge}>
                <Text style={styles.takesBadgeText}>{recordedTakes.length}</Text>
              </View>
            )}
          </TouchableOpacity>

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

          <TouchableOpacity
            style={styles.sideCircleBtn}
            disabled={isRecording}
            onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL: EDITOR DE ROTEIRO */}
      <Modal visible={editorVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Roteiro</Text>
            <View style={styles.modalHeaderActions}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => saveScript('')}>
                <Feather name="trash-2" size={15} color="#CBD5E1" />
                <Text style={styles.clearBtnText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setEditorVisible(false);
                  resetScroll();
                }}
              >
                <Feather name="check" size={16} color="#FFF" />
                <Text style={styles.doneBtnText}>Pronto</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.editorTip}>
            Dica: Separe cada frase com ponto final ou pule uma linha para o modo Frases (Voz) dividir perfeitamente!
          </Text>

          <TextInput
            style={styles.scriptInput}
            multiline
            value={script}
            onChangeText={saveScript}
            placeholder="Cole ou escreva seu roteiro aqui..."
            placeholderTextColor="#64748B"
            textAlignVertical="top"
          />
        </SafeAreaView>
      </Modal>

      {/* MODAL: MEUS TAKES GRAVADOS */}
      <Modal visible={takesModalVisible} animationType="slide" transparent={true}>
        <View style={styles.takesModalBackdrop}>
          <View style={[styles.takesSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.takesHeader}>
              <Text style={styles.takesTitle}>Vídeos Gravados ({recordedTakes.length})</Text>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setTakesModalVisible(false)}
              >
                <Feather name="x" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {recordedTakes.length === 0 ? (
              <View style={styles.emptyTakesBox}>
                <Feather name="video-off" size={36} color="#475569" />
                <Text style={styles.emptyTakesText}>
                  Nenhum vídeo gravado ainda nesta sessão.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {recordedTakes.map((take, idx) => (
                  <View key={take.id} style={styles.takeItem}>
                    <View style={styles.takeInfo}>
                      <View style={styles.takeIconBox}>
                        <Feather name="video" size={18} color="#38BDF8" />
                      </View>
                      <View>
                        <Text style={styles.takeName}>
                          Take #{recordedTakes.length - idx} • {take.createdAt}
                        </Text>
                        <Text style={styles.takeSub}>
                          Duração: {formatTime(take.duration)}{' '}
                          {take.savedToGallery ? '• Na Galeria' : ''}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.takeShareBtn}
                      onPress={() => shareVideoFile(take.uri)}
                    >
                      <Feather name="share-2" size={15} color="#FFF" />
                      <Text style={styles.takeShareBtnText}>Salvar / Enviar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenCamera: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  permissionIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // TELEPROMPTER NO TOPO (COLADO NA LENTE)
  prompterWrapper: {
    position: 'absolute',
    left: 6,
    right: 6,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  prompterTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  modeSwitchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  voicePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
  },
  voicePulseDotActive: {
    backgroundColor: '#34D399',
    transform: [{ scale: 1.25 }],
  },
  lensDotRecording: {
    backgroundColor: '#EF4444',
  },
  modeSwitchText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  prompterQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconActionBtnActive: {
    backgroundColor: '#0284C7',
  },
  scriptEditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.32)',
  },
  scriptEditChipText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '700',
  },

  // MODO FRASES POR VOZ
  phraseListContent: {
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  phraseCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
  },
  phraseCardCurrent: {
    backgroundColor: 'rgba(56, 189, 248, 0.13)',
    borderLeftWidth: 3.5,
    borderLeftColor: '#38BDF8',
  },
  phraseCardPast: {
    opacity: 0.5,
  },
  phraseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  phraseIndexBadge: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  phraseVoiceHint: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  phraseProgressTrack: {
    height: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  phraseProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // MODO CONTÍNUO
  readingFocusHighlight: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
    zIndex: 5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  prompterText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // CONTAGEM REGRESSIVA
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  countdownBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#38BDF8',
  },
  countdownNumber: {
    color: '#FFF',
    fontSize: 56,
    fontWeight: '900',
  },

  // TOAST DE VÍDEO SALVO
  savedCardToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    zIndex: 40,
  },
  savedCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedCardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  savedCardSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  savedCardShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  savedCardShareText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // HUD INFERIOR
  bottomHud: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  adjustPopover: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  adjustLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepperCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'center',
  },

  quickPillsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 14, 22, 0.8)',
    borderRadius: 24,
    padding: 4,
    gap: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
  },
  quickPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  quickPillCountdownOn: {
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
  },
  quickPillText: {
    color: '#F1F5F9',
    fontSize: 11,
    fontWeight: '700',
  },

  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
  },
  sideCircleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  takesBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0284C7',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  takesBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  shutterCenterGroup: {
    alignItems: 'center',
  },
  liveTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8,
    gap: 6,
  },
  liveRedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  liveTimerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  shutterOuterRecording: {
    borderColor: '#EF4444',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EF4444',
  },
  shutterInnerStop: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },

  // MODAL DE ROTEIRO
  modalContainer: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearBtnText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  editorTip: {
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  scriptInput: {
    flex: 1,
    padding: 20,
    color: '#F8FAFC',
    fontSize: 18,
    lineHeight: 28,
  },

  // MODAL DE TAKES GRAVADOS
  takesModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  takesSheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#1E293B',
  },
  takesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  takesTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  closeModalBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTakesBox: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyTakesText: {
    color: '#64748B',
    fontSize: 14,
  },
  takeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  takeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  takeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  takeName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  takeSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  takeShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  takeShareBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
