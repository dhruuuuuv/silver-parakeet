'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { recognizeAudio } from '@/utils/api';
import { SongMetadata } from '@/types/song';

const RECORD_DURATION = 10000; // 10 seconds
const COOLDOWN_DURATION = 5000; // 5 seconds wait between recognitions
const AUDIO_THRESHOLD = -50; // dB threshold for detecting significant audio

interface AudioRecorderProps {
  onSongRecognized?: (song: SongMetadata) => void;
}

export default function AudioRecorder({ onSongRecognized }: AudioRecorderProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isProcessingRef = useRef(false);
  const monitorFrameRef = useRef<number | null>(null);

  const calculateDB = useCallback((analyser: AnalyserNode) => {
    const array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    const average = array.reduce((a, b) => a + b) / array.length;
    return 20 * Math.log10(average / 255);
  }, []);

  const stopCurrentRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (monitorFrameRef.current) {
      cancelAnimationFrame(monitorFrameRef.current);
    }
  }, []);

  const startMonitoring = useCallback(() => {
    if (!analyserRef.current || !isMonitoring) return;

    const checkLevel = () => {
      if (!isMonitoring) return;

      const db = calculateDB(analyserRef.current!);
      
      if (db > AUDIO_THRESHOLD && !isProcessingRef.current) {
        isProcessingRef.current = true;
        startNewRecording();
      } else {
        monitorFrameRef.current = requestAnimationFrame(checkLevel);
      }
    };

    monitorFrameRef.current = requestAnimationFrame(checkLevel);
  }, [isMonitoring, calculateDB]);

  const processAudioChunks = useCallback(async () => {
    if (chunksRef.current.length === 0) return;
    
    try {
      setIsRecognizing(true);
      setError(null);
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      chunksRef.current = []; // Clear for next recording
      
      const songMetadata = await recognizeAudio(blob);
      if (songMetadata) {
        onSongRecognized?.(songMetadata);
      }
      
    } catch (error) {
      console.error('Error recognizing song:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to recognize song';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsRecognizing(false);
      isProcessingRef.current = false;
      
      // Resume monitoring after cooldown
      setTimeout(() => {
        if (isMonitoring) {
          startMonitoring();
        }
      }, COOLDOWN_DURATION);
    }
  }, [onSongRecognized, isMonitoring, startMonitoring]);

  const startNewRecording = useCallback(async () => {
    if (isProcessingRef.current) return;
    
    try {
      stopCurrentRecording();
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        source.connect(analyserRef.current);
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        processAudioChunks();
      };

      mediaRecorder.start();
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
        }
      }, RECORD_DURATION);

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone. Please ensure you have granted permission.');
      setIsMonitoring(false);
      isProcessingRef.current = false;
    }
  }, [stopCurrentRecording, processAudioChunks]);

  useEffect(() => {
    if (isMonitoring) {
      startNewRecording();
    } else {
      stopCurrentRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }

    return () => {
      stopCurrentRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isMonitoring, startNewRecording, stopCurrentRecording]);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => setIsMonitoring(!isMonitoring)}
        className={`
          px-6 py-3 rounded font-mono text-lg transition-all duration-300
          ${isMonitoring 
            ? 'bg-orange-400 hover:bg-orange-500 text-orange-50 ring-2 ring-orange-400' 
            : 'bg-orange-400 hover:bg-orange-500 text-orange-50'
          }
        `}
      >
        {isMonitoring ? 'Stop Listening' : 'Start Listening'}
      </button>
      
      {isRecognizing && (
        <div className="text-orange-400 font-mono">
          Recognizing song...
        </div>
      )}
      
      {error && (
        <div className="text-orange-400 text-center font-mono">
          {error}
        </div>
      )}
    </div>
  );
}
