'use client';

import React, { useState, useEffect } from 'react';
import { SongMetadata } from '@/types/song';
import { generateLinerNotes, generateLineage, searchBandcamp } from '@/utils/api';

interface SongDisplayProps {
  song: SongMetadata;
  onClose: () => void;
}

export default function SongDisplay({ song, onClose }: SongDisplayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineage, setLineage] = useState<SongMetadata['lineage'] | null>(null);
  const [linerNotes, setLinerNotes] = useState<string | null>(null);
  const [bandcampUrl, setBandcampUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!song) return;
      
      setIsLoading(true);
      setError(null);
      setIsMetadataLoading(true);
      setGenerationProgress(0);

      try {
        // Load lineage first
        setGenerationProgress(20);
        const lineageData = await generateLineage(song);
        setLineage(lineageData);
        setGenerationProgress(40);

        // Load liner notes
        const notes = await generateLinerNotes(song);
        setLinerNotes(notes);
        setGenerationProgress(60);

        // Load Bandcamp URL
        const bandcamp = await searchBandcamp(song);
        setBandcampUrl(bandcamp);
        setGenerationProgress(80);

        // Update song with new metadata
        const updatedSong = {
          ...song,
          lineage: lineageData,
          linerNotes: notes,
          bandcampUrl: bandcamp
        };
        
        // Save to history
        const history = JSON.parse(localStorage.getItem('recognitionHistory') || '[]');
        const existingIndex = history.findIndex((item: SongMetadata) => 
          item.title === song.title && item.artist === song.artist
        );
        
        if (existingIndex !== -1) {
          history[existingIndex] = updatedSong;
        } else {
          history.unshift(updatedSong);
        }
        
        localStorage.setItem('recognitionHistory', JSON.stringify(history));
        setGenerationProgress(100);
      } catch (err) {
        console.error('Error loading metadata:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metadata');
      } finally {
        setIsLoading(false);
        setIsMetadataLoading(false);
        setGenerationProgress(0);
      }
    };

    loadMetadata();
  }, [song]);

  if (!song) {
    return null;
  }

  return (
    <div className="space-y-12">
      {isLoading && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 border-2 border-[#444] border-t-transparent rounded-full animate-spin"></div>
            <span className="font-manifold text-[#444]">
              {isMetadataLoading ? 'Loading metadata...' : 'Generating content...'}
            </span>
          </div>
          <div className="w-full bg-[#F6ECE1] rounded-full h-2">
            <div 
              className="bg-[#444] h-2 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-manifold">{error}</p>
        </div>
      )}

      <div className="space-y-12">
        {/* Album Artwork */}
        <div className="flex justify-start max-w-3xl">
          {song.artworkUrl ? (
            <img
              src={song.artworkUrl}
              alt={`${song.title} artwork`}
              className="h-auto object-contain grayscale-[0.1] contrast-[1.1] brightness-[0.95]"
              style={{
                maxHeight: '40vh',
                imageRendering: 'crisp-edges',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            />
          ) : (
            <div className="max-h-[30vh] aspect-square bg-[#444]/10 flex items-center justify-center">
              <span className="text-[#444]/30 font-triptych text-2xl">no artwork</span>
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto text-left space-y-8">
          <div className="space-y-2">
            <div>
              <span className="text-sm font-triptych text-[#444]/60">♪ title</span>
              <h1 className="font-bold font-triptych text-5xl">{song.title}</h1>
            </div>
            <div>
              <span className="text-sm font-triptych text-[#444]/60">♫ artist</span>
              <h2 className="font-bold font-triptych text-4xl">{song.artist}</h2>
            </div>
            {song.album && (
              <div>
                <span className="text-sm font-triptych text-[#444]/60">♬ album</span>
                <h3 className="font-bold font-triptych text-3xl">{song.album}</h3>
              </div>
            )}
          </div>

          {linerNotes && (
            <div>
              <h2 className="font-bold font-triptych text-3xl">✎ Liner Notes</h2>
              <p>{linerNotes}</p>
            </div>
          )}

          {lineage && (
            <div>
              <h2 className="font-bold font-triptych text-3xl">Lineage</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold font-triptych text-2xl">⇢ Influences</h3>
                  <p>{lineage.influences?.join(' • ') || 'No influences found'}</p>
                </div>
                <div>
                  <h3 className="font-bold font-triptych text-2xl">⌛ Context</h3>
                  <p>{lineage.historicalContext || 'No historical context found'}</p>
                </div>
                <div>
                  <h3 className="font-bold font-triptych text-2xl">↔ Related Artists</h3>
                  <p>{lineage.relatedArtists?.join(' • ') || 'No related artists found'}</p>
                </div>
                <div>
                  <h3 className="font-bold font-triptych text-2xl">★ Recommended Songs</h3>
                  <ul className="list-disc pl-4">
                    {lineage.recommendedSongs?.map((song, index) => (
                      <li key={index}>
                        {song.title} by {song.artist} - {song.reason}
                      </li>
                    )) || <li>No recommendations found</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {song.genres && song.genres.length > 0 && (
            <div>
              <h3 className="font-bold font-triptych text-2xl">♪ Genres</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {song.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#F6ECE1] border border-[#444] rounded font-manifold text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {song.tags && song.tags.length > 0 && (
            <div>
              <h3 className="font-bold font-triptych text-2xl"># Tags</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {song.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#F6ECE1] border border-[#444] rounded font-manifold text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {song.musicBrainzData?.tags && song.musicBrainzData.tags.length > 0 && (
            <div>
              <h3 className="font-bold font-triptych text-2xl"># Tags</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {song.musicBrainzData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#F6ECE1] border border-[#444] rounded font-manifold text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {bandcampUrl && (
            <div>
              <a href={bandcampUrl} className="btn btn-secondary">
                ♪ Find on Bandcamp
              </a>
            </div>
          )}

          {song.credits && Object.keys(song.credits).length > 0 && (
            <div>
              <h3 className="font-bold font-triptych text-2xl">👥 Credits</h3>
              <div className="space-y-2 mt-2">
                {Object.entries(song.credits).map(([role, names], index) => (
                  <div key={index}>
                    <p className="text-sm font-mono text-grayscale-500">{role}</p>
                    <p className="font-mono text-grayscale-900">{Array.isArray(names) ? names.join(', ') : names}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {song.wikiSummary && (
            <div>
              <h3 className="font-bold font-triptych text-2xl">ℹ About</h3>
              <p className="mt-2 text-sm leading-relaxed">
                {song.wikiSummary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}