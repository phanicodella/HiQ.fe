import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import QnASection from "../components/QnASection";
import AzureSpeechRecognition from "../components/AzureSpeechRecognition";
import AudioProcessor from "../components/AudioProcessor";

export default function PublicInterviewRoom() {
  // State Management
  const [status, setStatus] = useState("initializing");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const webSocketRef = useRef(null);
  const fraudDetectionIntervalRef = useRef(null);
  const processorRef = useRef(null);
  const volumeCheckIntervalRef = useRef(null);

  const { sessionId } = useParams();

  const handleTranscriptionUpdate = (newTranscript) => {
    if (!interviewComplete) {
      setTranscript(newTranscript);
    }
  };

  const handleSpeechError = (error) => {
    console.error("Speech recognition error:", error);
    setError(error);
    if (isRecording) {
      stopRecording();
    }
  };

  const initializeInterview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      setHasVideo(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (stream.getAudioTracks().length > 0) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
      }

      setStatus("ready");
    } catch (err) {
      console.error("Interview initialization error:", err);
      setError("Could not access your camera or microphone. Please check your device settings.");
      setStatus("error");
    }
  };

  const checkAudioVolume = () => {
    if (analyserRef.current && !interviewComplete) {
      const array = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(array);
      const average = array.reduce((a, b) => a + b) / array.length;
      setVolume(average);
    }
  };

  const startRecording = async () => {
    if (interviewComplete) return;
    
    try {
      setIsRecording(true);
      setStatus("recording");
      startFraudDetection();
      
      // Start volume checking
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current);
      }
      volumeCheckIntervalRef.current = setInterval(checkAudioVolume, 100);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to start recording");
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      stopFraudDetection();
      
      // Stop volume checking
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current);
      }
    } catch (err) {
      console.error("Error stopping recording:", err);
    }
  };

  const startFraudDetection = () => {
    if (fraudDetectionIntervalRef.current) {
      clearInterval(fraudDetectionIntervalRef.current);
    }
    fraudDetectionIntervalRef.current = setInterval(() => {
      // Implement fraud detection logic here
      // For now, this is a placeholder
    }, 5000);
  };

  const stopFraudDetection = () => {
    if (fraudDetectionIntervalRef.current) {
      clearInterval(fraudDetectionIntervalRef.current);
    }
  };

  const startInterview = async () => {
    try {
      const response = await api.get(`/api/public/interviews/${sessionId}/questions`);

      if (!response.data.questions?.length) {
        throw new Error("No questions received");
      }

      setQuestions(response.data.questions);
      setCurrentQuestionIndex(0);
      await startRecording();
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError("Could not start the interview. Please try again.");
    }
  };

  // Old handleNextQuestion function
  const handleNextQuestion = async () => {
    if (isSubmitting || interviewComplete) return;
  
    try {
      setIsSubmitting(true);
      await stopRecording();
  
      const currentQuestion = questions[currentQuestionIndex];
      
      if (transcript.trim()) {
        try {
          // Just submit the answer without analysis
          await api.post(`/api/public/interviews/${sessionId}/answer`, {
            transcript: transcript.trim(),
            questionId: currentQuestion?.id,
          });
  
          // Store in question history without analysis
          setQuestionHistory((prev) => [
            ...prev,
            {
              ...currentQuestion,
              response: transcript
            },
          ]);
  
        } catch (err) {
          console.error("Failed to save answer:", err);
          setError("Failed to save answer. Please try again.");
          return;
        }
      }
  
      // Check if interview is complete
      if (currentQuestionIndex >= questions.length - 1) {
        await handleInterviewComplete();
        return;
      }
  
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setTranscript("");
      
      // Start recording for next question
      try {
        await startRecording();
      } catch (err) {
        console.error("Failed to start recording for next question:", err);
        setError("Failed to start recording. Please refresh and try again.");
      }
  
    } catch (err) {
      console.error("Error handling next question:", err);
      setError("Failed to process question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInterviewComplete = async () => {
    try {
      setIsSubmitting(true);
  
      // Save the final answer first
      if (transcript.trim()) {
        try {
          await api.post(`/api/public/interviews/${sessionId}/answer`, {
            transcript: transcript.trim(),
            questionId: questions[currentQuestionIndex]?.id,
          });
  
          // Add final answer to history
          setQuestionHistory(prev => [
            ...prev,
            {
              ...questions[currentQuestionIndex],
              response: transcript
            }
          ]);
        } catch (err) {
          console.error("Failed to save final answer:", err);
          setError("Failed to save your final answer. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }
  
      // Prepare complete question history including the last answer
      const finalQuestionHistory = [
        ...questionHistory,
        {
          ...questions[currentQuestionIndex],
          response: transcript
        }
      ];
  
      // Complete the interview with all answers
      await api.post(`/api/public/interviews/${sessionId}/complete`, {
        questionHistory: finalQuestionHistory
      });
  
      // Clean up and update UI state
      cleanupMedia();
      setStatus("complete");
      setInterviewComplete(true);
      setIsSubmitting(false);
  
    } catch (err) {
      console.error("Failed to complete interview:", err);
      setError("Failed to complete interview. Please try again.");
      setIsSubmitting(false);
    }
  };
  const cleanupMedia = () => {
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
    }
    stopFraudDetection();
  };

  // Initialize interview on mount
  useEffect(() => {
    initializeInterview();
    return () => cleanupMedia();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current);
      }
      if (fraudDetectionIntervalRef.current) {
        clearInterval(fraudDetectionIntervalRef.current);
      }
    };
  }, [isRecording]);

  // ... Previous logic code ...

  return (
    <div className="container-fluid vh-100 bg-light p-3">
      <div className="row h-100">
        {/* Video Feed & Instructions Column */}
        <div className="col-6">
          {/* Video Feed Section */}
          <div className="row mb-3" style={{ height: "48%" }}>
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
                    <div className="text-white">No video available</div>
                  )}
                  <AzureSpeechRecognition
                    isRecording={isRecording && !interviewComplete}
                    onTranscriptionUpdate={handleTranscriptionUpdate}
                    onError={handleSpeechError}
                  />
                  <AudioProcessor
                    isRecording={isRecording && !interviewComplete}
                    onAudioData={(audioData) => {
                      if (webSocketRef.current?.readyState === WebSocket.OPEN) {
                        webSocketRef.current.send(audioData);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Instructions Panel */}
          <div className="row" style={{ height: "48%" }}>
            <div className="col">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Instructions Panel</h5>

                  {/* Audio Volume Indicator */}
                  {isRecording && volume > 0 && (
                    <div className="mb-3">
                      <div className="progress" style={{ height: "4px" }}>
                        <div
                          className="progress-bar bg-primary"
                          style={{
                            width: `${Math.min(100, (volume / 255) * 100)}%`,
                            transition: 'width 0.1s ease'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="instruction-content">
                    {/* Volume Warning */}
                    {isRecording && volume < 50 && (
                      <div className="alert alert-warning d-flex align-items-center py-2">
                        <i className="bi bi-volume-up me-2"></i>
                        Please speak louder
                      </div>
                    )}

                    {/* Fraud Alerts */}
                    {fraudAlerts.map((alert, index) => (
                      <div
                        key={index}
                        className="alert alert-danger d-flex align-items-center py-2 mb-2"
                      >
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {alert}
                      </div>
                    ))}

                    {/* Error Display */}
                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                        <button 
                          type="button" 
                          className="btn-close float-end" 
                          onClick={() => setError(null)}
                          aria-label="Close"
                        ></button>
                      </div>
                    )}

                    {/* Recording Status */}
                    {isRecording && !interviewComplete && (
                      <div className="alert alert-info d-flex align-items-center py-2">
                        <i className="bi bi-record-circle me-2"></i>
                        Recording in progress
                      </div>
                    )}

                    {/* Speech Recognition Status */}
                    {isRecording && !interviewComplete && webSocketRef.current?.readyState === WebSocket.OPEN && (
                      <div className="alert alert-success d-flex align-items-center py-2">
                        <i className="bi bi-mic-fill me-2"></i>
                        Speech recognition active
                      </div>
                    )}

                    {/* Interview Complete Status */}
                    {interviewComplete && (
                      <div className="alert alert-success d-flex align-items-center py-2">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        Interview completed
                      </div>
                    )}
                  </div>

                  {/* Guidelines */}
                  <div className="mt-3">
                    <h6 className="text-muted">Guidelines:</h6>
                    <ul className="small text-muted">
                      <li>Ensure your face is clearly visible</li>
                      <li>Stay centered in the frame</li>
                      <li>Maintain good lighting</li>
                      <li>Speak clearly into your microphone</li>
                      {isRecording && !interviewComplete && (
                        <li className="text-success">
                          Your speech is being transcribed automatically
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QnA Section Column */}
        <div className="col-6">
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              <QnASection
                status={status}
                currentQuestion={questions[currentQuestionIndex]}
                questions={questions}
                transcript={transcript}
                questionHistory={questionHistory}
                isRecording={isRecording}
                isSubmitting={isSubmitting}
                interviewComplete={interviewComplete}
                onStartInterview={startInterview}
                onNextQuestion={handleNextQuestion}
                onComplete={handleInterviewComplete}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {isRecording && error && !interviewComplete && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Connection Issue</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setError(null)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <p>{error}</p>
                <p>Please ensure you have a stable internet connection.</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setError(null);
                    startRecording();
                  }}
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
