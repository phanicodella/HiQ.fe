import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

/**
 * Azure Speech Recognition Component
 * Handles real-time speech-to-text conversion using Azure Cognitive Services
 */
const AzureSpeechRecognition = ({ 
  isRecording,
  onTranscriptionUpdate,
  onError,
  language = 'en-US',
  continuous = true
}) => {
  const recognizerRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const transcriptRef = useRef('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Check browser compatibility
  const checkBrowserCompatibility = () => {
    const audioContext = window.AudioContext || window.webkitAudioContext;
    const mediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

    if (!audioContext || !mediaDevices) {
      throw new Error(
        'Your browser does not support required audio features. ' +
        'Please use Chrome, Firefox, or Edge (Chromium-based) for the best experience.'
      );
    }

    return true;
  };

  // Initialize Azure Speech SDK
  const initializeSpeechSDK = () => {
    try {
      console.log('Initializing Azure Speech with configuration');
      
      if (!process.env.REACT_APP_AZURE_SPEECH_KEY || !process.env.REACT_APP_AZURE_SPEECH_REGION) {
        throw new Error('Azure Speech credentials not configured');
      }

      const speechConfig = sdk.SpeechConfig.fromSubscription(
        process.env.REACT_APP_AZURE_SPEECH_KEY,
        process.env.REACT_APP_AZURE_SPEECH_REGION
      );

      // Configure speech recognition
      speechConfig.speechRecognitionLanguage = language;
      speechConfig.enableDictation();
      speechConfig.outputFormat = sdk.OutputFormat.Detailed;

      // Create audio config
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

      // Create speech recognizer
      recognizerRef.current = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // Set up event handlers
      setupRecognitionEventHandlers();

      setIsInitialized(true);
      console.log('Azure Speech SDK initialized successfully');
    } catch (error) {
      console.error('Azure Speech initialization error:', error);
      onError(error.message || 'Failed to initialize speech recognition');
      setIsInitialized(false);
    }
  };

  // Set up event handlers for the speech recognizer
  const setupRecognitionEventHandlers = () => {
    if (!recognizerRef.current) return;

    recognizerRef.current.recognizing = (s, e) => {
      if (e.result.text) {
        console.log('Interim result:', e.result.text);
      }
    };

    recognizerRef.current.recognized = (s, e) => {
      if (e.result.text) {
        transcriptRef.current += ' ' + e.result.text;
        const cleanTranscript = transcriptRef.current.trim();
        console.log('Final result:', cleanTranscript);
        onTranscriptionUpdate(cleanTranscript);
      }
    };

    recognizerRef.current.canceled = (s, e) => {
      console.log('Recognition canceled:', e);
      if (e.errorCode !== sdk.CancellationErrorCode.NoError) {
        const errorMessage = `Speech recognition error: ${e.errorDetails}`;
        console.error(errorMessage);
        onError(errorMessage);
      }
      isRecognizingRef.current = false;
    };

    recognizerRef.current.sessionStopped = (s, e) => {
      console.log('Recognition stopped');
      isRecognizingRef.current = false;
      if (recognizerRef.current) {
        recognizerRef.current.stopContinuousRecognitionAsync();
      }
    };
  };

  // Start recognition
  const startRecognition = async () => {
    if (!recognizerRef.current || isRecognizingRef.current) return;

    try {
      console.log('Starting recognition...');
      await recognizerRef.current.startContinuousRecognitionAsync();
      isRecognizingRef.current = true;
      console.log('Recognition started successfully');
    } catch (error) {
      console.error('Start recognition error:', error);
      onError('Failed to start speech recognition');
      isRecognizingRef.current = false;
    }
  };

  // Stop recognition
  const stopRecognition = async () => {
    if (!recognizerRef.current || !isRecognizingRef.current) return;

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

  // Initialize component
  useEffect(() => {
    try {
      checkBrowserCompatibility();
      initializeSpeechSDK();
    } catch (error) {
      onError(error.message);
    }

    // Cleanup
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
    };
  }, []);

  // Handle recording state changes
  useEffect(() => {
    if (!isInitialized) return;

    if (isRecording) {
      startRecognition();
    } else {
      stopRecognition();
    }
  }, [isRecording, isInitialized]);

  // Handle language changes
  useEffect(() => {
    if (isInitialized) {
      // Reinitialize with new language
      if (recognizerRef.current) {
        recognizerRef.current.close();
      }
      initializeSpeechSDK();
    }
  }, [language]);

  // The component doesn't render anything visible
  return null;
};

AzureSpeechRecognition.propTypes = {
  isRecording: PropTypes.bool.isRequired,
  onTranscriptionUpdate: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  language: PropTypes.string,
  continuous: PropTypes.bool
};

export default AzureSpeechRecognition;