import { SongMetadata } from '@/types/song';

const HISTORY_KEY = 'song_recognition_history';
const MAX_HISTORY_ITEMS = 50;

export interface HistoryEntry extends SongMetadata {
  recognizedAt: string;
}

export function addToHistory(song: SongMetadata): void {
  const history = getHistory();
  
  // Check if song already exists in history
  const existingIndex = history.findIndex(
    entry => entry.title === song.title && entry.artist === song.artist
  );

  // Create new entry with timestamp
  const newEntry: HistoryEntry = {
    ...song,
    recognizedAt: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    // Update existing entry
    history[existingIndex] = newEntry;
  } else {
    // Add new entry at the beginning
    history.unshift(newEntry);
    
    // Keep only the most recent MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history.pop();
    }
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory(): HistoryEntry[] {
  try {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error reading history:', error);
    return [];
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function removeFromHistory(index: number): void {
  const history = getHistory();
  history.splice(index, 1);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
