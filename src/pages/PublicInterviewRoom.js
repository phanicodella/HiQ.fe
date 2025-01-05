import React, { useState, useEffect, useRef } from 'react';

export default function PublicInterviewRoom() {
  // Core states
  const [status, setStatus] = useState('initializing'); // initializing, ready, recording, complete
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [hasVideo, setHasVideo] = useState(false);

  // Media states
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);

  // Media refs
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recognitionRef = useRef(null);

  // Test questions
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
    initializeMedia();
    return () => cleanupMedia();
  }, []);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(checkVolume, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const tryGetUserMedia = async (constraints) => {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error('getUserMedia error:', err);
      throw err;
    }
  };

  const initializeMedia = async () => {
    try {
      // Try video + audio first
      try {
        const stream = await tryGetUserMedia({
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
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(err => {
              console.error('Video play error:', err);
            });
          };
        }
      } catch (videoErr) {
        console.log('Failed to get video, trying audio only:', videoErr);
        // If video fails, try audio only
        const stream = await tryGetUserMedia({ audio: true });
        streamRef.current = stream;
        setHasVideo(false);
      }

      // Set up audio processing
      if (streamRef.current.getAudioTracks().length > 0) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        source.connect(analyserRef.current);

        // Set up speech recognition
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
        }

        // Set up media recorder
        mediaRecorderRef.current = new MediaRecorder(streamRef.current);
        mediaRecorderRef.current.ondataavailable = handleDataAvailable;
      }

      setStatus('ready');
      setError(null);
    } catch (err) {
      console.error('Error initializing media:', err);
      setError('Could not access camera or microphone. Please check your device settings.');
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
  };

  const checkVolume = () => {
    if (analyserRef.current) {
      const array = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(array);
      const average = array.reduce((a, b) => a + b, 0) / array.length;
      setVolume(average);
    }
  };

  const handleDataAvailable = async (event) => {
    if (event.data.size > 0) {
      const url = URL.createObjectURL(event.data);
      console.log('Recording chunk available:', {
        size: event.data.size,
        type: event.data.type,
        url
      });
    }
  };

  const startRecording = async () => {
    try {
      if (!currentQuestion) {
        setCurrentQuestion(questions[0]);
      }

      setIsRecording(true);
      setStatus('recording');
      
      if (mediaRecorderRef.current?.state !== 'recording') {
        mediaRecorderRef.current?.start();
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.log('Recognition already started:', err);
        }
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please refresh and try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.log('Recognition already stopped:', err);
        }
      }
      
      setIsRecording(false);
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  const handleNextQuestion = async () => {
    await stopRecording();
    
    const currentIndex = questions.findIndex(q => q.id === currentQuestion?.id);
    if (currentIndex < questions.length - 1) {
      setCurrentQuestion(questions[currentIndex + 1]);
      setTranscript('');
      await startRecording();
    } else {
      setStatus('complete');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <h2 className="text-xl font-bold">Setup Error</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={initializeMedia}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (status === 'initializing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing media devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Video Preview (if available) */}
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