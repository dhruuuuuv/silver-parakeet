import { SongMetadata } from '@/types/song';

export class RecognitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecognitionError';
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

interface CoverArtImage {
  front: boolean;
  image: string;
}

export const recognizeAudio = async (audioBlob: Blob): Promise<SongMetadata> => {
  if (!AUDD_API_KEY) {
    throw new Error('Audd.io API key is not configured');
  }

  const formData = new FormData();
  formData.append('file', audioBlob);
  formData.append('api_token', AUDD_API_KEY);
  formData.append('return', 'apple_music,deezer,musicbrainz');

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

  // Get additional metadata from various sources - make these optional
  const [musicBrainzData, wikiData] = await Promise.allSettled([
    fetchMusicBrainzData(data.result.artist, data.result.title),
    fetchWikipediaData(data.result.artist, data.result.title)
  ]);

  // Extract values from settled promises
  const musicBrainzResult = musicBrainzData.status === 'fulfilled' ? musicBrainzData.value : null;
  const wikiResult = wikiData.status === 'fulfilled' ? wikiData.value : null;

  // Get artwork from multiple sources
  let artworkUrl = null;
  
  // Try Apple Music first
  if (data.result.apple_music?.artwork?.url) {
    artworkUrl = data.result.apple_music.artwork.url.replace('{w}x{h}', '1000x1000');
  }
  
  // Try Deezer next
  if (!artworkUrl && data.result.deezer?.album?.cover) {
    artworkUrl = data.result.deezer.album.cover;
  }
  
  // Try MusicBrainz last
  if (!artworkUrl && musicBrainzResult?.releases?.[0]?.id) {
    const coverArtResponse = await fetch(`https://coverartarchive.org/release/${musicBrainzResult.releases[0].id}`);
    if (coverArtResponse.ok) {
      const coverArtData = await coverArtResponse.json();
      artworkUrl = coverArtData.images?.find((img: CoverArtImage) => img.front)?.image;
    }
  }

  return {
    title: data.result.title,
    artist: data.result.artist,
    album: data.result.album,
    releaseDate: data.result.release_date,
    artworkUrl,
    appleMusicUrl: data.result.apple_music?.url,
    musicBrainzData: musicBrainzResult ? {
      id: musicBrainzResult.id,
      rating: musicBrainzResult.rating?.value,
      tags: musicBrainzResult.tags?.map((t: any) => t.name) || [],
      labels: musicBrainzResult.releases?.map((r: any) => r.label) || [],
      externalLinks: musicBrainzResult.relations?.reduce((acc: any, rel: any) => {
        if (rel.type === 'streaming' || rel.type === 'purchase' || rel.type === 'download') {
          acc[rel.type] = rel.url.resource;
        }
        return acc;
      }, {}) || {}
    } : undefined,
    wikiSummary: wikiResult?.extract,
    bandcampUrl: undefined,
    lineage: undefined,
    linerNotes: undefined
  };
};

async function fetchWikipediaData(artist: string, title: string) {
  try {
    // First try artist + title
    let response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artist + ' ' + title)}`, {
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      // If that fails, try just the artist
      response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artist)}`, {
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
    }
    
    if (!response.ok) {
      console.warn('Wikipedia API returned non-200 status:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // If we got artist data, try to find the song in the extract
    if (data.extract && !data.extract.includes(title)) {
      // Try to get more specific data about the song
      const searchResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${artist} ${title}`)}&format=json&origin=*`);
      const searchData = await searchResponse.json();
      
      if (searchData.query?.search?.[0]) {
        const pageId = searchData.query.search[0].pageid;
        const pageResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${pageId}`, {
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors'
        });
        
        if (pageResponse.ok) {
          const pageData = await pageResponse.json();
          return pageData;
        }
      }
    }
    
    return data;
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

  // Build context from available metadata
  const context = {
    genres: song.genres?.join(', ') || '',
    tags: song.lastfmTags?.join(', ') || '',
    releaseDate: song.releaseDate || '',
    wikiSummary: song.wikiSummary || '',
    musicBrainzTags: song.musicBrainzData?.tags?.join(', ') || ''
  };

  const prompt = `You're a musicologist specializing in tracing musical lineages and cultural influences. Analyze ${song.artist}'s "${song.title}"${song.album ? ` from ${song.album}` : ''} with these metadata points:
  - Genres: ${context.genres}
  - Tags: ${context.tags}
  - Release Date: ${context.releaseDate}
  - Wiki Context: ${context.wikiSummary}
  - MusicBrainz Tags: ${context.musicBrainzTags}

  Provide a detailed analysis in the style of Ted Gioia, focusing on:
  1. Cultural and historical context (150-200 words) - trace the musical traditions, migrations, and cultural movements that influenced this work
  2. Key musical influences (3-5 specific works) - identify precise songs/albums that directly influenced this track
  3. Related artists (3-5) - artists who share similar musical DNA and cultural influences
  4. Recommended listening (3 tracks) - specific songs that demonstrate the evolution of this musical style

  Return ONLY a valid JSON object with these exact keys:
  - historicalContext (string)
  - influences (array of strings)
  - relatedArtists (array of strings)
  - recommendedSongs (array of objects with {title: string, artist: string, reason: string})
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