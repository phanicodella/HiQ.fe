import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function InterviewSession() {
  const [session, setSession] = useState({
    status: 'initializing',
    currentQuestion: null,
    questionNumber: 0,
    totalQuestions: 0,
    transcript: '',
    error: null
  });

  const { sessionId } = useParams();
  console.log(`starting session: ${sessionId}`);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    initializeSession();
    return () => cleanupSession();
  }, []);

  const initializeSession = async () => {
    try {
      // Initialize audio and video
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      streamRef.current = stream;

      // Set up audio recording
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      // Set up speech recognition
      if ('webkitSpeechRecognition' in window) {
        recognitionRef.current = new window.webkitSpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript + ' ';
            }
          }
          if (transcript) {
            setSession(prev => ({
              ...prev,
              transcript: prev.transcript + transcript
            }));
          }
        };
      }

      // Start interview
      console.log('Starting interview session');
      const response = await axios.post(`/api/interviews/${sessionId}/start`);
      console.log('Interview started:', response.data);
      
      if (response.data.success) {
        setSession(prev => ({
          ...prev,
          currentQuestion: response.data.currentQuestion,
          questionNumber: 1,
          totalQuestions: response.data.totalQuestions,
          status: 'ready',
          transcript: ''
        }));

        // Start speech recognition
        try {
          recognitionRef.current?.start();
          console.log('Speech recognition started');
        } catch (error) {
          console.error('Speech recognition error:', error);
        }
      }
    } catch (error) {
      console.error('Session initialization error:', error);
      setSession(prev => ({
        ...prev,
        error: 'Failed to start interview session. Please check your camera and microphone permissions.',
        status: 'error'
      }));
    }
  };

  const handleNextQuestion = async () => {
    try {
      // Stop current speech recognition
      recognitionRef.current?.stop();

      // Submit current transcript
      if (session.transcript) {
        const formData = new FormData();
        formData.append('transcript', session.transcript);
        formData.append('questionId', session.currentQuestion.id);

        console.log('Submitting transcript:', session.transcript);
        await axios.post(`/api/interviews/${sessionId}/transcribe`, formData);
      }

      // Get next question
      console.log('Fetching next question');
      const response = await axios.get(`/api/interviews/${sessionId}/next-question`);
      console.log('Next question response:', response.data);
      
      if (response.data.complete) {
        setSession(prev => ({ ...prev, status: 'complete' }));
      } else {
        setSession(prev => ({
          ...prev,
          currentQuestion: response.data.currentQuestion,
          questionNumber: response.data.questionNumber,
          transcript: ''
        }));

        // Restart speech recognition for new question
        try {
          recognitionRef.current?.start();
        } catch (error) {
          console.error('Speech recognition restart error:', error);
        }
      }
    } catch (error) {
      console.error('Next question error:', error);
      setSession(prev => ({ ...prev, error: 'Failed to load next question' }));
    }
  };

  const cleanupSession = () => {
    recognitionRef.current?.stop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  if (session.status === 'complete') {
    return (
      <div className="card m-4">
        <div className="card-body text-center">
          <h2 className="card-title h4 mb-4">Interview Complete</h2>
          <p className="text-muted">Thank you for completing your interview.</p>
        </div>
      </div>
    );
  }

  if (session.error) {
    return (
      <div className="card m-4 border-danger">
        <div className="card-body bg-danger bg-opacity-10">
          <h2 className="card-title h5 text-danger mb-2">Error</h2>
          <p className="text-danger mb-0">{session.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="fw-medium">Interview Session</span>
              <span className="text-muted small">
                Question {session.questionNumber} of {session.totalQuestions}
              </span>
            </div>
          </div>

          {session.currentQuestion && (
            <div className="card mb-4">
              <div className="card-body">
                <h3 className="h5 mb-4">{session.currentQuestion.text}</h3>
                
                {session.currentQuestion.hints?.length > 0 && (
                  <div className="alert alert-info">
                    <h4 className="h6 mb-2">Hints:</h4>
                    <ul className="list-unstyled mb-0">
                      {session.currentQuestion.hints.map((hint, index) => (
                        <li key={index} className="small">• {hint}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4">
                  <h4 className="h6 mb-2">Your Answer:</h4>
                  <p className="text-muted">{session.transcript || 'Listening...'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <div className="spinner-grow spinner-grow-sm text-primary me-2" role="status" 
                   style={{ animationDuration: '1.5s' }}>
                <span className="visually-hidden">Recording...</span>
              </div>
              <span className="small text-muted">Recording in progress</span>
            </div>

            {session.status === 'ready' && (
              <button
                onClick={handleNextQuestion}
                className="btn btn-primary"
              >
                {session.questionNumber === session.totalQuestions ? 'Complete Interview' : 'Next Question'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}