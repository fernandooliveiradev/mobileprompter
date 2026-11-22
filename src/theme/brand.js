import { Platform } from 'react-native';

/**
 * Identidade visual baseada em fernandodeoliveira.pro
 * Estética editorial/técnica: fundo ink profundo, bordas hairline 1px,
 * cantos arquitetônicos retos, acentos em violeta/lilás e dourado técnico.
 */
export const BRAND = {
  ink: '#070714',
  deep: '#04040B',
  panel: '#0E0D1C',
  panelAlt: '#141226',
  line: 'rgba(218, 210, 255, 0.16)',
  lineStrong: 'rgba(198, 174, 255, 0.45)',
  white: '#F5F3FF',
  muted: '#AAA8BA',
  dim: '#6E6B80',
  violet: '#8657FF',
  violetSoft: 'rgba(134, 87, 255, 0.14)',
  lilac: '#C6AEFF',
  gold: '#FFC766',
  goldSoft: 'rgba(255, 199, 102, 0.12)',
  rec: '#EF4444',
  radius: 2,
  fontMono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  }),
  fontDisplay: Platform.select({
    web: "'Space Grotesk', system-ui, -apple-system, sans-serif",
    default: undefined,
  }),
};
