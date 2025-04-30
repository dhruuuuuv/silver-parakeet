'use client';

import React, { useRef, useState, useEffect } from 'react';
import { recognizeAudio } from '@/utils/api';
import { SongMetadata } from '@/types/song';

const RECORD_DURATION = 10000; // 10 seconds

interface AudioRecorderProps {
  onSongRecognized: (song: SongMetadata) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSongRecognized }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RECORD_DURATION / 1000);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Countdown effect
  useEffect(() => {
    if (isRecording) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(RECORD_DURATION / 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isRecording]);

  // Audio level monitoring
  const checkAudioLevel = () => {
    if (!analyserRef.current) return;

    const array = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(array);
    const average = array.reduce((a, b) => a + b) / array.length;
    setAudioLevel(average);

    animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      
      // Start monitoring audio level
      checkAudioLevel();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio level during recording:', audioLevel);
        
        if (audioLevel < 5) {
          setError('No audio detected. Please make sure music is playing and microphone is working.');
          return;
        }

        try {
          const song = await recognizeAudio(audioBlob);
          onSongRecognized(song);
        } catch (err) {
          console.error('Recognition error:', err);
          setError(err instanceof Error ? err.message : 'Failed to recognize song');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);

      // Stop recording after RECORD_DURATION
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
          if (audioContextRef.current) {
            audioContextRef.current.close();
          }
          setIsRecording(false);
        }
      }, RECORD_DURATION);

    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to access microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      
      // Stop media recorder
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Clean up analyser
      analyserRef.current = null;
      
      setIsRecording(false);
    }
  };

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`btn ${isRecording ? 'btn-secondary' : 'btn-primary'}`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {isRecording && (
        <div className="space-y-2">
          <p className="text-sm">Recording... {countdown}s</p>
          <div className="h-2 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-black rounded-full transition-all duration-100"
              style={{ width: `${Math.min(100, (audioLevel / 255) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {error && <p className="text-sm">{error}</p>}
    </div>
  );
};

export default AudioRecorder;