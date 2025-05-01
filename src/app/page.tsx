'use client';

import { useState } from 'react';
import AudioRecorder from '@/components/AudioRecorder';
import SongDisplay from '@/components/SongDisplay';
import { SongMetadata } from '@/types/song';

export default function Home() {
  const [currentSong, setCurrentSong] = useState<SongMetadata | null>(null);

  return (
    <div className="space-y-12 py-24 mx-auto max-w-3xl">
      <div className="text-left">
        <h1 className="text-4xl font-bold font-triptych max-w-md">where everything is music*</h1>
      </div>

      <AudioRecorder onSongRecognized={setCurrentSong} />

      {currentSong && <SongDisplay song={currentSong} />}
    </div>
  );
}