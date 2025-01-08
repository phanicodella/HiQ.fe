import React, { useEffect, useRef } from 'react';
import axios from 'axios';

const StreamRecorder = ({ 
  isRecording,
  onTranscriptUpdate 
}) => {
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    const setupRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
        
        mediaRecorderRef.current = new MediaRecorder(stream);

        // Log data as it comes in (for testing)
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log('Audio chunk received, size:', event.data.size);
            // For now, just simulate a transcript update
            onTranscriptUpdate('Recording in progress...');
          }
        };

      } catch (err) {
        console.error('Error setting up recording:', err);
      }
    };

    setupRecording();

    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!mediaRecorderRef.current) return;

    if (isRecording && mediaRecorderRef.current.state === 'inactive') {
      console.log('Starting recording...');
      mediaRecorderRef.current.start(1000); // Emit data every 1 second
    } else if (!isRecording && mediaRecorderRef.current.state === 'recording') {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  return null;
};

export default StreamRecorder;