'use client';

import React from 'react';
import { SongMetadata } from '@/types/song';
import { generateLinerNotes, generateLineage, searchBandcamp } from '@/utils/api';
import { Album3D } from './Album3D';

interface SongDisplayProps {
  song: SongMetadata;
}

const SongDisplay: React.FC<SongDisplayProps> = ({ song }) => {
  const [linerNotes, setLinerNotes] = React.useState<string>('');
  const [lineage, setLineage] = React.useState<SongMetadata['lineage']>();
  const [bandcampUrl, setBandcampUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      const [notes, lineageData, bandcamp] = await Promise.all([
        generateLinerNotes(song),
        generateLineage(song),
        searchBandcamp(song)
      ]);
      setLinerNotes(notes);
      setLineage(lineageData);
      setBandcampUrl(bandcamp);
      setIsLoading(false);
    };
    fetchData();
  }, [song]);

  return (
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
            <span className="text-sm font-triptych text-[#444]/60">title</span>
            <h1 className="font-bold font-triptych text-4xl">{song.title}</h1>
          </div>
          <div>
            <span className="text-sm font-triptych text-[#444]/60">artist</span>
            <h2 className="font-bold font-triptych text-2xl">{song.artist}</h2>
          </div>
          {song.album && (
            <div>
              <span className="text-sm font-triptych text-[#444]/60">album</span>
              <h3 className="font-bold font-triptych text-xl">{song.album}</h3>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="ascii-loader ascii-loader-1 font-triptych text-2xl">.</div>
            <div className="ascii-loader ascii-loader-2 font-triptych text-2xl">⠋</div>
          </div>
        ) : (
          <>
            {linerNotes && (
              <div>
                <h2 className="font-bold font-triptych">Liner Notes</h2>
                <p>{linerNotes}</p>
              </div>
            )}

            {lineage && (
              <div>
                <h2 className="font-bold font-triptych">Lineage</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold font-triptych">Influences</h3>
                    <p>{lineage.influences?.join(' • ') || 'No influences found'}</p>
                  </div>
                  <div>
                    <h3 className="font-bold font-triptych">Context</h3>
                    <p>{lineage.historicalContext || 'No historical context found'}</p>
                  </div>
                  <div>
                    <h3 className="font-bold font-triptych">Related Artists</h3>
                    <p>{lineage.relatedArtists?.join(' • ') || 'No related artists found'}</p>
                  </div>
                  <div>
                    <h3 className="font-bold font-triptych">Recommended Songs</h3>
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

            {song.musicBrainzData?.tags && song.musicBrainzData.tags.length > 0 && (
              <div>
                <h3 className="font-bold font-triptych">Tags</h3>
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
                  Find on Bandcamp
                </a>
              </div>
            )}
          </>
        )}

        {song.genres && song.genres.length > 0 && (
          <div>
            <h3 className="font-bold font-triptych">Genres</h3>
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
            <h3 className="font-bold font-triptych">About</h3>
            <p className="mt-2 text-sm leading-relaxed">
              {song.wikiSummary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongDisplay;