import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import QnASection from "../components/QnASection";
import { interviewQuestions } from "../data/interview-questions";

export default function PublicInterviewRoom() {
  const [status, setStatus] = useState("initializing");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [transcript, setTranscript] = useState("");
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
  const questions = interviewQuestions;

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
      } catch (videoErr) {
        console.log(
          "Video access failed, falling back to audio only:",
          videoErr
        );
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;
        setHasVideo(false);
      }

      // Set up audio analysis
      if (streamRef.current.getAudioTracks().length > 0) {
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(
          streamRef.current
        );
        source.connect(analyserRef.current);
      }

      // Initialize speech recognition
      // Modify the speech recognition setup in initializeInterview
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

        // Add error handler
        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          // Restart recognition if it errors out
          if (recognitionActive) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.log("Recognition restart error:", err);
            }
          }
        };

        // Modify onend handler
        recognitionRef.current.onend = () => {
          console.log("Recognition ended, active status:", recognitionActive);
          if (recognitionActive) {
            try {
              recognitionRef.current.start();
              console.log("Recognition restarted");
            } catch (err) {
              console.log("Recognition restart error:", err);
            }
          }
        };
      }

      // Set up media recorder for audio
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;

      setStatus("ready");
    } catch (err) {
      console.error("Interview initialization error:", err);
      setError(
        "Could not access your camera or microphone. Please check your device settings."
      );
      setStatus("error");
    }
  };

  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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

  const startRecording = async () => {
    try {
      if (!currentQuestion) {
        setCurrentQuestion(questions[0]);
      }

      setIsRecording(true);
      setStatus("recording");
      setRecognitionActive(true); // Add this

      // Start media recorder
      if (mediaRecorderRef.current?.state !== "recording") {
        mediaRecorderRef.current?.start(1000);
      }

      // Start speech recognition
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
      console.error("Error starting recording:", err);
      setError("Failed to start recording. Please refresh and try again.");
    }
  };

  const stopRecording = async () => {
    try {
      setRecognitionActive(false); // Add this first

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log("Recognition stopped");
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

  const startFraudDetection = () => {
    if (hasVideo && videoRef.current) {
      fraudDetectionIntervalRef.current = setInterval(async () => {
        try {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);

          // Convert to blob and send for fraud detection
          canvas.toBlob(
            async (blob) => {
              const formData = new FormData();
              formData.append("frame", blob);
              formData.append("sessionId", sessionId);

              try {
                await axios.post("/api/fraud-detection", formData);
              } catch (err) {
                console.error("Fraud detection error:", err);
              }
            },
            "image/jpeg",
            0.8
          );
        } catch (err) {
          console.error("Frame capture error:", err);
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
        formData.append("audio", event.data);
        formData.append("sessionId", sessionId);
        formData.append("questionId", currentQuestion?.id);

        await axios.post("/api/speech-analysis", formData);
      } catch (err) {
        console.error("Speech analysis error:", err);
      }
    }
  };

  const handleNextQuestion = async () => {
    await stopRecording();

    // Save current question and response to history
    if (currentQuestion) {
      setQuestionHistory((prev) => {
        // Check if question already exists in history
        const existingIndex = prev.findIndex(
          (q) => q.id === currentQuestion.id
        );
        const updatedHistory = [...prev];

        const historyItem = {
          ...currentQuestion,
          response: transcript,
        };

        if (existingIndex >= 0) {
          // Update existing question
          updatedHistory[existingIndex] = historyItem;
        } else {
          // Add new question
          updatedHistory.push(historyItem);
        }

        return updatedHistory;
      });
    }

    const currentIndex = questions.findIndex(
      (q) => q.id === currentQuestion?.id
    );
    if (currentIndex < questions.length - 1) {
      setCurrentQuestion(questions[currentIndex + 1]);
      setTranscript("");

      setTimeout(async () => {
        await startRecording();
      }, 100);
    } else {
      setStatus("complete");
    }
  };

  // ... [Keep existing render logic from your component] ...

  return (
    <div className="container-fluid vh-100 bg-light p-3">
      <div className="row h-100">
        {/* Left Column */}
        <div className="col-6">
          {/* Video Container - Top Half */}
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

          {/* Instructions Panel - Bottom Half */}
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Q&A */}
        {/* Right Column - Q&A */}
        <div className="col-6">
          <QnASection
            status={status}
            currentQuestion={currentQuestion}
            questions={questions}
            transcript={transcript}
            questionHistory={questionHistory}
            isRecording={isRecording}
            onStartInterview={startRecording}
            onNextQuestion={handleNextQuestion}
          />
        </div>
      </div>
    </div>
  );
}
