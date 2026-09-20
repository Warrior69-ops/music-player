import { LyricLine, WordSync } from '../interfaces/lyrics.interface';

export function parseLrc(rawLrc: string): {
  lyrics: LyricLine[];
  isWordSynced: boolean;
} {
  if (!rawLrc) return { lyrics: [], isWordSynced: false };

  const lines = rawLrc.split('\n');
  const parsedLines: LyricLine[] = [];
  let hasWordSync = false;

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  const wordTimeRegex = /<(\d{2}):(\d{2})\.(\d{2,3})>([^<]+)/g;

  const toSeconds = (m: string, s: string, ms: string) => {
    const milli = ms.length === 2 ? parseInt(ms) * 10 : parseInt(ms);
    return parseInt(m) * 60 + parseInt(s) + milli / 1000;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = timeRegex.exec(line);
    if (!match) continue;

    const lineStart = toSeconds(match[1], match[2], match[3]);
    const rawContent = line.replace(timeRegex, '').trim();

    // Check for Word-Synced / Syllable tags: <mm:ss.xx> Word
    const words: WordSync[] = [];
    let wordMatch: RegExpExecArray | null;

    while ((wordMatch = wordTimeRegex.exec(rawContent)) !== null) {
      hasWordSync = true;
      const wordStart = toSeconds(wordMatch[1], wordMatch[2], wordMatch[3]);
      const wordText = wordMatch[4];
      words.push({
        word: wordText,
        start: wordStart,
        end: wordStart + 0.4, // estimated default until adjusted by next word
      });
    }

    // Correct word end-times to match next word's start time
    for (let w = 0; w < words.length - 1; w++) {
      words[w].end = words[w + 1].start;
    }

    const cleanText =
      hasWordSync && words.length > 0
        ? words
            .map((w) => w.word)
            .join('')
            .trim()
        : rawContent;

    parsedLines.push({
      text: cleanText,
      start: lineStart,
      end: 0, // calculated in post-processing
      words: words.length > 0 ? words : undefined,
    });
  }

  // Calculate line end times based on the next line's start time
  for (let i = 0; i < parsedLines.length; i++) {
    if (i < parsedLines.length - 1) {
      parsedLines[i].end = parsedLines[i + 1].start;
    } else {
      parsedLines[i].end = parsedLines[i].start + 4.0; // fallback duration for last line
    }

    // If line has explicit word tags, clamp last word end-time to line end-time
    if (parsedLines[i].words && parsedLines[i].words!.length > 0) {
      const lastWord = parsedLines[i].words![parsedLines[i].words!.length - 1];
      lastWord.end = parsedLines[i].end;
    } else if (parsedLines[i].text.trim().length > 0) {
      // Synthesize progressive word timings for Apple Music-style progressive glow
      const words = parsedLines[i].text.trim().split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const lineDuration = Math.max(
          0.6,
          parsedLines[i].end - parsedLines[i].start,
        );
        const totalChars = words.reduce(
          (acc, w) => acc + Math.max(1, w.length),
          0,
        );
        let currStart = parsedLines[i].start;
        const synthWords: WordSync[] = [];

        for (let w = 0; w < words.length; w++) {
          const word = words[w];
          const wordDur =
            lineDuration * (Math.max(1, word.length) / totalChars);
          synthWords.push({
            word,
            start: Number(currStart.toFixed(2)),
            end: Number((currStart + wordDur).toFixed(2)),
          });
          currStart += wordDur;
        }
        parsedLines[i].words = synthWords;
      }
    }
  }

  return { lyrics: parsedLines, isWordSynced: true };
}
