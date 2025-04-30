'use client';

import { useState, useEffect } from 'react';
import { SongMetadata } from '@/types/song';
import { generateLinerNotes, generateLineage, searchBandcamp } from '@/utils/api';
import { Album3D } from './Album3D';

interface SongDisplayProps {
  song: SongMetadata | null;
}

export default function SongDisplay({ song }: SongDisplayProps) {
  const [linerNotes, setLinerNotes] = useState<string>('');
  const [lineage, setLineage] = useState<SongMetadata['lineage'] | null>(null);
  const [bandcampUrl, setBandcampUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (song) {
      setIsLoading(true);
      Promise.all([
        generateLinerNotes(song),
        generateLineage(song),
        searchBandcamp(song)
      ]).then(([notes, lineage, bandcamp]) => {
        setLinerNotes(notes);
        setLineage(lineage);
        setBandcampUrl(bandcamp);
        setIsLoading(false);
      }).catch(error => {
        console.error('Error fetching song details:', error);
        setIsLoading(false);
      });
    }
  }, [song]);

  if (!song) return null;

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6">
        {/* Album Art */}
        <div className="w-full aspect-square">
          <Album3D imageUrl={song.artworkUrl || '/placeholder-album.jpg'} />
        </div>

        {/* Song Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-mono text-grayscale-900">{song.title}</h1>
            <h2 className="text-xl font-mono text-grayscale-600">{song.artist}</h2>
            {song.album && <p className="font-mono text-grayscale-500">{song.album}</p>}
          </div>

          {isLoading ? (
            <div className="text-grayscale-600 font-mono">Loading details...</div>
          ) : (
            <>
              {/* Liner Notes */}
              {linerNotes && (
                <div>
                  <h3 className="text-lg font-mono text-grayscale-600">Liner Notes</h3>
                  <p className="font-mono text-grayscale-600 mt-2 text-sm leading-relaxed">
                    {linerNotes}
                  </p>
                </div>
              )}

              {/* Lineage */}
              {song.lineage && (
                <div className="mt-4">
                  <h3 className="text-xl font-bold mb-2">Musical Lineage</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">Influences</h4>
                      <p className="text-sm">{song.lineage.influences.join(', ')}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Historical Context</h4>
                      <p className="text-sm">{song.lineage.historicalContext}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Related Artists</h4>
                      <p className="text-sm">{song.lineage.relatedArtists.join(', ')}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Recommended Songs</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        {song.lineage.recommendedSongs.map((rec, index) => (
                          <div key={index} className="bg-grayscale-800 p-4 rounded-lg">
                            <h5 className="font-medium">{rec.title}</h5>
                            <p className="text-sm text-grayscale-400">{rec.artist}</p>
                            <p className="text-xs mt-2 text-grayscale-300">{rec.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex gap-4">
                {song.appleMusicUrl && (
                  <a
                    href={song.appleMusicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-orange-400 hover:bg-orange-500 text-orange-50 font-mono rounded transition-all"
                  >
                    Apple Music
                  </a>
                )}
                {bandcampUrl && (
                  <a
                    href={bandcampUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-orange-400 hover:bg-orange-500 text-orange-50 font-mono rounded transition-all"
                  >
                    Bandcamp
                  </a>
                )}
              </div>
            </>
          )}

          {song.genres && song.genres.length > 0 && (
            <div>
              <h3 className="text-lg font-mono text-grayscale-600">Genres</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {song.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-grayscale-100 border border-grayscale-200 rounded font-mono text-grayscale-600 text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {song.musicBrainzData?.tags && song.musicBrainzData.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-mono text-grayscale-600">Tags</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {song.musicBrainzData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-grayscale-100 border border-grayscale-200 rounded font-mono text-grayscale-600 text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {song.credits && Object.keys(song.credits).length > 0 && (
            <div>
              <h3 className="text-lg font-mono text-grayscale-600">Credits</h3>
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
              <h3 className="text-lg font-mono text-grayscale-600">About</h3>
              <p className="font-mono text-grayscale-600 mt-2 text-sm leading-relaxed">
                {song.wikiSummary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}