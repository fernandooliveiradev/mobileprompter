import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { DEFAULT_SCRIPT, formatTime, getScriptStats } from '../utils/scriptUtils';
import { BRAND } from '../theme/brand';

export function ScriptEditorModal({ visible, script, onChangeScript, onDone }) {
  const stats = getScriptStats(script);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onDone}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrow}>
                {stats.words} PALAVRAS · {stats.phrases} FRASES · ~{formatTime(stats.estimatedSec)}
              </Text>
            </View>
            <Text style={styles.modalTitle}>Roteiro</Text>
          </View>

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

        <View style={styles.editorTipBox}>
          <Text style={styles.editorTip}>
            Separe cada frase com ponto final ou quebra de linha para o modo Frases (Voz) dividir com precisão.
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
      </SafeAreaView>
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.gold,
  },
  eyebrow: {
    fontFamily: BRAND.fontMono,
    color: BRAND.lilac,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  modalTitle: {
    fontFamily: BRAND.fontDisplay,
    color: BRAND.white,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 6,
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
  editorTipBox: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    backgroundColor: BRAND.panel,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  editorTip: {
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  scriptInput: {
    flex: 1,
    padding: 18,
    color: BRAND.white,
    fontSize: 18,
    lineHeight: 28,
  },
});
