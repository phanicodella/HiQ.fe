import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function PublicInterviewRoom() {
  const [status, setStatus] = useState('initializing');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [recognitionActive, setRecognitionActive] = useState(false);

  // Refs for media handling
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recognitionRef = useRef(null);
  const fraudDetectionIntervalRef = useRef(null);
  
  const { sessionId } = useParams();

  // Test questions (to be replaced with OpenAI)
  const questions = [
    {
      id: 1,
      text: "Tell me about yourself and your background.",
      hint: "Focus on relevant experience and skills"
    },
    {
      id: 2,
      text: "What interests you about this position?",
      hint: "Consider both the role and company culture"
    },
    {
      id: 3,
      text: "Describe a challenging project you worked on.",
      hint: "Include your role, challenges faced, and outcomes"
    }
  ];

  useEffect(() => {
    initializeInterview();
    return () => cleanupMedia();
  }, []);

  // Set up volume monitoring when recording starts
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(checkAudioVolume, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const initializeInterview = async () => {
    try {
      // First try to get both video and audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 15 }
          },
          audio: true
        });
        streamRef.current = stream;
        setHasVideo(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

      } catch (videoErr) {
        console.log('Video access failed, falling back to audio only:', videoErr);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setHasVideo(false);
      }

      // Set up audio analysis
      if (streamRef.current.getAudioTracks().length > 0) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        source.connect(analyserRef.current);
      }

      // Initialize speech recognition
      // Modify the speech recognition setup in initializeInterview
if ('webkitSpeechRecognition' in window) {
  recognitionRef.current = new window.webkitSpeechRecognition();
  recognitionRef.current.continuous = true;
  recognitionRef.current.interimResults = true;
  
  recognitionRef.current.onresult = (event) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      }
    }
    if (finalTranscript) {
      setTranscript(prev => prev + finalTranscript);
    }
  };

  // Add error handler
  recognitionRef.current.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    // Restart recognition if it errors out
    if (recognitionActive) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.log('Recognition restart error:', err);
      }
    }
  };

  // Modify onend handler
  recognitionRef.current.onend = () => {
    console.log('Recognition ended, active status:', recognitionActive);
    if (recognitionActive) {
      try {
        recognitionRef.current.start();
        console.log('Recognition restarted');
      } catch (err) {
        console.log('Recognition restart error:', err);
      }
    }
  };
}

      // Set up media recorder for audio
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;

      setStatus('ready');
    } catch (err) {
      console.error('Interview initialization error:', err);
      setError('Could not access your camera or microphone. Please check your device settings.');
      setStatus('error');
    }
  };

  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log('Recognition cleanup error:', err);
      }
    }
    if (fraudDetectionIntervalRef.current) {
      clearInterval(fraudDetectionIntervalRef.current);
    }
  };

  const checkAudioVolume = () => {
    if (analyserRef.current) {
      const array = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(array);
      const average = array.reduce((a, b) => a + b) / array.length;
      setVolume(average);
    }
  };

  const startRecording = async () => {
    try {
      if (!currentQuestion) {
        setCurrentQuestion(questions[0]);
      }
  
      setIsRecording(true);
      setStatus('recording');
      setRecognitionActive(true);  // Add this
      
      // Start media recorder
      if (mediaRecorderRef.current?.state !== 'recording') {
        mediaRecorderRef.current?.start(1000);
      }
      
      // Start speech recognition
      if (recognitionRef.current) {
        try {
          await recognitionRef.current.start();
          console.log('Recognition started');
        } catch (err) {
          console.log('Recognition already started:', err);
        }
      }
  
      startFraudDetection();
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please refresh and try again.');
    }
  };

  const stopRecording = async () => {
    try {
      setRecognitionActive(false);  // Add this first
      
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log('Recognition stopped');
        } catch (err) {
          console.log('Recognition stop error:', err);
        }
      }
      
      setIsRecording(false);
      stopFraudDetection();
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  const startFraudDetection = () => {
    if (hasVideo && videoRef.current) {
      fraudDetectionIntervalRef.current = setInterval(async () => {
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);
          
          // Convert to blob and send for fraud detection
          canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('frame', blob);
            formData.append('sessionId', sessionId);
            
            try {
              await axios.post('/api/fraud-detection', formData);
            } catch (err) {
              console.error('Fraud detection error:', err);
            }
          }, 'image/jpeg', 0.8);
        } catch (err) {
          console.error('Frame capture error:', err);
        }
      }, 5000); // Check every 5 seconds
    }
  };

  const stopFraudDetection = () => {
    if (fraudDetectionIntervalRef.current) {
      clearInterval(fraudDetectionIntervalRef.current);
    }
  };

  const handleDataAvailable = async (event) => {
    if (event.data.size > 0) {
      try {
        const formData = new FormData();
        formData.append('audio', event.data);
        formData.append('sessionId', sessionId);
        formData.append('questionId', currentQuestion?.id);
        
        await axios.post('/api/speech-analysis', formData);
      } catch (err) {
        console.error('Speech analysis error:', err);
      }
    }
  };

  const handleNextQuestion = async () => {
    await stopRecording();
    
    const currentIndex = questions.findIndex(q => q.id === currentQuestion?.id);
    if (currentIndex < questions.length - 1) {
      setCurrentQuestion(questions[currentIndex + 1]);
      setTranscript('');
      
      // Add a small delay before starting the next recording
      setTimeout(async () => {
        await startRecording();
      }, 100);
    } else {
      setStatus('complete');
    }
  };

  // ... [Keep existing render logic from your component] ...
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Video Preview */}
          {hasVideo && (
            <div className="mb-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-2xl mx-auto rounded-lg shadow-md bg-black"
              />
            </div>
          )}

          {/* Volume Indicator */}
          {volume > 0 && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200" 
                  style={{ width: `${Math.min(100, (volume / 255) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Interview Content */}
<div className="max-w-2xl mx-auto">
  {status === 'ready' && (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Ready to begin your interview?
      </h2>
      <p className="text-gray-600 mb-6">
        {hasVideo 
          ? "Make sure you're in a well-lit room and your camera and microphone are working."
          : "Make sure your microphone is working properly."}
      </p>
      <button
        onClick={startRecording}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Start Interview
      </button>
    </div>
  )}

  {status === 'recording' && currentQuestion && (
    <>
      {/* Question Display */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {currentQuestion.text}
        </h3>
        {currentQuestion.hint && (
          <p className="text-sm text-gray-600">
            Hint: {currentQuestion.hint}
          </p>
        )}
      </div>

      {/* Live Transcript */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Your Response:</h4>
        <div className="min-h-[100px] text-gray-600 whitespace-pre-wrap">
          {transcript || 'Listening to your response...'}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleNextQuestion}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          Next Question
          <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="flex items-center">
          <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"/>
          <span className="text-sm text-gray-500">Recording</span>
        </div>
      </div>
    </>
  )}

  {status === 'complete' && (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Interview Complete
      </h2>
      <p className="text-gray-600 mb-6">
        Thank you for completing your interview. Your responses have been recorded.
      </p>
    </div>
  )}
</div>
        </div>
      </div>
    </div>
  );
}