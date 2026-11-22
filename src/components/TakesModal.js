import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatTime } from '../utils/scriptUtils';
import { BRAND } from '../theme/brand';

export function TakesModal({ visible, takes, bottomInset, onClose, onShare }) {
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
          <View style={styles.header}>
            <View>
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrow}>SESSÃO · {takes.length} GRAVAÇÕES</Text>
              </View>
              <Text style={styles.title}>Takes gravados</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={16} color={BRAND.white} />
            </TouchableOpacity>
          </View>

          {takes.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyNum}>00</Text>
              <Text style={styles.emptyText}>
                Nenhum vídeo gravado ainda nesta sessão.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.listScroll}>
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

                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => onShare(take.uri)}
                    >
                      <Text style={styles.shareBtnText}>ENVIAR ↗</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 4, 11, 0.55)',
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    letterSpacing: 1.5,
    color: BRAND.lilac,
  },
  title: {
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
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
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
  listScroll: {
    maxHeight: 340,
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
  },
  takeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
  },
  takeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    marginTop: 3,
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
