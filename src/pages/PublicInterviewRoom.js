import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import QnASection from "../components/QnASection";
import GuidelinesModal from "../components/GuidelinesModal";
import SystemMessages from "../components/SystemMessages";

export default function PublicInterviewRoom() {
  // Interview state
  const [status, setStatus] = useState("initializing");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [analysis, setAnalysis] = useState(null);

  // Media refs
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
  }, [showGuidelines]);

  const initializeInterview = async () => {
    try {
      // Initialize media devices
      await setupMediaDevices();
      setStatus("ready");
    } catch (err) {
      console.error("Interview initialization error:", err);
      setError(
        "Failed to initialize. Please ensure camera and microphone permissions are granted."
      );
    }
  };

  const setupMediaDevices = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15 },
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }

      // Set up audio analysis
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(
        streamRef.current
      );
      source.connect(analyserRef.current);

      // Set up speech recognition
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
          console.error("Speech recognition error:", event);
          if (recognitionActive) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.log("Recognition restart error:", err);
            }
          }
        };
      }

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;

    } catch (err) {
      console.error("Media setup error:", err);
      throw new Error("Failed to access media devices");
    }
  };

  const startInterview = async () => {
    try {
      const response = await api.post(`/api/interviews/${sessionId}/start`);
      const { question, totalQuestions } = response.data;
      
      setCurrentQuestion(question);
      setQuestions(new Array(totalQuestions).fill(null));
      setStatus("recording");
      startRecording();
    } catch (err) {
      console.error("Start interview error:", err);
      setError("Failed to start interview. Please try again.");
    }
  };

  const startRecording = () => {
    try {
      setIsRecording(true);
      setRecognitionActive(true);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      // Start media recording
      if (mediaRecorderRef.current?.state !== "recording") {
        mediaRecorderRef.current?.start(1000);
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

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

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
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        const context = canvas.getContext("2d");
        context.drawImage(videoRef.current, 0, 0);
        
        canvas.toBlob(async (blob) => {
          const formData = new FormData();
          formData.append("frame", blob);
          formData.append("sessionId", sessionId);
          formData.append("timestamp", new Date().toISOString());

          try {
            await api.post("/api/fraud-detection", formData);
          } catch (err) {
            console.error("Fraud detection error:", err);
          }
        }, "image/jpeg", 0.8);
      }, 5000); // Check every 5 seconds
    }
  };

  const stopFraudDetection = () => {
    if (fraudDetectionIntervalRef.current) {
      clearInterval(fraudDetectionIntervalRef.current);
      fraudDetectionIntervalRef.current = null;
    }
  };

  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    stopFraudDetection();
  };

  const handleAcceptGuidelines = () => {
    setShowGuidelines(false);
  };

  if (showGuidelines) {
    return (
      <GuidelinesModal
        onAccept={handleAcceptGuidelines}
        onDecline={() => window.close()}
      />
    );
  }

  return (
    <div className="container-fluid vh-100 bg-light p-3">
      <div className="row h-100">
        {/* Left Column - Video & Instructions */}
        <div className="col-6">
          {/* Video Container */}
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

          {/* Instructions & Analysis */}
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Q&A */}
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

      {/* Error Messages */}
      {error && (
        <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4">
          <div className="alert alert-danger">{error}</div>
        </div>
      )}
    </div>
  );
}