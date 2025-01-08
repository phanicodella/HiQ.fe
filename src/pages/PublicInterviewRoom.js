import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import QnASection from "../components/QnASection";
import TranscriptionHandler from "../components/TranscriptionHandler";
import AudioProcessor from "../components/AudioProcessor";

export default function PublicInterviewRoom() {
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

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const webSocketRef = useRef(null);
  const fraudDetectionIntervalRef = useRef(null);
  const processorRef = useRef(null);

  const { sessionId } = useParams();

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
    if (analyserRef.current) {
      const array = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(array);
      const average = array.reduce((a, b) => a + b) / array.length;
      setVolume(average);
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setStatus("recording");
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
      setCurrentQuestion(response.data.questions[0]);
      await startRecording();
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError("Could not start the interview. Please try again.");
    }
  };

  const handleNextQuestion = async () => {
    await stopRecording();

    if (transcript.trim()) {
      try {
        await api.post(`/api/public/interviews/${sessionId}/answer`, {
          transcript: transcript.trim(),
          questionId: currentQuestion?.id,
        });
      } catch (err) {
        console.error("Failed to submit answer:", err);
      }
    }

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
      const response = await api.get(
        `/api/public/interviews/${sessionId}/next-question`,
        {
          params: { current: currentQuestion?.id }
        }
      );

      if (response.data.isComplete) {
        setStatus("complete");
        cleanupMedia();
        return;
      }

      setCurrentQuestion(response.data.question);
      setTranscript("");

      await startRecording();
    } catch (err) {
      console.error("Failed to get next question:", err);
      setError("Could not load next question. Please try again.");
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
    stopFraudDetection();
  };

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
        <div className="col-6">
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
                  <TranscriptionHandler
                    sessionId={sessionId}
                    currentQuestionId={currentQuestion?.id}
                    isRecording={isRecording}
                    onTranscriptionUpdate={(text) => setTranscript(text)}
                  />
                  <AudioProcessor
                    isRecording={isRecording}
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

          <div className="row" style={{ height: "48%" }}>
            <div className="col">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Instructions Panel</h5>

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

                  <div className="instruction-content">
                    {volume < 50 && isRecording && (
                      <div className="alert alert-warning d-flex align-items-center py-2">
                        <i className="bi bi-volume-up me-2"></i>
                        Please speak louder
                      </div>
                    )}

                    {fraudAlerts.map((alert, index) => (
                      <div
                        key={index}
                        className="alert alert-danger d-flex align-items-center py-2 mb-2"
                      >
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {alert}
                      </div>
                    ))}

                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    )}

                    {isRecording && (
                      <div className="alert alert-info d-flex align-items-center py-2">
                        <i className="bi bi-record-circle me-2"></i>
                        Recording in progress
                      </div>
                    )}

                    {isRecording &&
                      webSocketRef.current?.readyState === WebSocket.OPEN && (
                        <div className="alert alert-success d-flex align-items-center py-2">
                          <i className="bi bi-mic-fill me-2"></i>
                          Speech recognition active
                        </div>
                      )}
                  </div>

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
