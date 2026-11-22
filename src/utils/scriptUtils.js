export const STORAGE_KEY = '@mobileprompter_script_v3';

export const DEFAULT_SCRIPT = `Olá! Agora o OLV Prompter ocupa 100% da tela e tem modo de rolagem por voz!

No modo Frases por Voz, você vai falando esta frase em destaque bem colada na câmera frontal.

Assim que terminar de falar a frase, ela passa automaticamente para a próxima!

Se você fizer uma pausa para respirar ou pensar, o teleprompter espera por você sem correr na frente.

Você também pode tocar em qualquer frase na tela para pular ou voltar quando quiser!`;

export const PROMPTER_MODES = [
  {
    id: 'voice_phrases',
    label: 'Frases (Voz)',
    shortLabel: 'Frases',
    icon: 'mic',
    description: 'Avança frase por frase conforme você fala e espera nas pausas.',
  },
  {
    id: 'voice_scroll',
    label: 'Contínuo (Voz)',
    shortLabel: 'Contínuo',
    icon: 'activity',
    description: 'Rola o texto suavemente apenas enquanto detecta sua voz.',
  },
  {
    id: 'auto_scroll',
    label: 'Auto (Timer)',
    shortLabel: 'Timer',
    icon: 'clock',
    description: 'Rolagem automática em velocidade constante sem usar o microfone.',
  },
];

// Divide o roteiro em frases confortáveis para leitura próxima à lente
export function splitScriptIntoPhrases(text) {
  if (!text || !text.trim()) return ['(Roteiro vazio - toque em Roteiro para editar)'];
  const rawLines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const phrases = [];
  for (const line of rawLines) {
    const sentences = line
      .split(/(?<=[.!?…;])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      if (words.length <= 14) {
        phrases.push(sentence);
      } else {
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

export function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function getScriptStats(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { words: 0, phrases: 0, estimatedSec: 0 };
  }
  const words = trimmed.split(/\s+/).length;
  const phrases = splitScriptIntoPhrases(trimmed).length;
  // ~140 palavras por minuto (~2.33 palavras/seg)
  const estimatedSec = Math.max(1, Math.round(words / 2.33));
  return { words, phrases, estimatedSec };
}
