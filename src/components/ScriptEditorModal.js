import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DEFAULT_SCRIPT, formatTime, getScriptStats } from '../utils/scriptUtils';
import { BRAND } from '../theme/brand';

export function ScriptEditorModal({
  visible,
  script,
  topInset = 0,
  bottomInset = 0,
  onChangeScript,
  onDone,
}) {
  const stats = getScriptStats(script);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onDone}>
      <KeyboardAvoidingView
        style={[
          styles.modalContainer,
          {
            paddingTop: Math.max(topInset + 8, 18),
            paddingBottom: Math.max(bottomInset, 12),
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Linha 1: Título + Botões (sempre com folga, nunca cortados) */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>
            Roteiro
          </Text>

          <View style={styles.modalHeaderActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => onChangeScript(DEFAULT_SCRIPT)}
            >
              <Feather name="rotate-ccw" size={14} color={BRAND.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => onChangeScript('')}>
              <Feather name="trash-2" size={14} color={BRAND.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
              <Text style={styles.doneBtnText}>PRONTO</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Linha 2: Telemetria do roteiro em faixa própria */}
        <View style={styles.statsBar}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.statsText} numberOfLines={1}>
            {stats.words} PALAVRAS · {stats.phrases} FRASES · ~{formatTime(stats.estimatedSec)}
          </Text>
        </View>

        <TextInput
          style={styles.scriptInput}
          multiline
          value={script}
          onChangeText={onChangeScript}
          placeholder="Cole ou escreva seu roteiro aqui..."
          placeholderTextColor={BRAND.dim}
          textAlignVertical="top"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND.ink,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontFamily: BRAND.fontDisplay,
    color: BRAND.white,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  secondaryBtn: {
    width: 36,
    height: 36,
    borderRadius: BRAND.radius,
    backgroundColor: BRAND.panel,
    borderWidth: 1,
    borderColor: BRAND.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtn: {
    height: 36,
    backgroundColor: BRAND.white,
    paddingHorizontal: 14,
    borderRadius: BRAND.radius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.ink,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    backgroundColor: BRAND.deep,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.gold,
  },
  statsText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.lilac,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  scriptInput: {
    flex: 1,
    padding: 16,
    color: BRAND.white,
    fontSize: 18,
    lineHeight: 28,
  },
});
