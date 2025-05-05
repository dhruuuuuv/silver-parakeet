import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { title, artist, album, year, genres } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You're a musicologist specializing in tracing musical lineages and cultural influences. Analyze ${artist}'s "${title}"${album ? ` from ${album}` : ''}${year ? ` (${year})` : ''} with these metadata points:
    - Genres: ${genres?.join(', ') || 'N/A'}

    Provide a concise, easy to read analysis in the style of Ted Gioia, focusing on:
    1. Cultural and historical context - trace the musical traditions, migrations, and cultural movements that influenced this work, being as accurate as possible.
    2. Key musical influences (up to 3 significant influences on the general genre and style of the music)
    3. Related artists (3-5) - artists who share similar musical DNA and cultural influences
    4. Recommended listening (3 tracks) - specific songs that demonstrate the evolution of this musical style
    5. Geographic regions - list the key regions or countries where this music originated or was significantly influenced by

    Return ONLY a valid JSON object with these exact keys:
    - historicalContext (string)
    - influences (array of strings)
    - relatedArtists (array of strings)
    - recommendedSongs (array of objects with {title: string, artist: string, reason: string})
    - regions (array of strings)
    Do not include any markdown formatting or additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating lineage:', error);
    return NextResponse.json(
      {
        influences: [],
        historicalContext: '',
        relatedArtists: [],
        recommendedSongs: [],
        regions: [],
      },
      { status: 500 }
    );
  }
} 