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
      // Check if we already have a stream
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      // Request microphone access with retries
      let stream;
      let retries = 3;
      while (retries > 0) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          });
          break;
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!stream) throw new Error('Failed to access microphone after multiple attempts');
      
      // Set up audio analysis with retries
      let audioContext;
      let retriesContext = 3;
      while (retriesContext > 0) {
        try {
          audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          analyserRef.current = audioContext.createAnalyser();
          analyserRef.current.fftSize = 2048;
          source.connect(analyserRef.current);
          audioContextRef.current = audioContext;
          break;
        } catch (err) {
          retriesContext--;
          if (retriesContext === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Start monitoring audio level
      checkAudioLevel();

      // Create media recorder with retries
      let mediaRecorder;
      let retriesRecorder = 3;
      while (retriesRecorder > 0) {
        try {
          mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm'
          });
          break;
        } catch (err) {
          retriesRecorder--;
          if (retriesRecorder === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!mediaRecorder) throw new Error('Failed to create MediaRecorder after multiple attempts');
      
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
      setError('Failed to access microphone. Please ensure you have granted permission and try again.');
      setIsRecording(false);
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
    <div className="flex flex-col items-start justify-start space-y-4 w-full">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-6 py-3 rounded font-manifold text-sm transition-all ${
          isRecording 
            ? 'bg-[#444] text-white hover:bg-[#333]' 
            : 'bg-[#F6ECE1] text-[#444] border border-[#444] hover:bg-[#F0E0D0]'
        }`}
      >
        {isRecording ? 'stop recording' : 'start recording'}
      </button>
      
      {isRecording && (
        <div className="space-y-2 w-full max-w-md">
          <div className="flex items-center justify-between">
            <p className="font-manifold text-sm text-[#444]">recording...</p>
            <p className="font-manifold text-sm text-[#444]">{countdown}s</p>
          </div>
          <div className="h-2 bg-[#F6ECE1] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#444] rounded-full transition-all duration-100"
              style={{ width: `${Math.min(100, (audioLevel / 255) * 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg w-full max-w-md">
          <p className="font-manifold text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;