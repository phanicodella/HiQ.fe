// frontend/src/pages/PublicInterviewRoom.js - Logic Part

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import QnASection from "../components/QnASection";

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
  const [questionHistory, setQuestionHistory] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [assemblyToken, setAssemblyToken] = useState(null);
  const [assemblyReady, setAssemblyReady] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const webSocketRef = useRef(null);
  const fraudDetectionIntervalRef = useRef(null);
  const processorRef = useRef(null);

  const { sessionId } = useParams();

  // Initialize AssemblyAI
  const initializeAssemblyAI = async () => {
    try {
      const response = await api.post("/api/public/transcription-token");
      setAssemblyToken(response.data.token);
      console.log("AssemblyAI token received");
    } catch (err) {
      console.error("Failed to get AssemblyAI token:", err);
      setError("Failed to initialize speech recognition");
    }
  };

  // Connect to AssemblyAI WebSocket
  const connectWebSocket = () => {
    if (!assemblyToken) {
      console.error("No AssemblyAI token available");
      return;
    }
    try {
      const socket = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?token=${assemblyToken}`
      );

      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          if (data.message_type === "FinalTranscript") {
            setTranscript((prev) => prev + " " + data.text);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setAssemblyReady(false);
      };

      socket.onclose = () => {
        console.log("WebSocket closed");
        setAssemblyReady(false);
      };

      socket.onopen = () => {
        console.log("AssemblyAI WebSocket connected");
        setAssemblyReady(true);
        socket.send(
          JSON.stringify({
            sample_rate: 44100,
            audio_format: "pcm_s16le",
            language_code: "en_us",
          })
        );
      };

      webSocketRef.current = socket;
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }
  };
  // Interview Initialization
  const initializeInterview = async () => {
    try {
      await initializeAssemblyAI();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15 },
        },
        audio: true,
      });

      streamRef.current = stream;
      setHasVideo(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Audio Analysis Setup
      if (stream.getAudioTracks().length > 0) {
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);

        // Create processor for AssemblyAI
        processorRef.current = audioContextRef.current.createScriptProcessor(
          2048,
          1,
          1
        );
        source.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);

        // Handle audio processing for AssemblyAI
        processorRef.current.onaudioprocess = (e) => {
          if (
            isRecording &&
            webSocketRef.current?.readyState === WebSocket.OPEN
          ) {
            const float32Array = e.inputBuffer.getChannelData(0);
            const int16Array = new Int16Array(float32Array.length);
            for (let i = 0; i < float32Array.length; i++) {
              int16Array[i] = float32Array[i] * 0x7fff;
            }
            webSocketRef.current.send(int16Array.buffer);
          }
        };

        source.connect(analyserRef.current);
      }

      setStatus("ready");
    } catch (err) {
      console.error("Interview initialization error:", err);
      setError(
        "Could not access your camera or microphone. Please check your device settings."
      );
      setStatus("error");
    }
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
      connectWebSocket();
      startFraudDetection();
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

      // Submit the final transcript
      if (transcript.trim()) {
        await api.post(`/api/public/interviews/${sessionId}/answer`, {
          transcript: transcript.trim(),
          questionId: currentQuestion?.id,
        });
      }
    } catch (err) {
      console.error("Error stopping recording:", err);
    }
  };

  // Fraud Detection Methods
  const startFraudDetection = () => {
    return;
  };

  const stopFraudDetection = () => {
    if (fraudDetectionIntervalRef.current) {
      clearInterval(fraudDetectionIntervalRef.current);
    }
  };

  // Interview Flow Controls
  const startInterview = async () => {
    try {
      const response = await api.get(
        `/api/public/interviews/${sessionId}/questions`
      );

      if (!response.data.questions?.length) {
        throw new Error("No questions received");
      }

      setQuestions(response.data.questions);
      setCurrentQuestion(response.data.questions[0]);
      await startRecording();
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError("Could not start the interview. Please try again.");
    }
  };

  const handleNextQuestion = async () => {
    await stopRecording(); // Stop the current recording

    // Submit current answer/transcript
    if (transcript.trim()) {
      try {
        await api.post(`/api/public/interviews/${sessionId}/answer`, {
          transcript: transcript.trim(),
          questionId: currentQuestion?.id,
        });
      } catch (err) {
        console.error("Failed to submit answer:", err);
        // Continue anyway - don't block the interview progress
      }
    }

    // Update question history
    if (currentQuestion) {
      setQuestionHistory((prev) => [
        ...prev,
        {
          ...currentQuestion,
          response: transcript,
        },
      ]);
    }

    try {
      // Get next question
      const response = await api.get(
        `/api/public/interviews/${sessionId}/next-question`,
        {
          params: {
            current: currentQuestion?.id,
          },
        }
      );

      // Handle interview completion
      if (response.data.isComplete) {
        setStatus("complete");
        cleanupMedia(); // Make sure to clean up media resources
        return;
      }

      // Set up next question
      setCurrentQuestion(response.data.question);
      setTranscript(""); // Clear transcript for new question

      try {
        await startRecording(); // Start recording for new question
      } catch (recordingError) {
        console.error("Failed to start recording:", recordingError);
        setError("Failed to start recording. Please refresh and try again.");
      }
    } catch (err) {
      console.error("Failed to get next question:", err);
      setError("Could not load next question. Please try again.");
    }
  };

  // Cleanup
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
    stopFraudDetection();
  };

  // Effects
  useEffect(() => {
    initializeInterview();
    return () => cleanupMedia();
  }, []);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(checkAudioVolume, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  // Render
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
                      <div
                        key={index}
                        className="alert alert-danger d-flex align-items-center py-2 mb-2"
                      >
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

                    {/* AssemblyAI Connection Status */}
                    {isRecording &&
                      webSocketRef.current?.readyState === WebSocket.OPEN && (
                        <div className="alert alert-success d-flex align-items-center py-2">
                          <i className="bi bi-mic-fill me-2"></i>
                          Speech recognition active
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
                      {isRecording && (
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

        {/* Right Column - Q&A Section */}
        <div className="col-6">
          <div className="card">
            <div className="card-body d-flex flex-column">
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
      </div>

      {/* Connection Status Modal */}
      {isRecording && error && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Connection Issue</h5>
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
