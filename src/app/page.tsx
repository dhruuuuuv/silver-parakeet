'use client';

import { useState } from 'react';
import AudioRecorder from '@/components/AudioRecorder';
import SongDisplay from '@/components/SongDisplay';
import { SongMetadata } from '@/types/song';

export default function Home() {
  const [currentSong, setCurrentSong] = useState<SongMetadata | null>(null);

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1>where everything is music</h1>
        <p className="mt-2">~ ~ ~</p>
      </div>

      <AudioRecorder onSongRecognized={setCurrentSong} />

      {currentSong && <SongDisplay song={currentSong} />}
    </div>
  );
}