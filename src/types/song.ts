export interface SongMetadata {
  title: string;
  artist: string;
  album?: string;
  releaseDate?: string;
  artworkUrl?: string;
  appleMusicUrl?: string;
  spotifyId?: string;
  genres?: string[];
  credits?: Record<string, string | string[]>;
  musicBrainzData?: {
    id?: string;
    rating?: number;
    tags?: string[];
    labels?: string[];
    externalLinks?: {
      [key: string]: string;
    };
    [key: string]: any;
  };
  wikiSummary?: string;
  artistBio?: string;
  popularity?: number;
  trackFeatures?: any;
  lastfmTags?: string[];
  lyrics?: string;
  lineage?: {
    influences: string[];
    historicalContext: string;
    relatedArtists: string[];
    recommendedSongs: Array<{
      title: string;
      artist: string;
      reason: string;
    }>;
  };
  linerNotes?: string;
  bandcampUrl?: string;
}

export interface HistoryEntry extends SongMetadata {
  id: string;
  recognizedAt: string;
}

export interface RecognitionResponse {
  success: boolean;
  song?: SongMetadata;
  error?: string;
}
