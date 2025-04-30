import { SongMetadata } from '@/types/song';

export class RecognitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecognitionError';
  }
}

// Spotify token management
let spotifyAccessToken: string | null = null;
let spotifyTokenExpiry: number | null = null;

async function getSpotifyToken() {
  if (spotifyAccessToken && spotifyTokenExpiry && Date.now() < spotifyTokenExpiry) {
    return spotifyAccessToken;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  spotifyAccessToken = data.access_token;
  spotifyTokenExpiry = Date.now() + (data.expires_in * 1000);
  return spotifyAccessToken;
}

async function fetchLastFMData(artist: string, track: string) {
  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${
        process.env.NEXT_PUBLIC_LASTFM_API_KEY
      }&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`
    );
    return await response.json();
  } catch (error) {
    console.error('LastFM API error:', error);
    return null;
  }
}

async function fetchSpotifyData(spotifyId: string) {
  try {
    const token = await getSpotifyToken();
    const response = await fetch(`https://api.spotify.com/v1/tracks/${spotifyId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Spotify API error:', error);
    return null;
  }
}

async function fetchSpotifyFeatures(trackId: string) {
  try {
    const token = await getSpotifyToken();
    const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Spotify Features API error:', error);
    return null;
  }
}

async function fetchMusicBrainzData(artist: string, track: string) {
  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(
        `artist:${artist} AND recording:${track}`
      )}&fmt=json`
    );
    return await response.json();
  } catch (error) {
    console.error('MusicBrainz API error:', error);
    return null;
  }
}

async function fetchGeniusLyrics(artist: string, track: string) {
  try {
    const response = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(`${artist} ${track}`)}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GENIUS_ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      console.warn('Genius API returned non-200 status:', response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Genius API error:', error);
    return null;
  }
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=';

interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

export async function recognizeAudio(audioBlob: Blob): Promise<SongMetadata> {
  const formData = new FormData();
  formData.append('file', audioBlob);
  formData.append('return', 'spotify,apple_music');
  formData.append('api_token', process.env.NEXT_PUBLIC_AUDD_API_KEY || '');

  try {
    const response = await fetch('https://api.audd.io/', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new RecognitionError('Failed to connect to recognition service');
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new RecognitionError('No music detected. Make sure music is playing and try again.');
    }

    const { title, artist, album, release_date, spotify } = data.result;

    // Get Spotify track ID from the URL
    const spotifyId = spotify?.external_urls?.spotify?.split('/').pop();

    // Parallel fetch all additional data
    const [wikiData, lastfmData, musicBrainzData, geniusData, spotifyData, spotifyFeatures] = await Promise.all([
      fetchWikipediaData(artist, title),
      fetchLastFMData(artist, title),
      fetchMusicBrainzData(artist, title),
      fetchGeniusLyrics(artist, title),
      spotifyId ? fetchSpotifyData(spotifyId) : null,
      spotifyId ? fetchSpotifyFeatures(spotifyId) : null,
    ]);

    // Get high-quality artwork (prefer Spotify's high-res images)
    const artwork = spotifyData?.album?.images?.sort((a: SpotifyImage, b: SpotifyImage) => b.width - a.width)[0]?.url || 
                   spotify?.album?.images?.sort((a: SpotifyImage, b: SpotifyImage) => b.width - a.width)[0]?.url;

    // Combine all metadata
    return {
      title,
      artist,
      album,
      releaseDate: release_date,
      artworkUrl: artwork,
      spotifyId: spotify?.external_urls?.spotify,
      wikiSummary: wikiData?.extract,
      artistBio: lastfmData?.artist?.bio?.content,
      genres: spotifyData?.genres || spotify?.album?.genres || [],
      popularity: spotifyData?.popularity,
      trackFeatures: spotifyFeatures,
      credits: {
        producers: musicBrainzData?.recordings?.[0]?.credits?.producer || [],
        writers: musicBrainzData?.recordings?.[0]?.credits?.writer || [],
        label: spotifyData?.album?.label || spotify?.album?.label
      },
      lastfmTags: lastfmData?.track?.toptags?.tag?.map((t: any) => t.name) || [],
      musicBrainzData: {
        recordingId: musicBrainzData?.recordings?.[0]?.id,
        rating: musicBrainzData?.recordings?.[0]?.rating?.value
      },
      lyrics: geniusData?.response?.hits?.[0]?.result?.url
    };
  } catch (error) {
    if (error instanceof RecognitionError) {
      throw error;
    }
    console.error('Error recognizing song:', error);
    throw new RecognitionError('Failed to recognize song. Please try again.');
  }
}

async function fetchWikipediaData(artist: string, title: string) {
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artist + ' ' + title)}`, {
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      console.warn('Wikipedia API returned non-200 status:', response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Wikipedia API error:', error);
    return null;
  }
}

export async function generateLinerNotes(song: SongMetadata): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not found');

  const prompt = `Write concise liner notes (max 200 words) for ${song.artist}'s ${song.title}${song.album ? ` from the album ${song.album}` : ''}. 
  Focus on the musical style, cultural context, and significance. Be factual and engaging.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid Gemini API response');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Unable to generate liner notes at this time.';
  }
}

export async function generateLineage(song: SongMetadata): Promise<SongMetadata['lineage']> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not found');

  const prompt = `Analyze the musical lineage of ${song.artist}'s ${song.title}${song.album ? ` from the album ${song.album}` : ''}. 
  List 3-5 key musical influences, provide a brief historical context (max 100 words), and suggest 3 specific songs from related artists that share similar musical elements.
  Return ONLY a valid JSON object with these exact keys: 
  - influences (array of artist names)
  - historicalContext (string)
  - relatedArtists (array of artist names)
  - recommendedSongs (array of 3 objects with {title: string, artist: string, reason: string})
  Do not include any markdown formatting or additional text.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid Gemini API response');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    // Clean up any markdown formatting
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      influences: [],
      historicalContext: 'Unable to generate lineage at this time.',
      relatedArtists: [],
      recommendedSongs: []
    };
  }
}

export async function searchBandcamp(song: SongMetadata): Promise<string | null> {
  try {
    const searchQuery = `${song.artist} ${song.title} ${song.album || ''}`;
    const response = await fetch(`https://bandcamp.com/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'Accept': 'text/html',
      }
    });
    
    if (!response.ok) {
      console.warn('Bandcamp search returned non-200 status:', response.status);
      return null;
    }

    // Since we can't directly access the API, we'll return a search URL
    return `https://bandcamp.com/search?q=${encodeURIComponent(searchQuery)}`;
  } catch (error) {
    console.error('Bandcamp search error:', error);
    return null;
  }
}
