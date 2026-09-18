export interface WordSync {
  word: string;
  start: number;
  end: number;
}

export interface LyricLine {
  text: string;
  start: number;
  end: number;
  words?: WordSync[];
}

export interface LyricsPayload {
  trackId: string;
  isWordSynced: boolean;
  isLineSynced: boolean;
  lyrics: LyricLine[];
}
