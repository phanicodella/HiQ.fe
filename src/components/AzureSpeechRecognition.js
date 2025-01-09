// AzureSpeechRecognition.js
import React, { useEffect, useRef } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const AzureSpeechRecognition = ({ 
  isRecording, 
  onTranscriptionUpdate,
  onError 
}) => {
  const recognizerRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const transcriptRef = useRef('');

  // Move initialization to separate useEffect that runs only once
  useEffect(() => {
    let speechConfig;
    let audioConfig;

    try {
      console.log('Setting up Azure Speech with:', {
        key: process.env.REACT_APP_AZURE_SPEECH_KEY?.slice(0,4) + '...',
        region: process.env.REACT_APP_AZURE_SPEECH_REGION
      });

      // Create speech config
      speechConfig = sdk.SpeechConfig.fromSubscription(
        process.env.REACT_APP_AZURE_SPEECH_KEY,
        process.env.REACT_APP_AZURE_SPEECH_REGION
      );
      
      // Configure speech recognition
      speechConfig.speechRecognitionLanguage = 'en-US';
      speechConfig.enableDictation();

      // Create audio config for microphone input
      audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      
      // Create speech recognizer
      recognizerRef.current = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // Handle recognition results
      recognizerRef.current.recognizing = (s, e) => {
        console.log('Interim result:', e.result.text);
      };

      recognizerRef.current.recognized = (s, e) => {
        console.log('Final result:', e.result.text);
        if (e.result.text) {
          transcriptRef.current += ' ' + e.result.text;
          onTranscriptionUpdate(transcriptRef.current.trim());
        }
      };

      // Handle errors
      recognizerRef.current.canceled = (s, e) => {
        console.log('Recognition canceled:', e);
        if (e.errorCode !== sdk.CancellationErrorCode.NoError) {
          const errorMessage = `Speech recognition error: ${e.errorDetails}`;
          console.error(errorMessage);
          onError(errorMessage);
        }
      };

      console.log('Speech recognizer created successfully');
    } catch (error) {
      console.error('Azure Speech setup error:', error);
      onError('Failed to initialize speech recognition');
    }

    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
      if (speechConfig) {
        speechConfig.close();
      }
      if (audioConfig) {
        audioConfig.close();
      }
    };
  }, []); // Empty dependency array so this runs only once

  // Handle recording state changes
  useEffect(() => {
    if (!recognizerRef.current) return;

    const startRecognition = async () => {
      if (isRecognizingRef.current) return;

      try {
        console.log('Starting recognition...');
        transcriptRef.current = '';
        await recognizerRef.current.startContinuousRecognitionAsync();
        isRecognizingRef.current = true;
        console.log('Recognition started successfully');
      } catch (error) {
        console.error('Start recognition error:', error);
        onError('Failed to start speech recognition');
      }
    };

    const stopRecognition = async () => {
      if (!isRecognizingRef.current) return;

      try {
        console.log('Stopping recognition...');
        await recognizerRef.current.stopContinuousRecognitionAsync();
        isRecognizingRef.current = false;
        console.log('Recognition stopped successfully');
      } catch (error) {
        console.error('Stop recognition error:', error);
        onError('Failed to stop speech recognition');
      }
    };

    if (isRecording) {
      startRecognition();
    } else {
      stopRecognition();
    }
  }, [isRecording, onError]);

  return null;
};

export default AzureSpeechRecognition;