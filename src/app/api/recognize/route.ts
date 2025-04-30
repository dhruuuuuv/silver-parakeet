import { NextResponse } from 'next/server';

const AUDD_API_KEY = process.env.AUDD_API_KEY;

async function fetchMusicBrainzData(artist: string, track: string) {
  try {
    // First get the recording
    const searchResponse = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(
        `artist:${artist} AND recording:${track}`
      )}&fmt=json`
    );
    const searchData = await searchResponse.json();
    
    if (!searchData.recordings?.[0]?.id) return null;

    // Then get detailed recording info including relationships
    const recordingResponse = await fetch(
      `https://musicbrainz.org/ws/2/recording/${searchData.recordings[0].id}?inc=artist-credits+releases+genres+tags+ratings+url-rels&fmt=json`
    );
    return await recordingResponse.json();
  } catch (error) {
    console.error('MusicBrainz API error:', error);
    return null;
  }
}

async function fetchCoverArtArchive(mbid: string) {
  try {
    const response = await fetch(`https://coverartarchive.org/release/${mbid}`);
    const data = await response.json();
    return data.images?.find(img => img.front)?.image || null;
  } catch (error) {
    console.error('Cover Art Archive error:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('file') as Blob;

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Create a new FormData for the AudD API request
    const auddFormData = new FormData();
    auddFormData.append('file', audioBlob);
    auddFormData.append('return', 'apple_music');
    auddFormData.append('api_token', AUDD_API_KEY || '');

    const response = await fetch('https://api.audd.io/', {
      method: 'POST',
      body: auddFormData,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to connect to recognition service' }, { status: 502 });
    }

    const data = await response.json();
    
    if (!data.result) {
      return NextResponse.json({ error: 'No music detected' }, { status: 404 });
    }

    const { title, artist, album, release_date, apple_music } = data.result;

    // Parallel fetch all additional data
    const [wikiData, musicBrainzData] = await Promise.all([
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artist + ' ' + title)}`).then(r => r.json()).catch(() => null),
      fetchMusicBrainzData(artist, title),
    ]);

    // Get artwork from multiple sources
    let artwork = apple_music?.artwork?.url?.replace('{w}x{h}', '1000x1000') || null;
    
    if (!artwork && musicBrainzData?.releases?.[0]?.id) {
      artwork = await fetchCoverArtArchive(musicBrainzData.releases[0].id);
    }

    // Extract all genres and tags from MusicBrainz
    const genres = new Set([
      ...(musicBrainzData?.genres?.map(g => g.name) || []),
      ...(musicBrainzData?.tags?.map(t => t.name) || [])
    ]);

    // Get external links
    const externalLinks = musicBrainzData?.relations?.reduce((acc, rel) => {
      if (rel.type === 'streaming' || rel.type === 'purchase' || rel.type === 'download') {
        acc[rel.type] = rel.url.resource;
      }
      return acc;
    }, {} as Record<string, string>) || {};

    // Combine all metadata
    return NextResponse.json({
      title,
      artist,
      album,
      releaseDate: release_date,
      artwork,
      appleMusicUrl: apple_music?.url,
      wikiSummary: wikiData?.extract,
      genres: Array.from(genres),
      credits: {
        artists: musicBrainzData?.['artist-credit']?.map(credit => ({
          name: credit.artist.name,
          role: credit.joinphrase?.trim() || 'performer'
        })) || [],
        releases: musicBrainzData?.releases?.map(release => ({
          title: release.title,
          date: release.date,
          country: release.country
        })) || []
      },
      musicBrainzData: {
        recordingId: musicBrainzData?.id,
        rating: musicBrainzData?.rating?.value,
        tags: musicBrainzData?.tags?.map(t => t.name) || [],
        externalLinks
      }
    });
  } catch (error) {
    console.error('Recognition error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
