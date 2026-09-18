export interface WordSync {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface LyricLine {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
  words?: WordSync[]; // undefined if only line-synced
}

export interface LyricsPayload {
  trackId: string;
  isWordSynced: boolean;
  isLineSynced: boolean;
  lyrics: LyricLine[];
}
