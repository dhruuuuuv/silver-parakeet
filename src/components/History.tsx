'use client';

import { useState, useEffect } from 'react';
import { HistoryEntry } from '@/types/song';
import { getHistory, clearHistory, removeFromHistory } from '@/utils/history';

interface HistoryProps {
  onSelectSong: (song: HistoryEntry) => void;
}

export default function History({ onSelectSong }: HistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const handleRemoveEntry = (id: string) => {
    removeFromHistory(id);
    setHistory(getHistory());
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-mono text-grayscale-900 mb-4">History</h2>
        <p className="font-mono text-grayscale-500">No songs recognized yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-mono text-grayscale-900">History</h2>
        <button
          onClick={handleClearHistory}
          className="px-3 py-1 text-sm font-mono text-orange-400 hover:text-orange-500 transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="group bg-grayscale-100 hover:bg-grayscale-200 rounded border border-grayscale-200 p-4 transition-all cursor-pointer relative"
            onClick={() => onSelectSong(entry)}
          >
            <div className="flex gap-4">
              {/* Album Art */}
              <div className="w-16 h-16 flex-shrink-0">
                <img
                  src={entry.artworkUrl || '/placeholder-album.jpg'}
                  alt={`${entry.title} artwork`}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>

              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-mono text-grayscale-900 truncate">{entry.title}</h3>
                <p className="font-mono text-grayscale-600 text-sm truncate">{entry.artist}</p>
                <p className="font-mono text-grayscale-500 text-xs mt-1">
                  {new Date(entry.recognizedAt).toLocaleString()}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveEntry(entry.id);
                }}
                className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 text-grayscale-500 hover:text-orange-400 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
