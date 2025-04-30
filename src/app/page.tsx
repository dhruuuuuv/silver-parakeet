'use client';

import { useState } from 'react';
import AudioRecorder from '@/components/AudioRecorder';
import SongDisplay from '@/components/SongDisplay';
import History from '@/components/History';
import { SongMetadata, HistoryEntry } from '@/types/song';
import { addToHistory } from '@/utils/history';

export default function Home() {
  const [recognizedSong, setRecognizedSong] = useState<SongMetadata | null>(null);

  const handleSongRecognized = (song: SongMetadata) => {
    setRecognizedSong(song);
    addToHistory({ ...song, id: crypto.randomUUID(), recognizedAt: new Date().toISOString() });
  };

  const handleHistorySongSelect = (song: HistoryEntry) => {
    setRecognizedSong(song);
  };

  return (
    <div className="min-h-screen bg-grayscale-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <header className="text-center border-b border-grayscale-200 pb-4">
            <h1 className="text-3xl font-mono text-grayscale-900">
              Music Recognition
            </h1>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col gap-8">
            {/* Audio Recorder */}
            <div className="bg-grayscale-100 p-6 rounded border border-grayscale-200">
              <AudioRecorder onSongRecognized={handleSongRecognized} />
            </div>

            {/* Song Display */}
            {recognizedSong && (
              <div className="bg-grayscale-100 rounded border border-grayscale-200">
                <SongDisplay song={recognizedSong} />
              </div>
            )}

            {/* History */}
            <div className="bg-grayscale-100 p-6 rounded border border-grayscale-200">
              <History onSelectSong={handleHistorySongSelect} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}