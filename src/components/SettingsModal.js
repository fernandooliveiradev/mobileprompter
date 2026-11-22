import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PROMPTER_MODES } from '../utils/scriptUtils';
import { BRAND } from '../theme/brand';

const TABS = [
  { id: 'voice', num: '01', label: 'MODO & VOZ' },
  { id: 'visual', num: '02', label: 'VISUAL' },
  { id: 'camera', num: '03', label: 'CÂMERA' },
];

const OPACITY_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '90%', value: 0.9 },
];

const BOX_SIZE_OPTIONS = [
  { label: 'Compacta', value: 0 },
  { label: 'Média', value: 1 },
  { label: 'Grande', value: 2 },
];

const MIC_OPTIONS = [
  { label: 'Baixa', value: 1 },
  { label: 'Normal', value: 2 },
  { label: 'Alta', value: 3 },
];

export function SettingsModal({
  visible,
  activeTab,
  onChangeTab,
  onClose,
  bottomInset,
  prompterMode,
  onSelectMode,
  speed,
  onChangeSpeed,
  micSensitivity,
  onChangeMicSensitivity,
  voiceLevel,
  isVoiceMode,
  fontSize,
  onChangeFontSize,
  bgOpacity,
  onChangeBgOpacity,
  boxSizeMode,
  onChangeBoxSizeMode,
  useCountdown,
  onToggleCountdown,
  facing,
  onChangeFacing,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 20) }]}>
          {/* Header Editorial */}
          <View style={styles.header}>
            <View>
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrow}>ESTÚDIO · CONFIGURAÇÃO</Text>
              </View>
              <Text style={styles.headerTitle}>Ajustes de gravação</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={16} color={BRAND.white} />
            </TouchableOpacity>
          </View>

          {/* Tabs com linha editorial (sem pílula genérica) */}
          <View style={styles.tabsBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => onChangeTab(tab.id)}
                >
                  <Text style={[styles.tabNum, isActive && styles.tabNumActive]}>
                    {tab.num}
                  </Text>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Conteúdo da Aba */}
          <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tabContentInner}
          >
            {activeTab === 'voice' && (
              <>
                <View style={styles.listBlock}>
                  {PROMPTER_MODES.map((mode, idx) => {
                    const selected = prompterMode === mode.id;
                    const num = String(idx + 1).padStart(2, '0');
                    return (
                      <TouchableOpacity
                        key={mode.id}
                        style={[
                          styles.modeRow,
                          selected && styles.modeRowSelected,
                          idx === PROMPTER_MODES.length - 1 && styles.rowNoBorder,
                        ]}
                        onPress={() => onSelectMode(mode.id)}
                      >
                        <Text style={[styles.rowNum, selected && styles.rowNumActive]}>
                          {num}
                        </Text>
                        <View style={styles.modeTextCol}>
                          <Text
                            style={[
                              styles.modeTitle,
                              selected && styles.modeTitleSelected,
                            ]}
                          >
                            {mode.label}
                          </Text>
                          <Text style={styles.modeDesc}>{mode.description}</Text>
                        </View>
                        <View
                          style={[
                            styles.radioMark,
                            selected && styles.radioMarkSelected,
                          ]}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Ritmo / Velocidade */}
                <View style={styles.controlBlock}>
                  <View style={styles.controlRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.controlTitle}>
                        {prompterMode === 'voice_phrases'
                          ? 'Ritmo das frases'
                          : 'Velocidade de rolagem'}
                      </Text>
                      <Text style={styles.controlSub}>
                        Cadência do texto acompanhando sua leitura
                      </Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => onChangeSpeed(Math.max(1, speed - 1))}
                      >
                        <Feather name="minus" size={14} color={BRAND.white} />
                      </TouchableOpacity>
                      <Text style={styles.stepperVal}>{speed}X</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => onChangeSpeed(Math.min(10, speed + 1))}
                      >
                        <Feather name="plus" size={14} color={BRAND.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.levelTrack}>
                    <View style={[styles.levelFill, { width: `${speed * 10}%` }]} />
                  </View>
                </View>

                {/* Sensibilidade do Microfone */}
                {isVoiceMode && (
                  <View style={styles.controlBlock}>
                    <View style={styles.controlRowHeader}>
                      <Text style={styles.controlTitle}>Sensibilidade do microfone</Text>
                      <View style={styles.liveMeterWrap}>
                        <View
                          style={[
                            styles.liveMeterFill,
                            { width: `${Math.round(voiceLevel * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.segmentedRow}>
                      {MIC_OPTIONS.map((opt) => {
                        const active = micSensitivity === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[
                              styles.segmentBtn,
                              active && styles.segmentBtnGold,
                            ]}
                            onPress={() => onChangeMicSensitivity(opt.value)}
                          >
                            <Text
                              style={[
                                styles.segmentText,
                                active && styles.segmentTextGold,
                              ]}
                            >
                              {opt.label.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </>
            )}

            {activeTab === 'visual' && (
              <>
                <View style={styles.controlBlock}>
                  <View style={styles.controlRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.controlTitle}>Tamanho da letra</Text>
                      <Text style={styles.controlSub}>
                        Atualiza ao vivo na área de leitura acima
                      </Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => onChangeFontSize(Math.max(16, fontSize - 2))}
                      >
                        <Feather name="minus" size={14} color={BRAND.white} />
                      </TouchableOpacity>
                      <Text style={styles.stepperVal}>{fontSize}PX</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => onChangeFontSize(Math.min(44, fontSize + 2))}
                      >
                        <Feather name="plus" size={14} color={BRAND.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.controlBlock}>
                  <Text style={styles.controlTitle}>Opacidade do fundo</Text>
                  <Text style={[styles.controlSub, { marginBottom: 10 }]}>
                    Contraste entre o texto e a imagem da câmera
                  </Text>
                  <View style={styles.segmentedRow}>
                    {OPACITY_OPTIONS.map((opt) => {
                      const active = Math.abs(bgOpacity - opt.value) < 0.05;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                          onPress={() => onChangeBgOpacity(opt.value)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              active && styles.segmentTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.controlBlock}>
                  <Text style={styles.controlTitle}>Altura da área de leitura</Text>
                  <Text style={[styles.controlSub, { marginBottom: 10 }]}>
                    Quanto menor, mais colado na lente frontal fica o seu olhar
                  </Text>
                  <View style={styles.segmentedRow}>
                    {BOX_SIZE_OPTIONS.map((opt) => {
                      const active = boxSizeMode === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                          onPress={() => onChangeBoxSizeMode(opt.value)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              active && styles.segmentTextActive,
                            ]}
                          >
                            {opt.label.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {activeTab === 'camera' && (
              <>
                <View style={styles.controlBlock}>
                  <View style={styles.controlRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.controlTitle}>Contagem regressiva</Text>
                      <Text style={styles.controlSub}>
                        3 segundos para alinhar o olhar antes de iniciar
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        useCountdown && styles.toggleBtnOn,
                      ]}
                      onPress={onToggleCountdown}
                    >
                      <Text
                        style={[
                          styles.toggleBtnText,
                          useCountdown && styles.toggleBtnTextOn,
                        ]}
                      >
                        {useCountdown ? '3S · ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.controlBlock}>
                  <Text style={styles.controlTitle}>Lente da câmera</Text>
                  <Text style={[styles.controlSub, { marginBottom: 10 }]}>
                    Frontal espelhada para gravar lendo o teleprompter
                  </Text>
                  <View style={styles.segmentedRow}>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        facing === 'front' && styles.segmentBtnActive,
                      ]}
                      onPress={() => onChangeFacing('front')}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          facing === 'front' && styles.segmentTextActive,
                        ]}
                      >
                        FRONTAL
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        facing === 'back' && styles.segmentBtnActive,
                      ]}
                      onPress={() => onChangeFacing('back')}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          facing === 'back' && styles.segmentTextActive,
                        ]}
                      >
                        TRASEIRA
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.infoFoot}>
                  <Text style={styles.infoFootLabel}>PERFIL DE VÍDEO</Text>
                  <Text style={styles.infoFootText}>
                    1080p · Estabilização automática · Salvamento direto na galeria
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 4, 11, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: BRAND.ink,
    borderTopWidth: 1,
    borderTopColor: BRAND.lineStrong,
    paddingHorizontal: 18,
    paddingTop: 16,
    maxHeight: '66%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
    fontSize: 10,
    letterSpacing: 1.6,
    color: BRAND.lilac,
  },
  headerTitle: {
    fontFamily: BRAND.fontDisplay,
    color: BRAND.white,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: BRAND.radius,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: BRAND.panel,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BRAND.line,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: BRAND.gold,
    backgroundColor: 'rgba(134, 87, 255, 0.08)',
  },
  tabNum: {
    fontFamily: BRAND.fontMono,
    fontSize: 10,
    color: BRAND.dim,
  },
  tabNumActive: {
    color: BRAND.gold,
  },
  tabLabel: {
    fontFamily: BRAND.fontMono,
    color: BRAND.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  tabLabelActive: {
    color: BRAND.white,
  },
  tabContent: {
    flexGrow: 0,
  },
  tabContentInner: {
    gap: 12,
    paddingBottom: 8,
  },
  listBlock: {
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: BRAND.panel,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  modeRowSelected: {
    backgroundColor: BRAND.violetSoft,
    borderLeftColor: BRAND.gold,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  rowNum: {
    fontFamily: BRAND.fontMono,
    fontSize: 11,
    color: BRAND.dim,
  },
  rowNumActive: {
    color: BRAND.gold,
  },
  modeTextCol: {
    flex: 1,
  },
  modeTitle: {
    fontFamily: BRAND.fontDisplay,
    color: BRAND.white,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modeTitleSelected: {
    color: '#FFFFFF',
  },
  modeDesc: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  radioMark: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: BRAND.dim,
  },
  radioMarkSelected: {
    backgroundColor: BRAND.gold,
    borderColor: BRAND.gold,
  },
  controlBlock: {
    backgroundColor: BRAND.panel,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 14,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  controlRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  controlTitle: {
    fontFamily: BRAND.fontDisplay,
    color: BRAND.white,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  controlSub: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: BRAND.radius,
    backgroundColor: BRAND.ink,
    borderWidth: 1,
    borderColor: BRAND.lineStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperVal: {
    fontFamily: BRAND.fontMono,
    color: BRAND.gold,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  levelTrack: {
    height: 2,
    backgroundColor: BRAND.line,
    marginTop: 12,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    backgroundColor: BRAND.lilac,
  },
  liveMeterWrap: {
    width: 72,
    height: 4,
    backgroundColor: BRAND.ink,
    borderWidth: 1,
    borderColor: BRAND.line,
    overflow: 'hidden',
  },
  liveMeterFill: {
    height: '100%',
    backgroundColor: BRAND.gold,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BRAND.radius,
    backgroundColor: BRAND.ink,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  segmentBtnActive: {
    backgroundColor: BRAND.violetSoft,
    borderColor: BRAND.lilac,
  },
  segmentBtnGold: {
    backgroundColor: BRAND.goldSoft,
    borderColor: BRAND.gold,
  },
  segmentText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  segmentTextActive: {
    color: BRAND.white,
  },
  segmentTextGold: {
    color: BRAND.gold,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BRAND.radius,
    backgroundColor: BRAND.ink,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  toggleBtnOn: {
    backgroundColor: BRAND.goldSoft,
    borderColor: BRAND.gold,
  },
  toggleBtnText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  toggleBtnTextOn: {
    color: BRAND.gold,
  },
  infoFoot: {
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    paddingTop: 12,
  },
  infoFootLabel: {
    fontFamily: BRAND.fontMono,
    color: BRAND.gold,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  infoFootText: {
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 17,
  },
});
