export const STORAGE_KEY = '@mobileprompter_script_v3';

export const DEFAULT_SCRIPT = `Oi! Que bom ter você por aqui no OLV Prompter.

Respire fundo, olhe direto para a câmera e fale no seu ritmo natural, como se estivesse conversando com um amigo.

Você pode ajustar a velocidade, o tamanho da letra e o alinhamento do texto quando quiser, direto nos ajustes.

Quando se sentir pronto, é só apertar o botão vermelho e mandar ver no seu vídeo!`;

export function splitScriptIntoPhrases(text) {
  if (!text || !text.trim()) {
    return ['(Roteiro vazio — toque em Roteiro para escrever)'];
  }

  const rawLines = text
    .split(/\n+/)
    .map((line) => line.trim())
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
  const estimatedSec = Math.max(1, Math.round(words / 2.25));
  return { words, phrases, estimatedSec };
}
