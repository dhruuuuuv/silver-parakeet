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

const AUDD_API_KEY = process.env.NEXT_PUBLIC_AUDD_API_KEY;

export const recognizeAudio = async (audioBlob: Blob): Promise<SongMetadata> => {
  if (!AUDD_API_KEY) {
    throw new Error('Audd.io API key is not configured');
  }

  const formData = new FormData();
  formData.append('file', audioBlob);
  formData.append('api_token', AUDD_API_KEY);
  formData.append('return', 'spotify,apple_music');

  const response = await fetch('https://api.audd.io/', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  
  if (data.status === 'error') {
    throw new Error(data.error?.error_message || 'Failed to recognize song');
  }

  if (!data.result) {
    throw new Error('No song recognized');
  }

  return {
    title: data.result.title,
    artist: data.result.artist,
    album: data.result.album,
    releaseDate: data.result.release_date,
    spotifyId: data.result.spotify?.external_urls?.spotify,
    appleMusicUrl: data.result.apple_music?.url,
    bandcampUrl: undefined,
    lineage: undefined,
    linerNotes: undefined
  };
};

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

  const prompt = `You're functioning as a musicologist / ethnomusicologist. This is displayed in a cafe where music is playing, and aim to simulate vinyl liner notes.Write liner notes for ${song.artist}'s ${song.title}${song.album ? ` from the album ${song.album}` : ''} in the style of Ted Gioia, without making any reference to that fact.
  Be concise (max 150 words), Focus on the music's cultural impact and technical execution.`;

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

  const prompt = `You're adopting the role of a musicologist / ethnomusicologist. Describe ${song.artist}'s ${song.title}${song.album ? ` from the album ${song.album}` : ''} in the style of Ted Gioia.
  List 3-5 key historial musical influences (be specific about which songs/albums influenced this track).
  Provide a brief historical context (max 100 words) that explores where this music comes from and what it was influenced by. If migration of people or ideas is a factor, mention it, tie it into cultural history.
  Suggest 3 specific songs that share this track's DNA from history - be specific about why they're connected.
  Return ONLY a valid JSON object with these exact keys:
  - influences (array of specific songs/albums that influenced this track, at a big scale)
  - historicalContext (string, in Ted Gioia's style)
  - relatedArtists (array of artists who share this track's musical approach)
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
    // Strip markdown code block syntax if present
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const parsedResponse = JSON.parse(cleanJson);

    return {
      influences: parsedResponse.influences,
      historicalContext: parsedResponse.historicalContext,
      relatedArtists: parsedResponse.relatedArtists,
      recommendedSongs: parsedResponse.recommendedSongs
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      influences: [],
      historicalContext: '',
      relatedArtists: [],
      recommendedSongs: []
    };
  }
}

export async function searchBandcamp(song: SongMetadata): Promise<string | null> {
  // try {
  //   const searchQuery = `${song.artist} ${song.title} ${song.album || ''}`;
  //   const response = await fetch(`https://bandcamp.com/search?q=${encodeURIComponent(searchQuery)}`, {
  //     headers: {
  //       'Accept': 'text/html',
  //     }
  //   });
    
  //   if (!response.ok) {
  //     console.warn('Bandcamp search returned non-200 status:', response.status);
  //     return null;
  //   }

  //   return `https://bandcamp.com/search?q=${encodeURIComponent(searchQuery)}`;
  // } catch (error) {
  //   console.error('Bandcamp search error:', error);
    return null;
  // }
}