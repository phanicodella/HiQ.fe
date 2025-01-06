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
  const [questionHistory, setQuestionHistory] = useState([]);

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
    
    // Save current question and response to history
    setQuestionHistory(prev => [...prev, {
      ...currentQuestion,
      response: transcript
    }]);
    
    const currentIndex = questions.findIndex(q => q.id === currentQuestion?.id);
    if (currentIndex < questions.length - 1) {
      setCurrentQuestion(questions[currentIndex + 1]);
      setTranscript('');
      
      setTimeout(async () => {
        await startRecording();
      }, 100);
    } else {
      setStatus('complete');
    }
  };

  // ... [Keep existing render logic from your component] ...
  
  
  return (
    <div className="container-fluid vh-100 bg-light p-3">
      <div className="row h-100">
        {/* Left Column */}
        <div className="col-6">
          {/* Video Container - Top Half */}
          <div className="row mb-3" style={{ height: '48%' }}>
            <div className="col">
              <div className="card h-100">
                <div className="card-body p-0 d-flex align-items-center justify-content-center bg-dark rounded">
                  {hasVideo ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-100 h-100 object-fit-cover"
                    />
                  ) : (
                    <div className="text-white">
                      No video available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
  
          {/* Instructions Panel - Bottom Half */}
          <div className="row" style={{ height: '48%' }}>
            <div className="col">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Instructions Panel</h5>
                  {volume > 0 && (
                    <div className="mb-3">
                      <div className="progress" style={{ height: '4px' }}>
                        <div 
                          className="progress-bar bg-primary" 
                          style={{ width: `${Math.min(100, (volume / 255) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="instruction-content">
                    {volume < 50 && isRecording && (
                      <div className="alert alert-warning d-flex align-items-center py-2">
                        <i className="bi bi-volume-up me-2"></i>
                        Please speak louder
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        {/* Right Column - Q&A */}
        <div className="col-6">
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              {status === 'ready' ? (
                <div className="d-flex align-items-center justify-content-center flex-grow-1">
                  <div className="text-center">
                    <h2 className="mb-4">Ready to begin your interview?</h2>
                    <button
                      onClick={startRecording}
                      className="btn btn-primary btn-lg"
                    >
                      Start Interview
                    </button>
                  </div>
                </div>
              ) : status === 'recording' ? (
                <>
                  <div className="flex-grow-1 overflow-auto mb-3">
                    {questions.slice(0, questions.findIndex(q => q.id === currentQuestion?.id) + 1).map((question) => (
                      <div key={question.id} className="mb-3">
                        <div className="p-3 bg-light rounded">
                          <h5 className="mb-2">{question.text}</h5>
                          {question.hint && (
                            <p className="text-muted small mb-0">{question.hint}</p>
                          )}
                        </div>
                        {(question.id !== currentQuestion?.id || transcript) && (
                          <div className="ms-4 mt-2 p-3 bg-info bg-opacity-10 rounded">
                            <p className="mb-0">
                              {question.id === currentQuestion?.id ? transcript : "Previous response"}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                    <button
                      onClick={handleNextQuestion}
                      className="btn btn-primary"
                    >
                      Next Question
                    </button>
                    {isRecording && (
                      <div className="d-flex align-items-center">
                        <div className="spinner-grow spinner-grow-sm text-danger me-2" 
                             role="status" style={{ animationDuration: '1.5s' }}>
                          <span className="visually-hidden">Recording...</span>
                        </div>
                        <span className="text-muted small">Recording</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="d-flex align-items-center justify-content-center flex-grow-1">
                  <div className="text-center">
                    <h2 className="mb-4">Interview Complete</h2>
                    <p className="text-muted">
                      Thank you for completing your interview.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

