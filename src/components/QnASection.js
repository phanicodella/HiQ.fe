import React from 'react';

const QnASection = ({ 
  status,
  currentQuestion,
  transcript,
  questionHistory,
  isRecording,
  onStartInterview,
  onNextQuestion
}) => {
  const renderQuestion = (question) => {
    const isCurrentQuestion = question.id === currentQuestion?.id;
    const response = isCurrentQuestion ? transcript : getResponseForQuestion(question.id);

    return (
      <div key={question.id} className="mb-4">
        {/* Question Card */}
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title mb-3">{question.text}</h5>
            
            {/* Evaluation Criteria */}
            {question.evaluationCriteria && (
              <div className="alert alert-info mb-3">
                <h6 className="mb-2">Key Points to Address:</h6>
                <ul className="list-unstyled mb-0">
                  {question.evaluationCriteria.map((criterion, index) => (
                    <li key={index} className="mb-1">• {criterion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expected Duration */}
            {question.expectedDuration && (
              <div className="text-muted small mb-3">
                Suggested response time: {question.expectedDuration} minutes
              </div>
            )}
          </div>
        </div>

        {/* Response Area */}
        {(response || !isCurrentQuestion) && (
          <div className="card bg-light">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Your Response:</h6>
              <p className="card-text">{response || "No response recorded"}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getResponseForQuestion = (questionId) => {
    const historyItem = questionHistory.find(item => item.id === questionId);
    return historyItem ? historyItem.response : '';
  };

  const renderReadyState = () => (
    <div className="text-center py-5">
      <h2 className="mb-4">Ready to Begin Your Interview?</h2>
      <p className="text-muted mb-4">
        This will be a behavioral interview consisting of questions about your past experiences.
        Please provide detailed responses with specific examples.
      </p>
      <button
        onClick={onStartInterview}
        className="btn btn-primary btn-lg"
      >
        Start Interview
      </button>
    </div>
  );

  const renderRecordingState = () => (
    <div className="d-flex flex-column h-100">
      {/* Current Question Display */}
      <div className="flex-grow-1 overflow-auto mb-3">
        {currentQuestion && renderQuestion(currentQuestion)}
      </div>

      {/* Recording Status & Controls */}
      <div className="pt-3 border-top">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            {isRecording && (
              <>
                <div 
                  className="spinner-grow spinner-grow-sm text-danger me-2" 
                  role="status"
                  style={{ animationDuration: '1.5s' }}
                >
                  <span className="visually-hidden">Recording...</span>
                </div>
                <span className="text-muted small">Recording in progress</span>
              </>
            )}
          </div>

          <button
            onClick={onNextQuestion}
            className="btn btn-primary"
            disabled={!transcript.trim()}  // Disable if no response
          >
            Next Question
          </button>
        </div>
      </div>
    </div>
  );

  const renderCompleteState = () => (
    <div className="text-center py-5">
      <h2 className="mb-3">Interview Complete</h2>
      <p className="text-muted">
        Thank you for completing your interview. Your responses have been recorded.
      </p>
    </div>
  );

  return (
    <div className="card h-100">
      <div className="card-body d-flex flex-column">
        {status === 'ready' && renderReadyState()}
        {status === 'recording' && renderRecordingState()}
        {status === 'complete' && renderCompleteState()}
      </div>
    </div>
  );
};

export default QnASection;