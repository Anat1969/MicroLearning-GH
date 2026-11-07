export type Category = 'ביטחון עצמי' | 'התגברות על משבר' | 'אהבה עצמית' | 'קריירה' | 'רוגע';

export interface Practice {
  writePrompt: string;
  action: string;
  declaration: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  category: Category;
  message: string;
  keyPhrase: string;
  listenQuery: string;
  practice: Practice;
  verified: boolean;
  /** Three lines, 5-7-5 syllables. Original text, never song lyrics. */
  haiku?: string[];
}

export interface Entry {
  date: string;
  songId: string;
  done: boolean;
  writing: string;
  declared: boolean;
  doneAt?: string;
}

export interface Store {
  entries: Record<string, Entry>;
  customSongs: Song[];
  reminder: boolean;
}
