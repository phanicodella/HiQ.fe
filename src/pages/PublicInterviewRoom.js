import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import QnASection from "../components/QnASection";
import api from '../services/api';

export default function PublicInterviewRoom() {
  // Interview state
  const [status, setStatus] = useState("initializing");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [analysis, setAnalysis] = useState(null);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recognitionRef = useRef(null);
  const fraudDetectionIntervalRef = useRef(null);

  const { sessionId } = useParams();

  useEffect(() => {
    if (!showGuidelines) {
      initializeInterview();
    }
    return () => cleanupMedia();
  }, []);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(checkAudioVolume, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

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
            console.log("Recognition restarted");
          } catch (err) {
            console.log("Recognition restart error:", err);
          }
        }
      };
    } else {
      console.error("Speech recognition is not supported in this browser.");
    }
  };
  

  const initializeInterview = async () => {
    try {
      // Setup media devices
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
  
      // Setup audio analysis
      if (stream.getAudioTracks().length > 0) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
      }
  
      // Setup media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
  
      // Setup speech recognition
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

  const startRecording = () => {
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
          console.log("Recognition started");
        } catch (err) {
          console.log("Recognition already started:", err);
        }
      }

      startFraudDetection();
    } catch (err) {
      console.error("Recording start error:", err);
      setError("Failed to start recording. Please refresh and try again.");
    }
  };

  const stopRecording = async () => {
    try {
      setRecognitionActive(false);

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      setIsRecording(false);
      stopFraudDetection();
    } catch (err) {
      console.error("Recording stop error:", err);
    }
  };

  const handleDataAvailable = async (event) => {
    if (event.data.size > 0 && currentQuestion) {
      try {
        const formData = new FormData();
        formData.append("audio", event.data);
        formData.append("transcript", transcript);
        formData.append("questionId", currentQuestion.id.toString());

        const response = await api.post(
          `/api/interviews/${sessionId}/answer`,
          formData
        );

        if (response.data.analysis) {
          setAnalysis(response.data.analysis);
        }
      } catch (err) {
        console.error("Answer submission error:", err);
      }
    }
  };

  const handleNextQuestion = async () => {
    await stopRecording();

    // Save current question and response
    if (currentQuestion) {
      setQuestionHistory((prev) => [
        ...prev,
        {
          ...currentQuestion,
          response: transcript,
          analysis: analysis,
        },
      ]);
    }

    try {
      const response = await api.get(
        `/api/interviews/${sessionId}/next-question`,
        {
          params: { current: currentQuestion?.id },
        }
      );

      if (response.data.isComplete) {
        setStatus("complete");
      } else {
        setCurrentQuestion(response.data.question);
        setTranscript("");
        setAnalysis(null);
        
        // Short delay before starting new recording
        setTimeout(() => {
          startRecording();
        }, 100);
      }
    } catch (err) {
      console.error("Next question error:", err);
      setError("Failed to load next question. Please try again.");
    }
  };

  const startFraudDetection = () => {
    if (videoRef.current && fraudDetectionIntervalRef.current === null) {
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

            try {
              await api.post("/api/fraud-detection", formData, {
                params: {
                  sessionId,
                  timestamp: Date.now()
                }
              });
            } catch (err) {
              console.error("Fraud detection error:", err);
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

  const startInterview = async () => {
    try {
      // Fetch questions for the session
      const response = await api.get(`/api/interviews/${sessionId}/questions`);
  
      // Validate response
      if (!response.data.questions || response.data.questions.length === 0) {
        throw new Error('No questions received');
      }
  
      // Save questions and set the first question
      const questions = response.data.questions;
      setQuestions(questions);
      setCurrentQuestion(questions[0]);
  
      // Start recording
      await startRecording();
    } catch (err) {
      console.error('Failed to start interview:', err);
      setError('Could not start the interview. Please try again.');
    }
  };

  const handleNextQuestion = async () => {
    await stopRecording();
  
    if (currentQuestion) {
      // Save the current question's response to history
      setQuestionHistory((prev) => {
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
      // Fetch the next question
      const response = await api.get(`/api/interviews/${sessionId}/next-question`, {
        params: { current: currentQuestion?.id },
      });
  
      if (response.data.isComplete) {
        setStatus("complete"); // Mark interview as complete
      } else {
        setCurrentQuestion(response.data.question); // Set the next question
        setTranscript(""); // Clear the transcript
        await startRecording(); // Start recording for the next question
      }
    } catch (err) {
      console.error("Failed to get next question:", err);
      setError("Could not load the next question. Please try again.");
    }
  };
  
  return (
    <div className="container-fluid vh-100 bg-light p-3">
      <div className="row h-100">
        <div className="col-6">
          <div className="row mb-3" style={{ height: "48%" }}>
            <div className="col">
              <div className="card h-100">
                <div className="card-body p-0 d-flex align-items-center justify-content-center bg-dark rounded">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-100 h-100 object-fit-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="row" style={{ height: "48%" }}>
            <div className="col">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Interview Progress</h5>
                  {analysis && (
                    <div className="analysis-section mt-3">
                      <h6>Response Analysis</h6>
                      <div className="analysis-content">
                        <p><strong>Score:</strong> {analysis.score}/10</p>
                        {analysis.strengths?.length > 0 && (
                          <div className="mb-2">
                            <strong>Strengths:</strong>
                            <ul className="mb-0">
                              {analysis.strengths.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysis.areas_for_improvement?.length > 0 && (
                          <div>
                            <strong>Areas for Improvement:</strong>
                            <ul className="mb-0">
                              {analysis.areas_for_improvement.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
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
                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6">
          <QnASection
            status={status}
            currentQuestion={currentQuestion}
            questions={questions}
            transcript={transcript}
            questionHistory={questionHistory}
            isRecording={isRecording}
            onStartInterview={startInterview}
            onStartInterview={startInterview}
            onNextQuestion={handleNextQuestion}
          />
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4">
          <div className="alert alert-danger">{error}</div>
        </div>
      )}
    </div>
);
}