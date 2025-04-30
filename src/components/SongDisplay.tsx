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
    <div className="space-y-8">
      <div>
        <h1>{song.title}</h1>
        <h2>{song.artist}</h2>
        {song.album && <h3>{song.album}</h3>}
      </div>

      {linerNotes && (
        <div>
          <h2>Liner Notes</h2>
          <p>{linerNotes}</p>
        </div>
      )}

      {lineage && (
        <div>
          <h2>Lineage</h2>
          <div className="space-y-4">
            <div>
              <h3>Influences</h3>
              <p>{lineage.influences?.join(' • ') || 'No influences found'}</p>
            </div>
            <div>
              <h3>Context</h3>
              <p>{lineage.historicalContext || 'No historical context found'}</p>
            </div>
            <div>
              <h3>Related Artists</h3>
              <p>{lineage.relatedArtists?.join(' • ') || 'No related artists found'}</p>
            </div>
            <div>
              <h3>Recommended Songs</h3>
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

      {bandcampUrl && (
        <div>
          <a href={bandcampUrl} className="btn btn-secondary">
            Find on Bandcamp
          </a>
        </div>
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
  );
};

export default SongDisplay;