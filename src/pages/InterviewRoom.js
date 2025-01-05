// frontend/src/pages/InterviewRoom.js
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import QuestionDisplay from '../components/QuestionDisplay';
import InterviewControls from '../components/InterviewControls';

export function InterviewRoom() {
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [status, setStatus] = useState('initializing'); // initializing, ready, in_progress, reviewing, completed
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const { id: interviewId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize interview session
  useEffect(() => {
    initializeInterview();
    return () => cleanupInterview();
  }, [interviewId]);

  const initializeInterview = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/interviews/${interviewId}`);
      setInterview(response.data.interview);
      setStatus('ready');
      
      // Set up media devices
      await setupMediaDevices();
    } catch (err) {
      console.error('Interview initialization error:', err);
      setError('Failed to initialize interview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const setupMediaDevices = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      
      // Initialize media recorder
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
      
      setStatus('ready');
    } catch (err) {
      console.error('Media setup error:', err);
      setError('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const cleanupInterview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setStatus('completed');
  };

  const startInterview = async () => {
    try {
      setIsLoading(true);
      const response = await api.post(`/api/interviews/${interviewId}/start`);
      setCurrentQuestion(response.data.question);
      setStatus('in_progress');
      startRecording();
    } catch (err) {
      console.error('Start interview error:', err);
      setError('Failed to start interview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = () => {
    if (mediaRecorderRef.current && streamRef.current) {
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDataAvailable = async (event) => {
    if (event.data.size > 0) {
      const formData = new FormData();
      formData.append('audio', event.data);
      
      try {
        const response = await api.post(`/api/interviews/${interviewId}/answer`, formData);
        setAnswers(prev => [...prev, response.data.answer]);
        setFeedback(response.data.feedback);
      } catch (err) {
        console.error('Answer submission error:', err);
        setError('Failed to submit answer. Please try again.');
      }
    }
  };

  const handleNextQuestion = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/interviews/${interviewId}/next-question`);
      setCurrentQuestion(response.data.question);
      setFeedback(null);
      startRecording();
    } catch (err) {
      console.error('Next question error:', err);
      setError('Failed to load next question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const finishInterview = async () => {
    try {
      setIsLoading(true);
      await api.post(`/api/interviews/${interviewId}/complete`);
      setStatus('completed');
      navigate('/dashboard');
    } catch (err) {
      console.error('Complete interview error:', err);
      setError('Failed to complete interview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !interview) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-red-600 text-xl font-bold mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Interview Header */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Interview Session #{interviewId}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              status === 'completed' ? 'bg-green-100 text-green-800' :
              status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {status}
            </span>
          </div>
        </div>

        {/* Main Interview Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Question and Answer Area */}
          <div className="md:col-span-2">
            <div className="bg-white shadow-sm rounded-lg p-6">
              {status === 'ready' && (
                <div className="text-center py-12">
                  <h2 className="text-xl font-medium text-gray-900 mb-4">
                    Ready to start your interview?
                  </h2>
                  <button
                    onClick={startInterview}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700"
                  >
                    Start Interview
                  </button>
                </div>
              )}

              {status === 'in_progress' && currentQuestion && (
                <div>
                  <QuestionDisplay 
                    question={currentQuestion}
                    isRecording={isRecording}
                  />
                  
                  <div className="mt-6">
                    <InterviewControls
                      isRecording={isRecording}
                      onStopRecording={stopRecording}
                      onNextQuestion={handleNextQuestion}
                      onFinish={finishInterview}
                      disabled={isLoading}
                    />
                  </div>

                  {feedback && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-md">
                      <h3 className="text-lg font-medium text-blue-900">Feedback</h3>
                      <p className="mt-2 text-blue-700">{feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {status === 'completed' && (
                <div className="text-center py-12">
                  <h2 className="text-xl font-medium text-gray-900 mb-4">
                    Interview Completed
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Thank you for completing the interview. You can now return to the dashboard.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700"
                  >
                    Return to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interview Progress */}
          <div className="md:col-span-1">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Progress
              </h2>
              <div className="space-y-4">
                {answers.map((answer, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-gray-50 rounded-md"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      Question {index + 1}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {answer.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}