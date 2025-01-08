import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from '../services/api';
import QnASection from '../components/QnASection';

export default function PublicInterviewRoom() {
  // State Management
  const [status, setStatus] = useState("initializing");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);

  // Refs
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recognitionRef = useRef(null);
  const fraudDetectionIntervalRef = useRef(null);

  const { sessionId } = useParams();

  // Cleanup Effect
  useEffect(() => {
    initializeInterview();
    return () => cleanupMedia();
  }, []);

  // Audio Volume Effect
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(checkAudioVolume, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  // Speech Recognition Setup
  const setupSpeechRecognition = () => {
    if ("webkitSpeechRecognition" in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
  
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };
  
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (recognitionActive) {
          try {
            recognitionRef.current.start();
          } catch (err) {
            console.log("Recognition restart error:", err);
          }
        }
      };
  
      recognitionRef.current.onend = () => {
        if (recognitionActive) {
          try {
            recognitionRef.current.start();
          } catch (err) {
            console.log("Recognition restart error:", err);
          }
        }
      };
    } else {
      console.error("Speech recognition is not supported in this browser.");
    }
  };

  // Interview Initialization
  const initializeInterview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 15 } },
        audio: true
      });
  
      streamRef.current = stream;
      setHasVideo(true);
  
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
  
      // Audio Analysis Setup
      if (stream.getAudioTracks().length > 0) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
      }
  
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
  
      if ("webkitSpeechRecognition" in window) {
        setupSpeechRecognition();
      }
  
      setStatus("ready");
    } catch (err) {
      console.error("Interview initialization error:", err);
      setError("Could not access your camera or microphone. Please check your device settings.");
      setStatus("error");
    }
  };

  // Cleanup Function
  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log("Recognition cleanup error:", err);
      }
    }
    stopFraudDetection();
  };

  // Audio Volume Check
  const checkAudioVolume = () => {
    if (analyserRef.current) {
      const array = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(array);
      const average = array.reduce((a, b) => a + b) / array.length;
      setVolume(average);
    }
  };

  // Recording Controls
  const startRecording = async () => {
    try {
      setIsRecording(true);
      setStatus("recording");
      setRecognitionActive(true);

      if (mediaRecorderRef.current?.state !== "recording") {
        mediaRecorderRef.current?.start(1000);
      }

      if (recognitionRef.current) {
        try {
          await recognitionRef.current.start();
        } catch (err) {
          console.log("Recognition already started:", err);
        }
      }

      startFraudDetection();
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to start recording. Please refresh and try again.");
    }
  };

  const stopRecording = async () => {
    try {
      setRecognitionActive(false);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.log("Recognition stop error:", err);
        }
      }
      setIsRecording(false);
      stopFraudDetection();
    } catch (err) {
      console.error("Error stopping recording:", err);
    }
  };

  // Fraud Detection
  const startFraudDetection = () => {
    if (hasVideo && videoRef.current) {
      fraudDetectionIntervalRef.current = setInterval(async () => {
        try {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);

          canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("frame", blob);
            formData.append("sessionId", sessionId);
            formData.append("timestamp", Date.now().toString());

            try {
              const response = await api.post("/fraud-detection", formData);
              
              // Handle fraud detection response
              if (response.data.analysis.metrics.warnings.length > 0) {
                setFraudAlerts(response.data.analysis.metrics.warnings);
              } else {
                setFraudAlerts([]);
              }

            } catch (err) {
              console.error("Fraud detection error:", err);
              setFraudAlerts(["Unable to verify video integrity"]);
            }
          }, "image/jpeg", 0.8);
        } catch (err) {
          console.error("Frame capture error:", err);
        }
      }, 5000);
    }
  };

  const stopFraudDetection = () => {
    if (fraudDetectionIntervalRef.current) {
      clearInterval(fraudDetectionIntervalRef.current);
    }
  };

  // Data Handling
  const handleDataAvailable = async (event) => {
    if (event.data.size > 0) {
      try {
        const formData = new FormData();
        formData.append("audio", event.data);
        formData.append("sessionId", sessionId);
        formData.append("questionId", currentQuestion?.id);
        formData.append("transcript", transcript);

        await api.post(`/api/interviews/${sessionId}/answer`, formData);
      } catch (err) {
        console.error("Answer submission error:", err);
      }
    }
  };

  // Interview Flow Controls
  const startInterview = async () => {
    try {
      const response = await api.get(`/api/interviews/${sessionId}/questions`);
      
      if (!response.data.questions?.length) {
        throw new Error('No questions received');
      }
      
      setQuestions(response.data.questions);
      setCurrentQuestion(response.data.questions[0]);
      await startRecording();
    } catch (err) {
      console.error('Failed to start interview:', err);
      setError('Could not start the interview. Please try again.');
    }
  };

  const handleNextQuestion = async () => {
    await stopRecording();
  
    if (currentQuestion) {
      setQuestionHistory(prev => {
        const updatedHistory = [...prev];
        const existingIndex = updatedHistory.findIndex(q => q.id === currentQuestion.id);
        const historyItem = { ...currentQuestion, response: transcript };
  
        if (existingIndex >= 0) {
          updatedHistory[existingIndex] = historyItem;
        } else {
          updatedHistory.push(historyItem);
        }
  
        return updatedHistory;
      });
    }
  
    try {
      const response = await api.get(`/api/interviews/${sessionId}/next-question`, {
        params: { current: currentQuestion?.id },
      });
  
      if (response.data.isComplete) {
        setStatus("complete");
      } else {
        setCurrentQuestion(response.data.question);
        setTranscript("");
        await startRecording();
      }
    } catch (err) {
      console.error("Failed to get next question:", err);
      setError("Could not load the next question. Please try again.");
    }
  };
  return (
    <div className="container-fluid vh-100 bg-light p-3">
      <div className="row h-100">
        {/* Left Column - Video and Instructions */}
        <div className="col-6">
          {/* Video Section */}
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
                  {volume > 0 && (
                    <div className="mb-3">
                      <div className="progress" style={{ height: "4px" }}>
                        <div
                          className="progress-bar bg-primary"
                          style={{
                            width: `${Math.min(100, (volume / 255) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Alerts and Warnings */}
                  <div className="instruction-content">
                    {/* Volume Warning */}
                    {volume < 50 && isRecording && (
                      <div className="alert alert-warning d-flex align-items-center py-2">
                        <i className="bi bi-volume-up me-2"></i>
                        Please speak louder
                      </div>
                    )}

                    {/* Fraud Detection Alerts */}
                    {fraudAlerts.map((alert, index) => (
                      <div key={index} className="alert alert-danger d-flex align-items-center py-2 mb-2">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {alert}
                      </div>
                    ))}

                    {/* General Error */}
                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    )}

                    {/* Recording Status */}
                    {isRecording && (
                      <div className="alert alert-info d-flex align-items-center py-2">
                        <i className="bi bi-record-circle me-2"></i>
                        Recording in progress
                      </div>
                    )}
                  </div>

                  {/* Interview Guidelines */}
                  <div className="mt-3">
                    <h6 className="text-muted">Guidelines:</h6>
                    <ul className="small text-muted">
                      <li>Ensure your face is clearly visible</li>
                      <li>Stay centered in the frame</li>
                      <li>Maintain good lighting</li>
                      <li>Speak clearly into your microphone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Q&A Section */}
        <div className="col-6">
          <QnASection
            status={status}
            currentQuestion={currentQuestion}
            questions={questions}
            transcript={transcript}
            questionHistory={questionHistory}
            isRecording={isRecording}
            onStartInterview={startInterview}
            onNextQuestion={handleNextQuestion}
          />
        </div>
      </div>
    </div>
  );
}