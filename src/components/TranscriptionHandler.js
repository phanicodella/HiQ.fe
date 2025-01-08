import React, { useEffect, useRef } from 'react';

const TranscriptionHandler = ({ 
  isRecording, 
  onTranscriptionUpdate 
}) => {
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onTranscriptionUpdate(prevTranscript => prevTranscript + ' ' + finalTranscript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  return null;
};

export default TranscriptionHandler;