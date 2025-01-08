import React, { useEffect, useRef } from 'react';

const AudioProcessor = ({ onAudioData, isRecording }) => {
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    initializeAudio();
    return () => cleanupAudio();
  }, []);

  const initializeAudio = async () => {
    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;

      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Create processor
      processorRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1);
      
      // Process audio data
      processorRef.current.onaudioprocess = (e) => {
        if (isRecording) {
          const float32Array = e.inputBuffer.getChannelData(0);
          const int16Array = new Int16Array(float32Array.length);
          for (let i = 0; i < float32Array.length; i++) {
            int16Array[i] = float32Array[i] * 0x7fff;
          }
          onAudioData(int16Array.buffer);
        }
      };

      // Connect nodes
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
    } catch (err) {
      console.error('Audio initialization error:', err);
    }
  };

  const cleanupAudio = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return null; // This is a non-visual component
};

export default AudioProcessor;