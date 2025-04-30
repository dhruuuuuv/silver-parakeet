# Music Recognition App

A web application built with Next.js, TypeScript, and TailwindCSS that provides music recognition capabilities using the Web Audio API.

## Features

- Audio recording from microphone
- Audio playback
- Simulated music recognition API
- Responsive design with TailwindCSS
- TypeScript support

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. Click the "Start Recording" button to begin capturing audio from your microphone
2. Click "Stop Recording" when you want to stop the recording
3. Use the audio player to review your recording
4. Click "Recognize Song" to send the audio to the recognition API

## Technical Details

- Built with Next.js 14 and TypeScript
- Uses the Web Audio API for audio capture
- Styled with TailwindCSS
- Features a simulated recognition API endpoint

## Notes

- Make sure to grant microphone permissions when prompted by your browser
- The recognition API currently returns mock data for demonstration purposes
