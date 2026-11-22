import { useState, useRef, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAudioStream } from 'expo-audio';

const VOICE_THRESHOLDS = { 1: 0.026, 2: 0.014, 3: 0.007 };

export function useVoiceActivity({ isActive, micGranted, micSensitivity }) {
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isSpeakingNow, setIsSpeakingNow] = useState(false);
  const [simulatedSpeaking, setSimulatedSpeaking] = useState(false);

  const lastSpokenTimestampRef = useRef(0);
  const isSpeakingRef = useRef(false);

  const activeThreshold = VOICE_THRESHOLDS[micSensitivity] || 0.014;

  const handleAudioBuffer = useCallback(
    (buffer) => {
      if (Platform.OS === 'web') return;
      try {
        if (!buffer?.data) return;
        const samples = new Int16Array(buffer.data);
        if (samples.length === 0) return;

        let sumSquares = 0;
        const step = 4;
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

  // Simulação de voz no modo Preview Web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!isActive || !simulatedSpeaking) {
      isSpeakingRef.current = false;
      setIsSpeakingNow(false);
      setVoiceLevel(0);
      return;
    }

    isSpeakingRef.current = true;
    setIsSpeakingNow(true);
    lastSpokenTimestampRef.current = Date.now();

    const interval = setInterval(() => {
      lastSpokenTimestampRef.current = Date.now();
      setVoiceLevel(0.45 + Math.random() * 0.45);
    }, 120);

    return () => clearInterval(interval);
  }, [isActive, simulatedSpeaking]);

  // Captura nativa no Android/iOS
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!micGranted) return;

    if (isActive) {
      try {
        audioStream?.start?.();
      } catch (e) {}
    } else {
      try {
        if (isAudioStreaming) audioStream?.stop?.();
      } catch (e) {}
      isSpeakingRef.current = false;
      setIsSpeakingNow(false);
      setVoiceLevel(0);
    }

    return () => {
      try {
        audioStream?.stop?.();
      } catch (e) {}
    };
  }, [isActive, micGranted]);

  const forceStartStream = useCallback(() => {
    if (Platform.OS === 'web') return;
    try {
      audioStream?.start?.();
    } catch (e) {}
  }, [audioStream]);

  return {
    voiceLevel,
    isSpeakingNow,
    isSpeakingRef,
    lastSpokenTimestampRef,
    forceStartStream,
    simulatedSpeaking,
    setSimulatedSpeaking,
  };
}
