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
import { BRAND } from '../theme/brand';
import { formatTime } from '../utils/scriptUtils';

const TABS = [
  { id: 'scroll', label: 'ROLAGEM' },
  { id: 'visual', label: 'VISUAL' },
  { id: 'camera', label: 'CÂMERA' },
  { id: 'takes', label: 'TAKES' },
];

const SCROLL_MODE_OPTIONS = [
  { label: 'Contínuo', value: 'continuous' },
  { label: 'Por Frases', value: 'phrases' },
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

const ALIGN_OPTIONS = [
  { label: 'Esquerda', value: 'left', icon: 'align-left' },
  { label: 'Centro', value: 'center', icon: 'align-center' },
  { label: 'Direita', value: 'right', icon: 'align-right' },
];

const COUNTDOWN_PRESETS = [
  { label: 'OFF', value: 0 },
  { label: '3S', value: 3 },
  { label: '5S', value: 5 },
  { label: '7S', value: 7 },
  { label: '10S', value: 10 },
];

const SPEED_PRESETS = [
  { label: '2.0', value: 2.0 },
  { label: '3.4', value: 3.4 },
  { label: '5.0', value: 5.0 },
  { label: '7.5', value: 7.5 },
  { label: '10', value: 10.0 },
];

const roundSpeed = (val) => Math.round(Math.min(10, Math.max(1, val)) * 10) / 10;

export function SettingsModal({
  visible,
  activeTab,
  onChangeTab,
  onClose,
  bottomInset,
  // Rolagem
  scrollMode,
  onChangeScrollMode,
  speed,
  onChangeSpeed,
  countdownSeconds,
  onChangeCountdownSeconds,
  isScrolling,
  onTogglePreviewScroll,
  onResetScroll,
  // Visual
  fontSize,
  onChangeFontSize,
  textAlign,
  onChangeTextAlign,
  bgOpacity,
  onChangeBgOpacity,
  boxSizeMode,
  onChangeBoxSizeMode,
  // Câmera
  facing,
  onChangeFacing,
  // Takes
  takes = [],
  onShareTake,
  onDeleteTake,
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
                <Text style={styles.eyebrow}>OLV PROMPTER · CONFIGURAÇÃO</Text>
              </View>
              <Text style={styles.headerTitle}>Ajustes do estúdio</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={16} color={BRAND.white} />
            </TouchableOpacity>
          </View>

          {/* 4 Tabs em linha */}
          <View style={styles.tabsBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const badge = tab.id === 'takes' && takes.length > 0 ? ` (${takes.length})` : '';
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => onChangeTab(tab.id)}
                >
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.label}
                    {badge}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tabContentInner}
          >
            {activeTab === 'scroll' && (
              <>
                {/* Estilo de rolagem: Contínuo ou Por Frases */}
                <View style={styles.controlBlock}>
                  <Text style={styles.controlTitle}>Estilo de rolagem</Text>
                  <Text style={[styles.controlSub, { marginBottom: 10 }]}>
                    {scrollMode === 'phrases'
                      ? 'Exibe frase por frase no ritmo do timer (toque para pular)'
                      : 'Texto contínuo rolando suavemente sem pausas'}
                  </Text>
                  <View style={styles.segmentedRow}>
                    {SCROLL_MODE_OPTIONS.map((opt) => {
                      const active = scrollMode === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.segmentBtn, active && styles.segmentBtnGold]}
                          onPress={() => onChangeScrollMode(opt.value)}
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

                {/* Velocidade granular (passos de 0.2) */}
                <View style={styles.controlBlock}>
                  <View style={styles.controlRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.controlTitle}>Velocidade de rolagem</Text>
                      <Text style={styles.controlSub}>
                        Ajuste fino de 0.2 em 0.2 (salvo automaticamente)
                      </Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => onChangeSpeed(roundSpeed(speed - 0.2))}
                      >
                        <Feather name="minus" size={14} color={BRAND.white} />
                      </TouchableOpacity>
                      <Text style={styles.stepperVal}>{speed.toFixed(1)}X</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => onChangeSpeed(roundSpeed(speed + 0.2))}
                      >
                        <Feather name="plus" size={14} color={BRAND.white} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.levelTrack}>
                    <View style={[styles.levelFill, { width: `${speed * 10}%` }]} />
                  </View>

                  {/* Atalhos rápidos para chegar perto e refinar de 0.2 em 0.2 */}
                  <View style={[styles.segmentedRow, { marginTop: 10 }]}>
                    {SPEED_PRESETS.map((opt) => {
                      const active = Math.abs(speed - opt.value) < 0.05;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[styles.segmentBtn, active && styles.segmentBtnGold]}
                          onPress={() => onChangeSpeed(opt.value)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              active && styles.segmentTextGold,
                            ]}
                          >
                            {opt.label}X
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Testar velocidade ao vivo */}
                  <View style={[styles.segmentedRow, { marginTop: 12 }]}>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        styles.segmentBtnRow,
                        isScrolling && styles.segmentBtnGold,
                      ]}
                      onPress={onTogglePreviewScroll}
                    >
                      <Feather
                        name={isScrolling ? 'pause' : 'play'}
                        size={12}
                        color={isScrolling ? BRAND.gold : BRAND.white}
                      />
                      <Text
                        style={[
                          styles.segmentText,
                          isScrolling ? styles.segmentTextGold : styles.segmentTextActive,
                        ]}
                      >
                        {isScrolling ? 'PAUSAR TESTE' : 'TESTAR ROLAGEM'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.segmentBtn, styles.segmentBtnRow, { flex: 0.65 }]}
                      onPress={onResetScroll}
                    >
                      <Feather name="rotate-ccw" size={12} color={BRAND.muted} />
                      <Text style={styles.segmentText}>INÍCIO</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Contagem regressiva 0 / 3s a 10s */}
                <View style={styles.controlBlock}>
                  <View style={styles.controlRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.controlTitle}>Contagem regressiva</Text>
                      <Text style={styles.controlSub}>
                        Tempo antes de iniciar a gravação (3s a 10s)
                      </Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() =>
                          onChangeCountdownSeconds(
                            countdownSeconds <= 3 ? 0 : countdownSeconds - 1
                          )
                        }
                      >
                        <Feather name="minus" size={14} color={BRAND.white} />
                      </TouchableOpacity>
                      <Text style={styles.stepperVal}>
                        {countdownSeconds === 0 ? 'OFF' : `${countdownSeconds}S`}
                      </Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() =>
                          onChangeCountdownSeconds(
                            countdownSeconds === 0
                              ? 3
                              : Math.min(10, countdownSeconds + 1)
                          )
                        }
                      >
                        <Feather name="plus" size={14} color={BRAND.white} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.segmentedRow, { marginTop: 12 }]}>
                    {COUNTDOWN_PRESETS.map((opt) => {
                      const active = countdownSeconds === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[styles.segmentBtn, active && styles.segmentBtnGold]}
                          onPress={() => onChangeCountdownSeconds(opt.value)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              active && styles.segmentTextGold,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
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
                  <Text style={styles.controlTitle}>Alinhamento do texto</Text>
                  <Text style={[styles.controlSub, { marginBottom: 10 }]}>
                    Escolha onde fica mais natural para o seu olhar na câmera
                  </Text>
                  <View style={styles.segmentedRow}>
                    {ALIGN_OPTIONS.map((opt) => {
                      const active = textAlign === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.segmentBtn,
                            styles.segmentBtnRow,
                            active && styles.segmentBtnActive,
                          ]}
                          onPress={() => onChangeTextAlign(opt.value)}
                        >
                          <Feather
                            name={opt.icon}
                            size={13}
                            color={active ? BRAND.gold : BRAND.muted}
                          />
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

            {activeTab === 'takes' && (
              <>
                {takes.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyNum}>00</Text>
                    <Text style={styles.emptyText}>
                      Nenhum vídeo gravado ainda nesta sessão.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.takesList}>
                    {takes.map((take, idx) => {
                      const num = String(takes.length - idx).padStart(2, '0');
                      return (
                        <View key={take.id} style={styles.takeItem}>
                          <View style={styles.takeInfo}>
                            <Text style={styles.takeNum}>{num}</Text>
                            <View>
                              <Text style={styles.takeName}>
                                Take #{takes.length - idx} · {take.createdAt}
                              </Text>
                              <Text style={styles.takeSub}>
                                {formatTime(take.duration)}
                                {take.savedToGallery ? ' · NA GALERIA' : ''}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.takeActions}>
                            <TouchableOpacity
                              style={styles.deleteBtn}
                              onPress={() => onDeleteTake(take)}
                            >
                              <Feather name="trash-2" size={14} color={BRAND.rec} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.shareBtn}
                              onPress={() => onShareTake(take.uri)}
                            >
                              <Text style={styles.shareBtnText}>ENVIAR ↗</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '66%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: BRAND.gold,
    backgroundColor: 'rgba(134, 87, 255, 0.08)',
  },
  tabLabel: {
    fontFamily: BRAND.fontMono,
    color: BRAND.muted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.7,
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
  segmentBtnRow: {
    flexDirection: 'row',
    gap: 6,
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
    letterSpacing: 0.8,
  },
  segmentTextActive: {
    color: BRAND.white,
  },
  segmentTextGold: {
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
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: BRAND.panel,
    gap: 6,
  },
  emptyNum: {
    fontFamily: BRAND.fontMono,
    fontSize: 24,
    color: BRAND.dim,
  },
  emptyText: {
    color: BRAND.muted,
    fontSize: 13,
  },
  takesList: {
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
  },
  takeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
  },
  takeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  takeNum: {
    fontFamily: BRAND.fontMono,
    fontSize: 12,
    color: BRAND.gold,
  },
  takeName: {
    fontFamily: BRAND.fontDisplay,
    color: BRAND.white,
    fontSize: 14,
    fontWeight: '600',
  },
  takeSub: {
    fontFamily: BRAND.fontMono,
    color: BRAND.muted,
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  takeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: BRAND.radius,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    borderWidth: 1,
    borderColor: BRAND.lineStrong,
    backgroundColor: BRAND.panel,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BRAND.radius,
  },
  shareBtnText: {
    fontFamily: BRAND.fontMono,
    color: BRAND.lilac,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
