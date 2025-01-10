import React, { useRef, useEffect, useState } from 'react';
const QnASection = ({ 
  status,
  currentQuestion,
  questions,
  transcript,
  questionHistory,
  isRecording,
  onStartInterview,
  onNextQuestion
}) => {
  const questionsContainerRef = useRef(null);
  const [localQuestions, setLocalQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Initialize questions when they're first received
  useEffect(() => {
    if (questions?.length) {
      setLocalQuestions(questions);
    }
  }, [questions]);

  // Auto-scroll when transcript or current question changes
  useEffect(() => {
    if (questionsContainerRef.current) {
      questionsContainerRef.current.scrollTop = questionsContainerRef.current.scrollHeight;
    }
  }, [transcript, currentIndex]);

  const handleNextQuestion = async () => {
    setLoading(true);
    const nextIndex = currentIndex + 1;
    if (nextIndex < localQuestions.length) {
      setCurrentIndex(nextIndex);
      onNextQuestion(localQuestions[nextIndex]); // Pass next question
    } else {
      // Complete interview if we're at the end
      onNextQuestion(null);
    }
    setLoading(false);
  };

  // Get response for a given question ID from question history
  const getResponseForQuestion = (questionId) => {
    const historyItem = questionHistory.find(item => item.id === questionId);
    return historyItem?.response || '';
  };

  const renderQuestion = (question, index) => {
    const isCurrentQuestion = index === currentIndex;
    const response = getResponseForQuestion(question.id);

    return (
      <div key={question.id} className="mb-3">
        <div className="p-3 bg-light rounded">
          <h5 className="mb-2">{question.text}</h5>
          {question.hint && (
            <p className="text-muted small mb-0">{question.hint}</p>
          )}
        </div>
        {(isCurrentQuestion || response) && (
          <div className="ms-4 mt-2 p-3 bg-info bg-opacity-10 rounded">
            <p className="mb-0">
              {isCurrentQuestion ? (transcript || "Recording in progress...") : response}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div className="d-flex align-items-center justify-content-center flex-grow-1">
        <div className="text-center">
          <h2 className="mb-4">Ready to begin your interview?</h2>
          <button
            onClick={onStartInterview}
            className="btn btn-primary btn-lg"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-100">
      <div className="card-body d-flex flex-column">
        <div 
          ref={questionsContainerRef}
          className="flex-grow-1 overflow-auto mb-3"
          style={{ maxHeight: '500px', scrollBehavior: 'smooth' }}
        >
          {localQuestions
            .slice(0, currentIndex + 1)
            .map((q, idx) => renderQuestion(q, idx))}
        </div>

        <div className="pt-3 border-t d-flex justify-content-between align-items-center">
          <button
            onClick={handleNextQuestion}
            disabled={loading}
            className={`btn btn-${loading ? 'secondary' : 'primary'}`}
          >
            {currentIndex === localQuestions.length - 1 ? 'Complete Interview' : 'Next Question'}
          </button>

          {isRecording && (
            <div className="d-flex align-items-center">
              <div 
                className="spinner-grow spinner-grow-sm text-danger me-2" 
                role="status" 
                style={{ animationDuration: '1.5s' }}
              >
                <span className="visually-hidden">Recording...</span>
              </div>
              <span className="text-muted small">Recording</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QnASection;
